namespace Infrastructure.BookFiles;

using Application.Common.DTOs.Book;

internal sealed class BookFileJobPayload
{
    public List<StagedUpload> Uploads { get; set; } = [];
    public List<StagedEpub> Entries { get; set; } = [];
    public List<Guid> FileIds { get; set; } = [];
    public Guid? SnapshotId { get; set; }
    public bool IncludeManifest { get; set; }
    public List<string> Warnings { get; set; } = [];
    public List<BookFileImportSelection> Selection { get; set; } = [];
    public int ImportedCount { get; set; }
    public int SkippedCount { get; set; }
}

internal sealed record StagedUpload(string Path, string FileName);

internal sealed class StagedEpub
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid? BookId { get; set; }
    public string BookTitle { get; set; } = "";
    public string ContentType { get; set; } = "";
    public string Title { get; set; } = "";
    public string? FirstContentLabel { get; set; }
    public string? LastContentLabel { get; set; }
    public string FileName { get; set; } = "";
    public string Path { get; set; } = "";
    public int SortOrder { get; set; }
    public long SizeBytes { get; set; }
    public string Sha256 { get; set; } = "";
    public string? Error { get; set; }
    public bool Duplicate { get; set; }
    public bool Committed { get; set; }
}
