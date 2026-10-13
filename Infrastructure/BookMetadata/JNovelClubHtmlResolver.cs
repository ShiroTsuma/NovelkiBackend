namespace Infrastructure.BookMetadata;

using System.Text.RegularExpressions;
using AngleSharp.Dom;
using static BookHtmlResolverUtilities;

internal sealed class JNovelClubHtmlResolver() : NovelHtmlResolverBase("JNovelClub", "j-novel.club", @"^/series/[^/]+/?$")
{
    protected override string? PageUrl(IDocument document)
    {
        var explicitUrl = ReadCanonicalUrl(document);
        if (!string.IsNullOrWhiteSpace(explicitUrl)) return explicitUrl;
        var slug = document.QuerySelector("[class*='TitleBanner-'] h1")?.ParentElement?.Id;
        return slug != null && Regex.IsMatch(slug, @"^[a-z0-9]+(?:-[a-z0-9]+)*$")
            ? $"{Origin}series/{slug}" : null;
    }

    protected override bool HasBookMarkup(IDocument document) =>
        document.QuerySelector("[class*='TitleBanner-'].novel h1") != null && document.QuerySelector("#author") != null;

    protected override ResolvedBookHtmlMetadata Extract(IDocument document, string? canonical, List<string> warnings)
    {
        var author = document.QuerySelector("#author")?.ParentElement?.NextElementSibling?.QuerySelector("a");
        var tags = document.QuerySelector("#tags")?.ParentElement?.NextElementSibling?.QuerySelectorAll("a") ?? Enumerable.Empty<IElement>();
        var synopsis = document.QuerySelector(".text.large > p");
        string? description = null;
        if (synopsis != null)
        {
            var copy = document.CreateElement("div");
            copy.InnerHtml = synopsis.InnerHtml;
            foreach (var age in copy.QuerySelectorAll("[class*='__age']")) age.Remove();
            description = ReadMultilineText(copy);
        }
        if (description == null)
        {
            var preview = ReadMeta(document, "og:description");
            description = preview?.Split(" | ", 2).LastOrDefault();
            if (description != null) warnings.Add("The full J-Novel Club synopsis was missing; the short OpenGraph description was used.");
        }
        return Metadata(document, canonical, warnings, ReadText(document.QuerySelector("[class*='TitleBanner-'] h1")),
            ReadText(author), description,
            [ReadText(document.QuerySelector("[class*='TitleBanner-'][class*='__nameJp'] h3")) ?? ""],
            candidates: ReadDistinctTexts(tags));
    }
}
