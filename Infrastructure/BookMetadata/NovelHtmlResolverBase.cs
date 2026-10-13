namespace Infrastructure.BookMetadata;

using System.Text.RegularExpressions;
using AngleSharp.Dom;
using static BookHtmlResolverUtilities;

// Shared validation only: each provider owns its page recognition and extraction rules.
internal abstract class NovelHtmlResolverBase(string source, string host, string entityPath) : IBookHtmlResolver
{
    protected string Source => source;
    protected string Origin => $"https://{host}/";

    protected virtual string? PageUrl(IDocument document) => ReadCanonicalUrl(document);
    protected abstract bool HasBookMarkup(IDocument document);
    protected virtual bool HasSourceIdentity(IDocument document) =>
        string.Equals(ReadMeta(document, "og:site_name"), source, StringComparison.OrdinalIgnoreCase);

    public int Match(IDocument document)
    {
        if (!HasBookMarkup(document)) return 0;
        var raw = PageUrl(document);
        return string.IsNullOrWhiteSpace(raw)
            ? (HasSourceIdentity(document) ? 80 : 0)
            : (IsEntityUrl(NormalizeHttpUrl(raw, Origin)) ? 100 : 0);
    }

    private bool IsEntityUrl(string? url) => HasHostAndPath(url, host, "/") &&
        Regex.IsMatch(new Uri(url!).AbsolutePath, entityPath, RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);

    public ResolvedBookHtmlMetadata Resolve(IDocument document)
    {
        var warnings = new List<string>();
        var url = NormalizeHttpUrl(PageUrl(document), Origin);
        if (!IsEntityUrl(url))
        {
            url = null;
            warnings.Add($"The canonical {source} book URL was missing or invalid and was skipped.");
        }

        var metadata = Extract(document, url, warnings);
        if (metadata.PrimaryTitle == null) warnings.Add($"Primary title was not found in the pasted {source} HTML.");
        if (metadata.AuthorName == null) warnings.Add($"Author was not found in the pasted {source} HTML.");
        if (metadata.Description == null) warnings.Add($"Description was not found in the pasted {source} HTML.");
        return metadata with
        {
            AlternativeTitles = metadata.AlternativeTitles
                .Where(title => !string.Equals(title, metadata.PrimaryTitle, StringComparison.OrdinalIgnoreCase))
                .Distinct(StringComparer.OrdinalIgnoreCase).ToArray()
        };
    }

    protected abstract ResolvedBookHtmlMetadata Extract(IDocument document, string? canonical, List<string> warnings);

    protected ResolvedBookHtmlMetadata Metadata(IDocument document, string? canonical, List<string> warnings,
        string? title, string? author, string? description, IEnumerable<string>? alternatives = null,
        IEnumerable<string>? genres = null, IEnumerable<string>? tags = null, IEnumerable<string>? candidates = null,
        string? cover = null, bool useOpenGraphCover = true)
    {
        var rawCover = cover ?? (useOpenGraphCover ? ReadMeta(document, "og:image") : null);
        var coverUrl = NormalizeHttpUrl(rawCover, canonical ?? Origin);
        if (!string.IsNullOrWhiteSpace(rawCover) && coverUrl == null)
            warnings.Add($"The detected {source} cover URL was invalid and was skipped.");
        return new ResolvedBookHtmlMetadata(source, title, author, "Novel", Clean(alternatives), Clean(genres),
            Clean(tags), Clean(candidates), description, canonical, coverUrl, warnings);
    }

    protected static string[] Clean(IEnumerable<string>? values) => (values ?? [])
        .Where(value => !string.IsNullOrWhiteSpace(value)).Select(value => value.Trim())
        .Distinct(StringComparer.OrdinalIgnoreCase).ToArray();

    protected static IElement? LabelValue(IDocument document, string selector, string label) =>
        document.QuerySelectorAll(selector)
            .FirstOrDefault(element => string.Equals(ReadText(element), label, StringComparison.OrdinalIgnoreCase))
            ?.NextElementSibling;

    protected static IElement? HeadingSection(IDocument document, string label)
    {
        var heading = document.QuerySelectorAll("h2")
            .FirstOrDefault(element => string.Equals(ReadText(element), label, StringComparison.OrdinalIgnoreCase));
        return heading?.ParentElement?.LocalName == "summary"
            ? heading.Closest("details") : heading?.Closest("section");
    }

    protected static string? TextWithout(IDocument document, IElement? element, string selector)
    {
        if (element == null) return null;
        var copy = document.CreateElement("div");
        copy.InnerHtml = element.InnerHtml;
        foreach (var child in copy.QuerySelectorAll(selector)) child.Remove();
        return ReadText(copy);
    }
}
