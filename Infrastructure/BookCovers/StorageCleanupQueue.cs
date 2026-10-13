namespace Infrastructure.BookCovers;

public sealed class StorageCleanupQueue(ApplicationDbContext context, TimeProvider timeProvider)
    : IStorageCleanupQueue
{
    public async Task EnqueueAsync(IEnumerable<string?> storagePaths, CancellationToken cancellationToken)
    {
        foreach (var storagePath in storagePaths.Where(path => !string.IsNullOrWhiteSpace(path))
                     .Cast<string>().Distinct(StringComparer.Ordinal))
        {
            await context.Database.ExecuteSqlInterpolatedAsync($"""
                                                                INSERT INTO "StorageCleanupQueueItems"
                                                                    ("Id", "StoragePath", "StorageKind", "AttemptCount", "NextAttemptAt", "LastError")
                                                                VALUES
                                                                    ({Guid.NewGuid()}, {storagePath}, {"Cover"}, {0}, {timeProvider.GetUtcNow().UtcDateTime}, {null})
                                                                ON CONFLICT ("StorageKind", "StoragePath") DO NOTHING
                                                                """, cancellationToken);
        }
    }

    public async Task EnqueueBookFilesAsync(IEnumerable<string> storagePaths, DateTime notBeforeUtc,
        CancellationToken cancellationToken)
    {
        foreach (var path in storagePaths.Distinct(StringComparer.Ordinal))
            await context.Database.ExecuteSqlInterpolatedAsync($"""
                                                                INSERT INTO "StorageCleanupQueueItems"
                                                                    ("Id", "StoragePath", "StorageKind", "AttemptCount", "NextAttemptAt", "LastError")
                                                                VALUES ({Guid.NewGuid()}, {path}, {"BookFile"}, {0}, {notBeforeUtc}, {null})
                                                                ON CONFLICT ("StorageKind", "StoragePath") DO UPDATE SET "NextAttemptAt" = {notBeforeUtc}
                                                                """, cancellationToken);
    }
}
