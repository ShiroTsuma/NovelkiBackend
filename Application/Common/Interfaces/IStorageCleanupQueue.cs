namespace Application.Common.Interfaces;

public interface IStorageCleanupQueue
{
    Task EnqueueAsync(IEnumerable<string?> storagePaths, CancellationToken cancellationToken);

    Task EnqueueBookFilesAsync(IEnumerable<string> storagePaths, DateTime notBeforeUtc,
        CancellationToken cancellationToken)
        => throw new NotSupportedException("This cleanup queue does not support EPUB files.");
}
