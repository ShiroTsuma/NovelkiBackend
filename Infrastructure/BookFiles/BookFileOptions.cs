namespace Infrastructure.BookFiles;

public sealed class BookFileOptions
{
    public const string SectionName = "BookFiles";
    public string StorageRoot { get; set; } = "storage/epubs";
    public string StagingRoot { get; set; } = "storage/epub-staging";
    public long MaxFileBytes { get; set; } = 100L * 1024 * 1024;
    public long MaxUploadBytes { get; set; } = 300L * 1024 * 1024;
    public int MaxFilesPerImport { get; set; } = 100;
    public long MaxExtractedBytes { get; set; } = 512L * 1024 * 1024;
    public long MaxExpandedEpubBytes { get; set; } = 1024L * 1024 * 1024;
    public int MaxArchiveEntries { get; set; } = 5000;
    public long MaxOwnerStorageBytes { get; set; } = 10L * 1024 * 1024 * 1024;
    public long MaxLibraryArchiveBytes { get; set; } = 12L * 1024 * 1024 * 1024;
    public int MaxLibraryArchiveEntries { get; set; } = 50_000;
    public long MaxStagingBytes { get; set; } = 24L * 1024 * 1024 * 1024;
    public int MaxConcurrentOperations { get; set; } = 2;
    public int MaxActiveJobsPerOwner { get; set; } = 5;
    public TimeSpan ProcessingTimeout { get; set; } = TimeSpan.FromMinutes(30);
    public TimeSpan JobLifetime { get; set; } = TimeSpan.FromHours(2);
    public TimeSpan Retention { get; set; } = TimeSpan.FromDays(30);
    public TimeSpan TicketLifetime { get; set; } = TimeSpan.FromMinutes(1);
}
