namespace Infrastructure.BookMetadata;

using AngleSharp.Dom;
using static BookHtmlResolverUtilities;

internal sealed class WuxiaWorldHtmlResolver() : NovelHtmlResolverBase("Wuxiaworld", "wuxiaworld.com", @"^/novel/[^/]+/?$")
{
    protected override bool HasBookMarkup(IDocument document) => document.QuerySelector("h1") != null &&
        (LabelValue(document, "div", "Author:") != null || LabelValue(document, "h4", "Synopsis") != null);

    protected override ResolvedBookHtmlMetadata Extract(IDocument document, string? canonical, List<string> warnings) =>
        Metadata(document, canonical, warnings, ReadText(document.QuerySelector("h1")) ?? ReadBookJsonLdString(document, "name"),
            ReadBookJsonLdAuthor(document) ?? ReadText(LabelValue(document, "div", "Author:")),
            ReadMultilineText(LabelValue(document, "h4", "Synopsis"))
                ?? HtmlToMultilineText(ReadMeta(document, "og:description"), document),
            genres: ReadDistinctTexts(document.QuerySelectorAll("a[href^='/novels/?genre=']")),
            tags: ReadDistinctTexts(document.QuerySelectorAll("a[href^='/novels/?language='], a[href^='/novels/?tag=']")),
            cover: ReadBookJsonLdString(document, "image"));
}
