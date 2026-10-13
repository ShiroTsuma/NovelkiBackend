namespace Infrastructure.BookFiles;

using System.IO.Compression;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Xml;
using System.Xml.Linq;
using Archives;
using Services;

internal static class EpubValidator
{
    public static async Task<(string? Title, string Sha256, string? First, string? Last)> ValidateAsync(string path,
        BookFileOptions options,
        BookImportSecurityOptions security, ArchiveReadBudget budget, CancellationToken ct)
    {
        await using var stream = File.OpenRead(path);
        using var archive = new ZipArchive(stream, ZipArchiveMode.Read, true);
        var entries = ArchiveSafety.Validate(archive, security, options.MaxExpandedEpubBytes, options.MaxArchiveEntries,
            true);
        if (!entries.TryGetValue("mimetype", out var mime) ||
            !entries.TryGetValue("META-INF/container.xml", out var container))
            throw new ValidationException("Not an EPUB: missing mimetype or META-INF/container.xml.");
        if (Encoding.ASCII.GetString(await ReadAsync(mime, 64, ct)) != "application/epub+zip")
            throw new ValidationException("Not an EPUB: incorrect mimetype.");
        var containerXml = ParseXml(await ReadAsync(container, 2 * 1024 * 1024, ct));
        XNamespace containerNs = "urn:oasis:names:tc:opendocument:xmlns:container";
        var opfPath = containerXml.Descendants(containerNs + "rootfile")
            .Select(e => (string?)e.Attribute("full-path")).FirstOrDefault();
        if (opfPath == null || !ArchiveSafety.IsSafeName(opfPath) ||
            !ArchiveSafety.IsSafeName(Uri.UnescapeDataString(opfPath)) || !entries.TryGetValue(opfPath, out var opf))
            throw new ValidationException("EPUB package document is missing or has an unsafe path.");
        var package = ParseXml(await ReadAsync(opf, 2 * 1024 * 1024, ct));
        XNamespace opfNs = "http://www.idpf.org/2007/opf";
        if (package.Root?.Name != opfNs + "package") throw new ValidationException("EPUB package document is invalid.");
        XNamespace dc = "http://purl.org/dc/elements/1.1/";
        var title = package.Descendants(dc + "title").Select(e => e.Value.Trim()).FirstOrDefault(s => s.Length > 0);
        var contents = await ContentsAsync(package, opfPath, entries, ct);
        // Drain all resources with real byte limits; metadata alone cannot detect an inner ZIP bomb.
        foreach (var entry in entries.Values.Where(e => !e.FullName.EndsWith('/')))
        {
            await using var content = entry.Open();
            await ArchiveSafety.CopyAsync(content, Stream.Null, options.MaxExpandedEpubBytes, entry.Length, budget, ct,
                true);
        }

        stream.Position = 0;
        return (title is { Length: > 250 } ? title[..250] : title,
            Convert.ToHexString(await SHA256.HashDataAsync(stream, ct)), contents.First, contents.Last);
    }

    private static async Task<(string? First, string? Last)> ContentsAsync(XDocument package, string opfPath,
        IReadOnlyDictionary<string, ZipArchiveEntry> entries, CancellationToken ct)
    {
        XNamespace opf = "http://www.idpf.org/2007/opf";
        XNamespace html = "http://www.w3.org/1999/xhtml";
        XNamespace epub = "http://www.idpf.org/2007/ops";
        XNamespace ncx = "http://www.daisy.org/z3986/2005/ncx/";
        var items = package.Descendants(opf + "manifest").Elements(opf + "item").ToList();
        var nav = items.FirstOrDefault(e =>
            ((string?)e.Attribute("properties") ?? "").Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Contains("nav"));
        var spineToc = (string?)package.Root?.Element(opf + "spine")?.Attribute("toc");
        var legacy = items.FirstOrDefault(e => (string?)e.Attribute("id") == spineToc && spineToc != null)
                     ?? items.FirstOrDefault(e => (string?)e.Attribute("media-type") == "application/x-dtbncx+xml");
        foreach (var item in new[] { nav, legacy }.Where(i => i != null))
        {
            var path = ResolveEntry(opfPath, (string?)item!.Attribute("href"), entries);
            if (path == null) continue;
            try
            {
                var doc = ParseXml(await ReadAsync(entries[path], 2 * 1024 * 1024, ct));
                IEnumerable<(string Label, string? Target)> candidates;
                if (item == nav)
                {
                    var toc = doc.Descendants(html + "nav").FirstOrDefault(e =>
                        ((string?)e.Attribute(epub + "type") ?? "").Split(' ', StringSplitOptions.RemoveEmptyEntries)
                        .Contains("toc"));
                    candidates = toc == null
                        ? []
                        : NavigationEntries(toc.Elements(html + "ol").Elements(html + "li"), html);
                }
                else candidates = LegacyEntries(doc.Descendants(ncx + "navMap").Elements(ncx + "navPoint"), ncx);

                var labels = candidates.Where(c =>
                        c.Label.Length > 0 && c.Label.Length <= 500 && !c.Label.Any(char.IsControl) &&
                        ResolveEntry(path, c.Target, entries) != null && !IsFrontMatter(c.Label)).Select(c => c.Label)
                    .ToList();
                if (labels.Count > 0) return (labels[0], labels[^1]);
            }
            catch (Exception e) when (e is XmlException or ValidationException or InvalidDataException)
            {
                /* Optional, malformed TOC does not invent a range or make otherwise valid EPUBs unusable. */
            }
        }

        return (null, null);
    }

    private static IEnumerable<(string Label, string? Target)> NavigationEntries(IEnumerable<XElement> nodes,
        XNamespace html)
    {
        var pending = new Stack<XElement>(nodes.Reverse());
        while (pending.Count > 0)
        {
            var node = pending.Pop();
            var anchor = node.Elements().Where(e => e.Name != html + "ol")
                .SelectMany(e => e.DescendantsAndSelf(html + "a")).FirstOrDefault();
            var label = CleanLabel(anchor?.Value ?? "");
            var children = node.Elements(html + "ol").Elements(html + "li").ToList();
            if (label.Length > 0 && !IsFrontMatter(label) && !(children.Count > 0 && IsContainer(label)))
                yield return (label, (string?)anchor?.Attribute("href"));
            else
                foreach (var child in children.AsEnumerable().Reverse())
                    pending.Push(child);
        }
    }

    private static IEnumerable<(string Label, string? Target)> LegacyEntries(IEnumerable<XElement> nodes,
        XNamespace ncx)
    {
        var pending = new Stack<XElement>(nodes.Reverse());
        while (pending.Count > 0)
        {
            var node = pending.Pop();
            var label = CleanLabel(node.Element(ncx + "navLabel")?.Value ?? "");
            var children = node.Elements(ncx + "navPoint").ToList();
            if (label.Length > 0 && !IsFrontMatter(label) && !(children.Count > 0 && IsContainer(label)))
                yield return (label, (string?)node.Element(ncx + "content")?.Attribute("src"));
            else
                foreach (var child in children.AsEnumerable().Reverse())
                    pending.Push(child);
        }
    }

    private static string CleanLabel(string label) =>
        string.Join(" ", label.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));

    private static bool IsContainer(string label) => Regex.IsMatch(label, @"^(?:volume|vol\.?|book|part)(?:\s|\d|$)",
                                                         RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
                                                         TimeSpan.FromMilliseconds(50)) &&
                                                     !Regex.IsMatch(label, @"\b(?:chapter|ch\.?|c)\s*\d",
                                                         RegexOptions.IgnoreCase | RegexOptions.CultureInvariant,
                                                         TimeSpan.FromMilliseconds(50));

    private static bool IsFrontMatter(string label) => Regex.IsMatch(label,
        @"^(?:cover|front\s*page|intro(?:duction|\s*page)?|title\s*page|contents|table\s+of\s+contents|copyright|colophon|(?:volume|vol\.?|book|part)\s+[\divxlcdm]+[.:]?)$",
        RegexOptions.IgnoreCase | RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(50));

    private static string? ResolveEntry(string origin, string? href,
        IReadOnlyDictionary<string, ZipArchiveEntry> entries)
    {
        if (string.IsNullOrWhiteSpace(href) || Uri.TryCreate(href, UriKind.Absolute, out _)) return null;
        var relative = Uri.UnescapeDataString(href.Split('#')[0].Split('?')[0]);
        if (relative.StartsWith('/') || relative.Contains('\\')) return null;
        var prefix = origin.Contains('/') ? origin[..(origin.LastIndexOf('/') + 1)] : "";
        var segments = new List<string>();
        foreach (var segment in (relative.Length == 0 ? origin : prefix + relative).Split('/'))
        {
            if (segment == ".") continue;
            if (segment == "..")
            {
                if (segments.Count == 0) return null;
                segments.RemoveAt(segments.Count - 1);
            }
            else segments.Add(segment);
        }

        var path = string.Join('/', segments);
        return ArchiveSafety.IsSafeName(path) && entries.ContainsKey(path) ? path : null;
    }

    private static async Task<byte[]> ReadAsync(ZipArchiveEntry entry, long maxBytes, CancellationToken ct)
    {
        await using var content = entry.Open();
        using var target = new MemoryStream();
        await ArchiveSafety.CopyAsync(content, target, maxBytes, entry.Length, new ArchiveReadBudget(maxBytes), ct);
        return target.ToArray();
    }

    private static XDocument ParseXml(byte[] bytes)
    {
        using var stream = new MemoryStream(bytes);
        using var reader = XmlReader.Create(stream,
            new XmlReaderSettings
            {
                DtdProcessing = DtdProcessing.Prohibit,
                XmlResolver = null,
                MaxCharactersInDocument = 2 * 1024 * 1024
            });
        return XDocument.Load(reader);
    }
}
