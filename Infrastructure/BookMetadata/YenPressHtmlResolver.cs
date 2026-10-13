namespace Infrastructure.BookMetadata;

using AngleSharp.Dom;
using static BookHtmlResolverUtilities;

internal sealed class YenPressHtmlResolver()
    : NovelHtmlResolverBase("YenPress", "yenpress.com", @"^/(?:series|titles)/[^/]+/?$")
{
    protected override bool HasSourceIdentity(IDocument document)
    {
        return document.Title?.EndsWith("| Yen Press", StringComparison.OrdinalIgnoreCase) == true;
    }

    protected override bool HasBookMarkup(IDocument document)
    {
        return document.QuerySelector("h1.heading")?.TextContent
                   .Contains("(light novel)", StringComparison.OrdinalIgnoreCase) == true &&
               document.QuerySelector(".story-details") != null;
    }

    protected override ResolvedBookHtmlMetadata Extract(IDocument document, string? canonical, List<string> warnings)
    {
        var isVolume = document.QuerySelector(".book-details") != null;
        var author = document.QuerySelectorAll(".story-details p")
            .FirstOrDefault(element =>
                element.TextContent.TrimStart().StartsWith("Author:", StringComparison.OrdinalIgnoreCase));
        if (isVolume)
        {
            warnings.Add("This is a Yen Press volume page; its title identifies the volume, not the entire series.");
        }
        else
        {
            warnings.Add(
                "The Yen Press series page describes a featured volume. That synopsis was skipped to avoid assigning it to the entire series.");
        }

        var image = document.QuerySelector("img[alt='series cover']");
        return Metadata(document, canonical, warnings,
            TextWithout(document, document.QuerySelector("h1.heading"), "sup"),
            ReadText(author?.QuerySelector("span")),
            isVolume ? ReadMultilineText(document.QuerySelector(".content-heading-txt .paragraph.fs-16")) : null,
            candidates: ReadDistinctTexts(document.QuerySelectorAll(".book-details a.white-label")),
            cover: image?.GetAttribute("src") ?? image?.GetAttribute("data-src"), useOpenGraphCover: false);
    }
}
