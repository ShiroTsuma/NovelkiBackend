namespace Infrastructure.BookMetadata;

using AngleSharp.Dom;
using static BookHtmlResolverUtilities;

internal sealed class AniListHtmlResolver()
    : NovelHtmlResolverBase("AniList", "anilist.co", @"^/manga/\d+(?:/[^/]+)?/?$")
{
    private static IElement? DataValue(IDocument document, string label)
    {
        return LabelValue(document, ".data-set > .type", label);
    }

    protected override bool HasBookMarkup(IDocument document)
    {
        return ReadText(DataValue(document, "Format")) == "Light Novel" &&
               document.QuerySelector(".content h1") != null;
    }

    protected override ResolvedBookHtmlMetadata Extract(IDocument document, string? canonical, List<string> warnings)
    {
        var author = document.QuerySelectorAll("a.content[href^='/staff/']")
            .FirstOrDefault(element =>
                ReadText(element.QuerySelector(".role")) is "Story" or "Story & Art" or "Original Story");
        var alternatives = new[] { "Romaji", "English", "Native", "Synonyms" }
            .SelectMany(label => (ReadMultilineText(DataValue(document, label)) ?? "").Split('\n'));
        return Metadata(document, canonical, warnings, ReadText(document.QuerySelector(".content h1")),
            ReadText(author?.QuerySelector(".name")), ReadMultilineText(document.QuerySelector(".description")),
            alternatives,
            ReadDistinctTexts(DataValue(document, "Genres")?.QuerySelectorAll("a") ?? Enumerable.Empty<IElement>()),
            ReadDistinctTexts(document.QuerySelectorAll(".tags .tag:not(.spoiler) a.name")),
            cover: document.QuerySelector("img.cover")?.GetAttribute("src"));
    }
}
