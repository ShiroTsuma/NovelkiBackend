namespace Infrastructure.Services;

public sealed class AdminLibraryService : IAdminLibraryService
{
    private readonly IBookFileService? _bookFiles;
    private readonly IBookListCacheInvalidator _cacheInvalidator;
    private readonly ApplicationDbContext _context;
    private readonly IPublicBookService? _publicBooks;
    private readonly IBookCoverStorage _storage;

    public AdminLibraryService(
        ApplicationDbContext context,
        IBookCoverStorage storage,
        IBookListCacheInvalidator cacheInvalidator,
        IPublicBookService? publicBooks = null,
        IBookFileService? bookFiles = null)
    {
        _context = context;
        _storage = storage;
        _publicBooks = publicBooks;
        _bookFiles = bookFiles;
        _cacheInvalidator = cacheInvalidator;
    }

    public async Task<AdminLibraryPurgeResult> DeleteAllBooksForOwnerAsync(Guid ownerId,
        CancellationToken cancellationToken)
    {
        var outcome = _bookFiles is not null
            ? await _bookFiles.ExecuteBookDeletionAsync(ownerId, null, ct => DeleteAllBooksCoreAsync(ownerId, ct),
                cancellationToken)
            : await DeleteAllBooksCoreAsync(ownerId, cancellationToken);
        foreach (var storagePath in outcome.StoragePaths)
        {
            await _storage.DeleteIfExistsAsync(storagePath, cancellationToken);
        }

        await _cacheInvalidator.InvalidateBooksAsync(ownerId, cancellationToken);
        return outcome.Result;
    }

    private async Task<(AdminLibraryPurgeResult Result, List<string> StoragePaths)> DeleteAllBooksCoreAsync(
        Guid ownerId, CancellationToken cancellationToken)
    {
        if (_publicBooks is not null)
        {
            await _publicBooks.UnlistAllForOwnerAsync(ownerId, cancellationToken);
        }

        await using var
            transaction = _context.Database.CurrentTransaction == null
                ? await _context.Database.BeginTransactionAsync(cancellationToken)
                : null;

        var books = await _context.Books
            .Where(book => book.OwnerId == ownerId)
            .Select(book => new { book.Id, book.AuthorId })
            .ToListAsync(cancellationToken);
        var covers = await _context.BookCovers
            .Where(cover => cover.Book.OwnerId == ownerId)
            .Select(cover => new { cover.StoragePath, cover.ThumbnailStoragePath })
            .ToListAsync(cancellationToken);
        var storagePaths = covers.SelectMany(cover => new[] { cover.StoragePath, cover.ThumbnailStoragePath })
            .Where(path => !string.IsNullOrWhiteSpace(path)).Cast<string>().Distinct().ToList();

        if (books.Count == 0)
        {
            return (new AdminLibraryPurgeResult(0, 0, 0), []);
        }

        var authorIds = books.Where(book => book.AuthorId.HasValue).Select(book => book.AuthorId!.Value).Distinct()
            .ToArray();
        var deletedBooks = await _context.Books
            .Where(book => book.OwnerId == ownerId)
            .ExecuteDeleteAsync(cancellationToken);

        var deletedTags = await _context.Tags
            .Where(tag => tag.OwnerId == ownerId && !tag.BookTags.Any())
            .ExecuteDeleteAsync(cancellationToken);

        var deletedAuthors = authorIds.Length == 0
            ? 0
            : await _context.Authors
                .Where(author => authorIds.Contains(author.Id) &&
                                 author.OwnerId == ownerId &&
                                 !author.IsPublic &&
                                 !author.Books.Any())
                .ExecuteDeleteAsync(cancellationToken);

        if (transaction != null)
        {
            await transaction.CommitAsync(cancellationToken);
        }

        return (new AdminLibraryPurgeResult(deletedBooks, deletedAuthors, deletedTags), storagePaths);
    }
}
