namespace Infrastructure.BookMetadata;

using AngleSharp.Dom;
using static BookHtmlResolverUtilities;

internal sealed class SevenSeasHtmlResolver() : NovelHtmlResolverBase("SevenSeas", "sevenseasentertainment.com", @"^/(?:series|books)/[^/]+/?$")
{
    protected override bool HasBookMarkup(IDocument document)
    {
        var title = ReadText(document.QuerySelector("#content .topper"));
        if (title == null || title.Contains("(Manga)", StringComparison.OrdinalIgnoreCase)) return false;
        var format = document.QuerySelectorAll("#volume-meta > p")
            .FirstOrDefault(element => ReadText(element.QuerySelector("b")) == "Format:");
        if (format != null)
            return TextWithout(document, format, "b") is "Light Novel" or "Novel";
        return title.Contains("(Light Novel)", StringComparison.OrdinalIgnoreCase) ||
               title.Contains("(Novel)", StringComparison.OrdinalIgnoreCase) ||
               document.QuerySelectorAll("#series-meta a[rel~='tag']")
                   .Any(element => ReadText(element) is "Light Novels" or "Novels");
    }

    protected override ResolvedBookHtmlMetadata Extract(IDocument document, string? canonical, List<string> warnings)
    {
        var title = ReadText(document.QuerySelector("#content .topper"));
        var isVolume = document.QuerySelector("#volume-meta") != null;
        if (title != null && title.Contains(':')) title = title[(title.IndexOf(':') + 1)..].Trim();
        if (isVolume) warnings.Add("This is a Seven Seas volume page; its title and URL identify the volume, not the entire series.");
        var creators = document.QuerySelectorAll(isVolume
            ? "#volume-meta .creator a" : "#series-meta a[href*='/creator/']");
        if (creators.Length > 1)
            warnings.Add("Seven Seas combines story and art credits; the first creator was selected. Review the author before applying.");
        var description = isVolume
            ? document.QuerySelector("#volume-meta .description-content")
            : document.QuerySelector(".series-description .entry");
        // Series entries also contain retailer links; keep only the introductory paragraphs.
        if (!isVolume && description != null)
        {
            var copy = document.CreateElement("div");
            foreach (var paragraph in description.Children)
            {
                if (paragraph.TextContent.Contains("Also available", StringComparison.OrdinalIgnoreCase)) break;
                copy.InnerHtml += paragraph.OuterHtml;
            }
            description = copy;
        }
        return Metadata(document, canonical, warnings, title, ReadText(creators.FirstOrDefault()),
            ReadMultilineText(description),
            ReadText(document.QuerySelector("#originaltitle"))?.Split('|', StringSplitOptions.TrimEntries),
            candidates: ReadDistinctTexts(document.QuerySelectorAll("#series-meta a[rel~='tag']"))
                .Where(tag => tag is not "Light Novels" and not "Novels"),
            cover: document.QuerySelector(isVolume ? "#volume-cover img" : ".series-volume img")?.GetAttribute("src"),
            useOpenGraphCover: false);
    }
}
