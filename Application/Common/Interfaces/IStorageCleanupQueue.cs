namespace Application.Common.Interfaces;

public interface IStorageCleanupQueue
{
    public Task EnqueueAsync(IEnumerable<string?> storagePaths, CancellationToken cancellationToken);

    public Task EnqueueBookFilesAsync(IEnumerable<string> storagePaths, DateTime notBeforeUtc,
        CancellationToken cancellationToken)
    {
        throw new NotSupportedException("This cleanup queue does not support EPUB files.");
    }
}
