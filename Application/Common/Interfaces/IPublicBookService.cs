namespace Application.Common.Interfaces;

using DTOs.Book;

public interface IPublicBookService
{
    public Task<PaginatedResult<PublicBookSnapshotDto>> SearchAsync(string? search, int skip, int take, bool mineOnly,
        CancellationToken cancellationToken);

    public Task<PublicBookSnapshotDto> PublishAsync(Guid bookId, CancellationToken cancellationToken);
    public Task<PublicBookSnapshotDto> RefreshAsync(Guid snapshotId, CancellationToken cancellationToken);
    public Task UnlistAsync(Guid snapshotId, CancellationToken cancellationToken);
    public Task UnlistBySourceBookAsync(Guid bookId, CancellationToken cancellationToken);
    public Task UnlistAllForOwnerAsync(Guid ownerId, CancellationToken cancellationToken);
    public Task<CopyPublicBookResult> CopyAsync(Guid snapshotId, CancellationToken cancellationToken);
    public Task<(Stream Content, string MimeType)> OpenCoverAsync(Guid snapshotId, CancellationToken cancellationToken);
}
