namespace Domain.Entities;

public sealed class BookFile : BaseAuditableEntity
{
    public Guid BookId { get; set; }
    public Guid OwnerId { get; set; }
    public required string StoragePath { get; set; }
    public required string OriginalFileName { get; set; }
    public required string Title { get; set; }
    public int SortOrder { get; set; }
    public string? FirstContentLabel { get; set; }
    public string? LastContentLabel { get; set; }
    public string MimeType { get; set; } = "application/epub+zip";
    public long SizeBytes { get; set; }
    public required string Sha256 { get; set; }
    public DateTime? DeletedAtUtc { get; set; }
}

public sealed class PublicBookFile
{
    public Guid SnapshotId { get; set; }
    public Guid BookFileId { get; set; }
}

// Persistent work state; payload contains generated staging paths, never client storage keys.
public sealed class BookFileJob : BaseEntity
{
    public Guid OwnerId { get; set; }
    public Guid? BookId { get; set; }
    public string Kind { get; set; } = "BookImport";
    public string Status { get; set; } = "Uploading";
    public string PayloadJson { get; set; } = "{}";
    public string? Error { get; set; }
    public int ProcessedFiles { get; set; }
    public int TotalFiles { get; set; }
    public int ImportedCount { get; set; }
    public int SkippedCount { get; set; }
    public long ReservedBytes { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public sealed class BookFileDownloadTicket : BaseEntity
{
    public Guid OwnerId { get; set; }
    public required string TokenHash { get; set; }
    public Guid? FileId { get; set; }
    public Guid? SnapshotId { get; set; }
    public Guid? JobId { get; set; }
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime? ConsumedAtUtc { get; set; }
}
