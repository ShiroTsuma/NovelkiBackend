namespace Infrastructure.BookMetadata;

using AngleSharp.Dom;
using static BookHtmlResolverUtilities;

internal sealed class RanobeDbHtmlResolver()
    : NovelHtmlResolverBase("RanobeDB", "ranobedb.org", @"^/(?:series|book)/\d+/?$")
{
    protected override bool HasBookMarkup(IDocument document)
    {
        return document.QuerySelector("h1") != null &&
               HeadingSection(document, "Staff") != null && HeadingSection(document, "Titles") != null;
    }

    protected override ResolvedBookHtmlMetadata Extract(IDocument document, string? canonical, List<string> warnings)
    {
        var staff = HeadingSection(document, "Staff")?.QuerySelectorAll("a[href^='/staff/']")
            .FirstOrDefault(element => element.QuerySelectorAll("span").Any(span => ReadText(span) == "author"));
        if (canonical?.Contains("/book/", StringComparison.Ordinal) == true)
        {
            warnings.Add(
                "This is a RanobeDB volume page; its title and URL identify the volume, not the entire series.");
        }

        return Metadata(document, canonical, warnings, ReadText(document.QuerySelector("h1")),
            ReadText(staff?.QuerySelector("span")),
            ReadMultilineText(HeadingSection(document, "Description")?.QuerySelector(".markdown")),
            ReadDistinctTexts(HeadingSection(document, "Titles")?.QuerySelectorAll("div.grid > div:nth-child(2) > p") ??
                              Enumerable.Empty<IElement>()),
            ReadDistinctTexts(HeadingSection(document, "genres")?.QuerySelectorAll("a.tag") ??
                              Enumerable.Empty<IElement>()),
            ReadDistinctTexts(HeadingSection(document, "tags")?.QuerySelectorAll("a.tag") ??
                              Enumerable.Empty<IElement>()));
    }
}
