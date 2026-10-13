namespace Infrastructure.BookMetadata;

using AngleSharp.Dom;
using static BookHtmlResolverUtilities;

internal sealed class MangaUpdatesHtmlResolver() : NovelHtmlResolverBase("MangaUpdates", "mangaupdates.com", @"^/series/[^/]+(?:/[^/]+)?/?$")
{
    protected override bool HasBookMarkup(IDocument document) =>
        ReadText(document.QuerySelector("[data-cy='info-box-type']")) == "Novel" &&
        document.QuerySelector(".releasestitle.tabletitle") != null;

    protected override ResolvedBookHtmlMetadata Extract(IDocument document, string? canonical, List<string> warnings) =>
        Metadata(document, canonical, warnings, ReadText(document.QuerySelector(".releasestitle.tabletitle")),
            ReadText(document.QuerySelector("[data-cy='info-box-authors'] a")),
            ReadMultilineText(document.QuerySelector("[data-cy='info-box-description'] [class*='__mu_markdown']"))
                ?? ReadMultilineText(document.QuerySelector("[data-cy='info-box-description']")),
            ReadDistinctTexts(document.QuerySelectorAll("[data-cy='info-box-associated'] > div")),
            ReadDistinctTexts(document.QuerySelectorAll("[data-cy='info-box-genres'] > span a")),
            ReadDistinctTexts(document.QuerySelectorAll("[data-cy='info-box-categories'] li a")));
}
