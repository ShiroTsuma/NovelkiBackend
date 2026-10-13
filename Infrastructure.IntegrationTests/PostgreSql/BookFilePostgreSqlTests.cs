namespace Infrastructure.IntegrationTests.PostgreSql;

using Application.Common.Interfaces;
using BookCovers;
using BookFiles;
using Contexts;
using Domain.Entities;
using Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Services;
using TestSupport;

[Collection(PostgreSqlCollection.CollectionName)]
public sealed class BookFilePostgreSqlTests(PostgreSqlFixture fixture) : IAsyncLifetime
{
    private readonly Guid _owner = Guid.NewGuid();

    public Task InitializeAsync()
    {
        return fixture.ResetDatabaseAsync();
    }

    public Task DisposeAsync()
    {
        return Task.CompletedTask;
    }

    [Fact]
    public async Task ActiveHashesAreUnique_TrashCanKeepPreviousContent_AndBookCascadeRemovesFiles()
    {
        await using var context = fixture.CreateContext(_owner);
        context.Users.Add(new User { Id = _owner });
        var book = TestData.Book(_owner, "EPUB constraints");
        context.Books.Add(book);
        await context.SaveChangesAsync();
        var first = File(book.Id);
        context.BookFiles.Add(first);
        await context.SaveChangesAsync();
        context.BookFiles.Add(File(book.Id));
        await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
        context.ChangeTracker.Clear();
        await context.BookFiles.ExecuteUpdateAsync(s => s.SetProperty(f => f.DeletedAtUtc, DateTime.UtcNow));
        context.BookFiles.Add(File(book.Id));
        await context.SaveChangesAsync();
        Assert.Equal(2, await context.BookFiles.CountAsync());
        await context.Books.Where(b => b.Id == book.Id).ExecuteDeleteAsync();
        Assert.Empty(await context.BookFiles.ToListAsync());
        context.BookFiles.Add(File(Guid.NewGuid()));
        await Assert.ThrowsAsync<DbUpdateException>(() => context.SaveChangesAsync());
    }

    [Fact]
    public async Task OwnerDeletionLocksConcurrentImports_AndQueuesIrrecoverableObjectsImmediately()
    {
        await using var deletionContext = fixture.CreateContext(_owner);
        deletionContext.Users.Add(new User { Id = _owner });
        var book = TestData.Book(_owner, "Delete safely");
        deletionContext.Books.Add(book);
        var file = File(book.Id);
        deletionContext.BookFiles.Add(file);
        await deletionContext.SaveChangesAsync();
        var service = Service(deletionContext);
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var deletion = service.ExecuteBookDeletionAsync(_owner, book.Id, async ct =>
        {
            entered.SetResult();
            await release.Task.WaitAsync(ct);
            return await deletionContext.Books.Where(b => b.Id == book.Id).ExecuteDeleteAsync(ct);
        }, default);
        await entered.Task;
        await using var concurrent = fixture.CreateContext(_owner);
        await using var transaction = await concurrent.Database.BeginTransactionAsync();
        var ownerLock =
            concurrent.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT pg_advisory_xact_lock({BitConverter.ToInt64(_owner.ToByteArray())})");
        Assert.False(ownerLock.IsCompleted);
        release.SetResult();
        Assert.Equal(1, await deletion);
        await ownerLock.WaitAsync(TimeSpan.FromSeconds(10));
        Assert.False(await concurrent.Books.AnyAsync(b => b.Id == book.Id));
        var queue = Assert.Single(await concurrent.StorageCleanupQueueItems.ToListAsync());
        Assert.Equal(file.StoragePath, queue.StoragePath);
        Assert.True(queue.NextAttemptAt <= DateTime.UtcNow);
    }

    [Fact]
    public async Task CancelIsAtomicDespiteStaleProgress_AndGlobalWorkerLimitIsEnforced()
    {
        await using var context = fixture.CreateContext(_owner);
        context.Users.Add(new User { Id = _owner });
        var now = DateTime.UtcNow;
        var first = new BookFileJob
        {
            OwnerId = _owner,
            Kind = "Export",
            Status = "Processing",
            UpdatedAtUtc = now,
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddHours(2)
        };
        var second = new BookFileJob
        {
            OwnerId = _owner,
            Kind = "Export",
            Status = "Processing",
            UpdatedAtUtc = now,
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddHours(2)
        };
        var queued = new BookFileJob
        {
            OwnerId = _owner,
            Kind = "Export",
            Status = "Queued",
            UpdatedAtUtc = now,
            CreatedAtUtc = now,
            ExpiresAtUtc = now.AddHours(2)
        };
        context.BookFileJobs.AddRange(first, second, queued);
        await context.SaveChangesAsync();
        var service = Service(context);
        Assert.False(await service.ProcessNextAsync(default));
        await using var other = fixture.CreateContext(_owner);
        await other.BookFileJobs.Where(j => j.Id == first.Id).ExecuteUpdateAsync(s =>
            s.SetProperty(j => j.UpdatedAtUtc, now.AddSeconds(1)).SetProperty(j => j.ProcessedFiles, 4));
        await service.CancelAsync(first.Id, default);
        var cancelled = await other.BookFileJobs.AsNoTracking().SingleAsync(j => j.Id == first.Id);
        Assert.Equal("Cancelled", cancelled.Status);
        Assert.Equal(4, cancelled.ProcessedFiles);
    }

    private BookFile File(Guid bookId)
    {
        return new BookFile
        {
            BookId = bookId,
            OwnerId = _owner,
            StoragePath = $"epubs/{_owner:N}/{Guid.NewGuid():N}.epub",
            Title = "Volume",
            OriginalFileName = "volume.epub",
            SizeBytes = 100,
            Sha256 = new string('a', 64)
        };
    }

    private BookFileService Service(ApplicationDbContext context)
    {
        var security = Options.Create(new BookImportSecurityOptions());
        var guard = new AccountAbuseGuard(
            new MemoryDistributedCache(Options.Create(new MemoryDistributedCacheOptions())), security,
            NullLogger<AccountAbuseGuard>.Instance);
        return new BookFileService(context, new Actor(_owner), new UnusedStorage(),
            new StorageCleanupQueue(context, TimeProvider.System), Options.Create(new BookFileOptions()), security,
            guard);
    }

    private sealed record Actor(Guid RequiredId) : IUser
    {
        public Guid? Id => RequiredId;
        public string? Email => null;
        public string? Username => null;
        public IEnumerable<string> Roles => [];
        public bool IsAuthenticated => true;
        public bool Valid => true;
    }

    private sealed class UnusedStorage : IBookFileStorage
    {
        public Task SaveAsync(string path, Stream content, CancellationToken ct)
        {
            throw new NotSupportedException();
        }

        public Task<Stream> OpenReadAsync(string path, CancellationToken ct)
        {
            throw new NotSupportedException();
        }

        public Task DeleteIfExistsAsync(string path, CancellationToken ct)
        {
            throw new NotSupportedException();
        }
    }
}
