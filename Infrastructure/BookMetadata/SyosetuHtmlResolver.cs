namespace Infrastructure.BookMetadata;

using AngleSharp.Dom;
using static BookHtmlResolverUtilities;

internal sealed class SyosetuHtmlResolver() : NovelHtmlResolverBase("Syosetu", "ncode.syosetu.com", @"^/(?:n\d+[a-z]+/?|novelview/infotop/ncode/n\d+[a-z]+/?)$")
{
    protected override bool HasBookMarkup(IDocument document) =>
        (document.QuerySelector(".p-novel__title") != null && document.QuerySelector(".p-novel__summary") != null) ||
        (document.QuerySelector(".p-infotop-title") != null && document.QuerySelector(".p-infotop-data__title") != null);

    protected override ResolvedBookHtmlMetadata Extract(IDocument document, string? canonical, List<string> warnings)
    {
        var keywords = ReadText(LabelValue(document, ".p-infotop-data__title", "キーワード"));
        var genre = ReadText(LabelValue(document, ".p-infotop-data__title", "ジャンル"));
        warnings.Add("Syosetu's social preview is a title card, not a book cover, and was skipped.");
        return Metadata(document, canonical, warnings,
            ReadText(document.QuerySelector(".p-novel__title, .p-infotop-title")),
            ReadText(document.QuerySelector(".p-novel__author a"))
                ?? ReadText(LabelValue(document, ".p-infotop-data__title", "作者名")),
            ReadMultilineText(document.QuerySelector(".p-novel__summary"))
                ?? ReadMultilineText(LabelValue(document, ".p-infotop-data__title", "あらすじ")),
            tags: (keywords ?? ReadMeta(document, "og:description") ?? "").Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Append("Japanese").Concat(genre == null ? [] : new[] { genre }),
            useOpenGraphCover: false);
    }
}
