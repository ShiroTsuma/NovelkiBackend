namespace Application.UnitTests;

using Common.Interfaces;
using Domain.Entities;
using Domain.Repositories;
using Features.BookFeatures.Queries;

public class PendingCoverUploadTests
{
    [Fact]
    public async Task ResolvePendingCoverUpload_ShouldReturnOnlyTheCurrentUsersBook()
    {
        var ownerId = Guid.NewGuid();
        var token = Guid.NewGuid();
        var bookId = Guid.NewGuid();
        var repository = new FakeBookCoverRepository(new BookCover
        {
            BookId = bookId,
            PendingUploadToken = token,
            Book = new Book
            {
                OwnerId = ownerId, PrimaryTitle = "Pending cover", NormalizedPrimaryTitle = "PENDINGCOVER"
            }
        });
        var handler = new ResolvePendingCoverUploadHandler(repository, new FakeUser(ownerId));

        var result = await handler.Handle(new ResolvePendingCoverUploadQuery(token), CancellationToken.None);

        Assert.Equal(bookId, result);
        var foreignHandler = new ResolvePendingCoverUploadHandler(repository, new FakeUser(Guid.NewGuid()));
        var notOwned = await foreignHandler.Handle(new ResolvePendingCoverUploadQuery(token), CancellationToken.None);
        Assert.Null(notOwned);
    }

    private sealed class FakeBookCoverRepository(BookCover cover) : IBookCoverRepository
    {
        public Task<BookCover?> GetByBookIdAsync(Guid bookId, Guid ownerId, CancellationToken cancellationToken)
        {
            return Task.FromResult<BookCover?>(null);
        }

        public Task<BookCover?> GetByBookIdAsync(Guid bookId, CancellationToken cancellationToken)
        {
            return Task.FromResult<BookCover?>(null);
        }

        public Task<BookCover?> GetByPendingUploadTokenAsync(Guid token, Guid ownerId,
            CancellationToken cancellationToken)
        {
            return Task.FromResult<BookCover?>(cover.PendingUploadToken == token && cover.Book.OwnerId == ownerId
                ? cover
                : null);
        }

        public Task<IReadOnlyCollection<BookCover>> GetPendingAsync(int take, CancellationToken cancellationToken)
        {
            return Task.FromResult<IReadOnlyCollection<BookCover>>([]);
        }

        public Task AddAsync(BookCover value, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }

        public Task DeleteAsync(BookCover value, CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }

        public Task SaveAsync(CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }
    }

    private sealed class FakeUser(Guid ownerId) : IUser
    {
        public Guid? Id => ownerId;
        public Guid RequiredId => ownerId;
        public string? Email => null;
        public string? Username => null;
        public IEnumerable<string> Roles => [];
        public bool IsAuthenticated => true;
        public bool Valid => true;
    }
}
