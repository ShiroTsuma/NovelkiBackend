namespace Infrastructure.BookMetadata;

using AngleSharp.Dom;
using static BookHtmlResolverUtilities;

internal sealed class AnimePlanetHtmlResolver() : NovelHtmlResolverBase("AnimePlanet", "anime-planet.com", @"^/manga/[^/]+/?$")
{
    private static readonly string[] NovelTags = ["Light Novels", "Web Novels", "Novels", "Chinese Novels", "Korean Novels"];

    protected override bool HasSourceIdentity(IDocument document) => ReadMeta(document, "og:site_name") == "Anime-Planet";

    protected override bool HasBookMarkup(IDocument document) => document.QuerySelector("h1[itemprop='name']") != null &&
        document.QuerySelectorAll(".tags a").Any(tag => NovelTags.Contains(ReadText(tag), StringComparer.OrdinalIgnoreCase));

    protected override ResolvedBookHtmlMetadata Extract(IDocument document, string? canonical, List<string> warnings)
    {
        var authorCard = document.QuerySelectorAll(".CharacterCard__content")
            .FirstOrDefault(card => ReadText(card.QuerySelector(".CharacterCard__body")) == "Author");
        var aliases = ReadText(document.QuerySelector(".aka"))?.Replace("Alt titles:", "", StringComparison.OrdinalIgnoreCase)
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        return Metadata(document, canonical, warnings, ReadText(document.QuerySelector("h1[itemprop='name']")),
            ReadText(authorCard?.QuerySelector(".CharacterCard__title")) ?? ReadBookJsonLdAuthor(document),
            ReadMultilineText(document.QuerySelector(".synopsisManga"))
                ?? HtmlToMultilineText(ReadMeta(document, "og:description"), document),
            aliases, candidates: ReadDistinctTexts(document.QuerySelectorAll(".tags a"))
                .Where(tag => !NovelTags.Contains(tag, StringComparer.OrdinalIgnoreCase)));
    }
}
