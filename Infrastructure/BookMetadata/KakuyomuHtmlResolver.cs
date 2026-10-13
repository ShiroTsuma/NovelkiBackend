namespace Infrastructure.BookMetadata;

using System.Text.Json;
using AngleSharp.Dom;
using static BookHtmlResolverUtilities;

internal sealed class KakuyomuHtmlResolver() : NovelHtmlResolverBase("Kakuyomu", "kakuyomu.jp", @"^/works/\d+/?$")
{
    protected override bool HasBookMarkup(IDocument document) => document.QuerySelector("h1 a[href^='/works/']") != null &&
        document.QuerySelector(".partialGiftWidgetActivityName, #workAuthor-activityName") != null;

    protected override ResolvedBookHtmlMetadata Extract(IDocument document, string? canonical, List<string> warnings)
    {
        string? description = null, cover = null;
        var tags = new List<string> { "Japanese" };
        var aliases = new List<string>();
        var author = ReadText(document.QuerySelector(".partialGiftWidgetActivityName a, #workAuthor-activityName"));
        var stateScript = document.QuerySelector("script#__NEXT_DATA__");
        if (stateScript != null && canonical != null)
        {
            try
            {
                using var json = JsonDocument.Parse(stateScript.TextContent);
                var state = json.RootElement.GetProperty("props").GetProperty("pageProps").GetProperty("__APOLLO_STATE__");
                var id = new Uri(canonical).AbsolutePath.TrimEnd('/').Split('/').Last();
                // Never use the first Work object: recommendations precede the current novel in this state.
                if (state.TryGetProperty($"Work:{id}", out var work))
                {
                    description = String(work, "introduction");
                    cover = String(work, "adminCoverImageUrl");
                    if (String(work, "alternateTitle") is { } alias) aliases.Add(alias);
                    if (work.TryGetProperty("tagLabels", out var labels) && labels.ValueKind == JsonValueKind.Array)
                        tags.AddRange(labels.EnumerateArray().Where(value => value.ValueKind == JsonValueKind.String)
                            .Select(value => value.GetString()!));
                    if (String(work, "alternateAuthorName") is { } name) author = name;
                    foreach (var (flag, tag) in new[] { ("isCruel", "Cruelty"), ("isViolent", "Violence"), ("isSexual", "Sexual Content") })
                        if (work.TryGetProperty(flag, out var value) && value.ValueKind == JsonValueKind.True) tags.Add(tag);
                }
                else warnings.Add("Kakuyomu embedded data did not contain the current novel; DOM metadata was used.");
            }
            catch (Exception exception) when (exception is JsonException or KeyNotFoundException or InvalidOperationException)
            {
                warnings.Add("Kakuyomu embedded JSON was invalid or its layout changed; DOM metadata was used.");
            }
        }
        description ??= ReadMultilineText(document.QuerySelector("#introduction, [class*='CollapseTextWithKakuyomuLinks']"));
        if (description == null)
        {
            description = HtmlToMultilineText(ReadMeta(document, "og:description"), document);
            if (description != null) warnings.Add("The full Kakuyomu introduction was missing; the short OpenGraph catchphrase was used.");
        }
        return Metadata(document, canonical, warnings, ReadText(document.QuerySelector("h1 a[href^='/works/']")),
            author, description, aliases, tags: tags, cover: cover, useOpenGraphCover: false);
    }

    private static string? String(JsonElement element, string key) =>
        element.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() : null;
}
