namespace Application.Common.Interfaces;

using DTOs.Book;

public interface IBookFileService
{
    BookFileLimitsDto Limits();
    Task<BookFileListDto> ListAsync(Guid bookId, CancellationToken ct);
    Task<IReadOnlyList<BookFileDto>> ListPublicAsync(Guid snapshotId, CancellationToken ct);
    Task UpdateAsync(Guid bookId, Guid fileId, string title, CancellationToken ct);
    Task ReorderAsync(Guid bookId, IReadOnlyList<Guid> ids, CancellationToken ct);
    Task DeleteAsync(Guid bookId, Guid fileId, CancellationToken ct);
    Task RestoreAsync(Guid bookId, Guid fileId, CancellationToken ct);
    Task ShareAsync(Guid bookId, IReadOnlyList<Guid> ids, CancellationToken ct);
    Task QueueDeletedBookFilesAsync(Guid ownerId, Guid? bookId, CancellationToken ct);

    Task<T> ExecuteBookDeletionAsync<T>(Guid ownerId, Guid? bookId, Func<CancellationToken, Task<T>> deletion,
        CancellationToken ct);

    Task<BookFileJobDto> CreateImportAsync(Guid? bookId, IAsyncEnumerable<BookFileUpload> uploads, CancellationToken ct,
        long? requestBytes = null);

    Task<BookFileJobDto> GetJobAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<BookFileJobDto>> ListJobsAsync(CancellationToken ct);
    Task<BookFileJobDto> FinalizeAsync(Guid id, IReadOnlyList<BookFileImportSelection> selection, CancellationToken ct);
    Task CancelAsync(Guid id, CancellationToken ct);
    Task<IReadOnlyList<BookFileExportCandidateDto>> ExportCandidatesAsync(string? query, CancellationToken ct);

    Task<BookFileJobDto> CreateExportAsync(IReadOnlyList<Guid> fileIds, Guid? snapshotId, bool includeManifest,
        CancellationToken ct);

    Task<IReadOnlyList<BookFileDownloadDto>> CreateDownloadsAsync(IReadOnlyList<Guid> fileIds, Guid? snapshotId,
        CancellationToken ct);

    Task<BookFileDownloadDto> CreateJobDownloadAsync(Guid jobId, CancellationToken ct);
    Task<BookFileDownloadResult> ConsumeDownloadAsync(Guid id, string token, CancellationToken ct);
}

public interface IBookFileStorage
{
    Task SaveAsync(string path, Stream content, CancellationToken ct);
    Task<Stream> OpenReadAsync(string path, CancellationToken ct);
    Task DeleteIfExistsAsync(string path, CancellationToken ct);
}
