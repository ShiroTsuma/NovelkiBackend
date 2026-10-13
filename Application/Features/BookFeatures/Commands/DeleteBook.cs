namespace Application.Features.BookFeatures.Commands;

public record DeleteBookCommand(Guid Id) : IRequest;

public class DeleteBookHandler : IRequestHandler<DeleteBookCommand>
{
    private readonly IBookFileService? _bookFiles;
    private readonly IBookListCacheInvalidator _cacheInvalidator;
    private readonly IPublicBookService? _publicBooks;
    private readonly IBookRepository _repository;
    private readonly IBookCoverStorage _storage;
    private readonly IUser _user;

    public DeleteBookHandler(
        IBookRepository repository,
        IBookCoverStorage storage,
        IBookListCacheInvalidator cacheInvalidator,
        IUser user,
        IPublicBookService? publicBooks = null,
        IBookFileService? bookFiles = null)
    {
        _repository = repository;
        _storage = storage;
        _cacheInvalidator = cacheInvalidator;
        _publicBooks = publicBooks;
        _bookFiles = bookFiles;
        _user = user;
    }

    public async Task Handle(DeleteBookCommand request, CancellationToken cancellationToken)
    {
        var book = await _repository.GetByIdAsync(request.Id, _user.RequiredId, cancellationToken)
                   ?? throw new EntityNotFoundException<Book, Guid>(request.Id);
        var storagePath = book.Cover?.StoragePath;
        var thumbnailStoragePath = book.Cover?.ThumbnailStoragePath;

        async Task<bool> Delete(CancellationToken ct)
        {
            if (_publicBooks is not null)
            {
                await _publicBooks.UnlistBySourceBookAsync(book.Id, ct);
            }

            await _repository.DeleteAsync(request.Id, _user.RequiredId, ct);
            return true;
        }

        if (_bookFiles is not null)
        {
            await _bookFiles.ExecuteBookDeletionAsync(_user.RequiredId, book.Id, Delete, cancellationToken);
        }
        else
        {
            await Delete(cancellationToken);
        }

        await _storage.DeleteIfExistsAsync(storagePath, cancellationToken);
        await _storage.DeleteIfExistsAsync(thumbnailStoragePath, cancellationToken);
        await _cacheInvalidator.InvalidateBooksAsync(_user.RequiredId, cancellationToken);
    }
}
