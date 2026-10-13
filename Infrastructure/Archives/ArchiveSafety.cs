namespace Infrastructure.Archives;

using System.IO.Compression;
using Services;

internal sealed class ArchiveReadBudget(long maximumBytes)
{
    private long _readBytes;

    public void Add(int bytes)
    {
        if (bytes > maximumBytes - _readBytes)
            throw new ValidationException("Archive exceeds the decompressed data limit.");
        _readBytes += bytes;
    }
}

internal static class ArchiveSafety
{
    public static Dictionary<string, ZipArchiveEntry> Validate(ZipArchive archive, BookImportSecurityOptions options,
        long maximumBytes, int maxEntries, bool allowDirectories = false)
    {
        if (archive.Entries.Count == 0 || archive.Entries.Count > maxEntries)
            throw new ValidationException("Archive contains an invalid number of entries.");
        var entries = new Dictionary<string, ZipArchiveEntry>(StringComparer.OrdinalIgnoreCase);
        long total = 0, compressed = 0;
        string? excessive = null;
        foreach (var entry in archive.Entries)
        {
            if (IsTraversal(entry.FullName))
                throw new SuspiciousBookImportException("archive-path-traversal",
                    "Archive contains a path traversal attempt.");
            if (IsLink(entry))
                throw new SuspiciousBookImportException("archive-link-entry",
                    "Archive contains a link or reparse-point entry.");
            var isDirectory = entry.FullName.EndsWith('/');
            if (!IsSafeName(entry.FullName, allowDirectories) || !entries.TryAdd(entry.FullName, entry))
                throw new ValidationException("Archive contains an unsafe or duplicate entry name.");
            if (entry.Length < 0 || entry.CompressedLength < 0 || (isDirectory && entry.Length != 0))
                throw new ValidationException("Archive contains invalid size metadata.");
            var ratio = entry.Length == 0
                ? 0
                : entry.CompressedLength == 0
                    ? double.PositiveInfinity
                    : entry.Length / (double)entry.CompressedLength;
            if (entry.Length >= options.SuspiciousCompressionMinimumBytes && ratio > options.SuspiciousCompressionRatio)
                throw new SuspiciousBookImportException("extreme-compression-ratio",
                    "Archive contains an extreme compression ratio.");
            if (ratio > options.MaxCompressionRatio) excessive ??= entry.FullName;
            if (entry.CompressedLength > long.MaxValue - compressed)
                throw new ValidationException("Archive contains invalid size metadata.");
            var projectedRatio = (compressed + (double)entry.CompressedLength) == 0
                ? double.PositiveInfinity
                : (total + (double)entry.Length) / (compressed + (double)entry.CompressedLength);
            if (total + (double)entry.Length >= options.SuspiciousCompressionMinimumBytes &&
                projectedRatio > options.SuspiciousCompressionRatio && entry.Length > maximumBytes - total)
                throw new SuspiciousBookImportException("extreme-archive-compression-ratio",
                    "Archive has an extreme overall compression ratio.");
            if (entry.Length > maximumBytes - total)
                throw new ValidationException("Archive is too large after decompression.");
            total += entry.Length;
            compressed += entry.CompressedLength;
        }

        if (total >= options.SuspiciousCompressionMinimumBytes &&
            (compressed == 0 || total / (double)compressed > options.SuspiciousCompressionRatio))
            throw new SuspiciousBookImportException("extreme-archive-compression-ratio",
                "Archive has an extreme overall compression ratio.");
        if (excessive != null)
            throw new ValidationException("Archive contains an entry with a suspicious compression ratio.");
        return entries;
    }

    public static bool IsSafeName(string name, bool allowDirectories = false)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Length > 240 || name.Any(char.IsControl) || name.Contains('\\') ||
            name.Contains(':') || name.StartsWith('/') || (!allowDirectories && name.EndsWith('/'))) return false;
        var trimmed = allowDirectories ? name.TrimEnd('/') : name;
        return trimmed.Length > 0 && trimmed.Split('/').All(s => s.Length > 0 && s is not "." and not "..");
    }

    public static bool IsTraversal(string name) =>
        name.Any(char.IsControl) || name.StartsWith('/') || name.StartsWith('\\') ||
        (name.Length >= 2 && char.IsAsciiLetter(name[0]) && name[1] == ':') ||
        name.Replace('\\', '/').Split('/').Any(s => s == "..");

    private static bool IsLink(ZipArchiveEntry entry) => ((entry.ExternalAttributes >> 16) & 0xF000) == 0xA000 ||
                                                         (entry.ExternalAttributes & 0x0400) != 0;

    public static async Task CopyAsync(Stream source, Stream destination, long maximumBytes, long? declaredLength,
        ArchiveReadBudget budget, CancellationToken ct, bool allowEmpty = false)
    {
        var buffer = new byte[64 * 1024];
        long total = 0;
        int read;
        while ((read = await source.ReadAsync(buffer, ct)) != 0)
        {
            if (declaredLength.HasValue && read > declaredLength.Value - total)
                throw new SuspiciousBookImportException("forged-uncompressed-size",
                    "Archive entry exceeds its declared size.");
            if (read > maximumBytes - total) throw new ValidationException("File is too large after decompression.");
            total += read;
            budget.Add(read);
            await destination.WriteAsync(buffer.AsMemory(0, read), ct);
        }

        if (declaredLength.HasValue && total != declaredLength.Value)
            throw new ValidationException("Archive entry is truncated.");
        if (total == 0 && !allowEmpty) throw new ValidationException("File is empty.");
    }
}
