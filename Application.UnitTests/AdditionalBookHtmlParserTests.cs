namespace Application.UnitTests;

using AngleSharp.Html.Parser;
using Application.Common.DTOs.Book;
using Common.Interfaces;
using Domain.Entities;
using Domain.Repositories;
using FluentValidation;
using Infrastructure.BookMetadata;
using Moq;

public sealed class AdditionalBookHtmlParserTests
{
    private static IBookHtmlResolver[] Resolvers() =>
    [
        new NovelUpdatesHtmlResolver(), new RoyalRoadHtmlResolver(), new ScribbleHubHtmlResolver(), new WebNovelHtmlResolver(),
        new AnimePlanetHtmlResolver(), new MangaUpdatesHtmlResolver(), new RanobeDbHtmlResolver(), new WuxiaWorldHtmlResolver(),
        new AniListHtmlResolver(), new JNovelClubHtmlResolver(), new SevenSeasHtmlResolver(), new YenPressHtmlResolver(),
        new SyosetuHtmlResolver(), new KakuyomuHtmlResolver()
    ];

    private static BookHtmlParser Parser()
    {
        var types = new Mock<ITypeRepository>();
        types.Setup(repository => repository.GetByNameAsync("Novel", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ContentType { Id = Guid.NewGuid(), Name = "Novel", Slug = "novel" });
        var genres = new Mock<IGenreRepository>();
        genres.Setup(repository => repository.GetByNameAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string name, CancellationToken _) =>
                new[] { "Fantasy", "Adventure", "Drama", "Mystery", "Romance", "Action" }.Contains(name, StringComparer.OrdinalIgnoreCase)
                    ? new Genre { Id = Guid.NewGuid(), Name = name, NormalizedName = name.ToUpperInvariant() } : null);
        return new BookHtmlParser(Resolvers(), genres.Object, types.Object);
    }

    private static string Fixture(string name) => File.ReadAllText(Path.Combine(AppContext.BaseDirectory, "Fixtures", name + ".html"));
    private static Task<BookHtmlParseResult> Parse(string name) => Parser().ParseAsync(Fixture(name), CancellationToken.None);

    [Theory]
    [InlineData("animeplanet", "AnimePlanet", "The Apothecary Diaries (Light Novel)", "Natsu HYUUGA")]
    [InlineData("mangaupdates", "MangaUpdates", "Mushoku Tensei - Dasoku Hen (Novel)", "Rifujin na Magonote")]
    [InlineData("ranobedb-series", "RanobeDB", "Mushoku Tensei: Jobless Reincarnation", "Rifujin na Magonote")]
    [InlineData("ranobedb-book", "RanobeDB", "Mushoku Tensei: Jobless Reincarnation Vol. 1", "Rifujin na Magonote")]
    [InlineData("wuxiaworld", "Wuxiaworld", "Against the Gods", "Mars Gravity(火星引力)")]
    [InlineData("anilist", "AniList", "Mushoku Tensei: Isekai Ittara Honki Dasu", "Rifujin na Magonote")]
    [InlineData("jnovelclub", "JNovelClub", "Ascendance of a Bookworm", "Miya Kazuki")]
    [InlineData("sevenseas", "SevenSeas", "Mushoku Tensei: Jobless Reincarnation (Light Novel)", "Rifujin na Magonote")]
    [InlineData("sevenseas-book", "SevenSeas", "Mushoku Tensei: Jobless Reincarnation (Light Novel) Vol. 1", "Rifujin na Magonote")]
    [InlineData("yenpress", "YenPress", "86--EIGHTY-SIX (light novel)", "Asato Asato")]
    [InlineData("yenpress-book", "YenPress", "86--EIGHTY-SIX, Vol. 1 (light novel)", "Asato Asato")]
    [InlineData("syosetu", "Syosetu", "無職転生 - 異世界行ったら本気だす -", "理不尽な孫の手")]
    [InlineData("syosetu-info", "Syosetu", "無職転生 - 異世界行ったら本気だす -", "理不尽な孫の手")]
    [InlineData("kakuyomu", "Kakuyomu", "慎重勇者 ~この勇者が俺ＴＵＥＥＥくせに慎重すぎる~", "土日 月")]
    public async Task RealFixture_RecognizesOneProviderAndExtractsBookInsteadOfNavigationOrRecommendations(
        string fixture, string source, string title, string author)
    {
        var result = await Parse(fixture);
        Assert.Equal(source, result.Source);
        Assert.Equal(title, result.PrimaryTitle);
        Assert.Equal(author, result.AuthorName);
        Assert.Equal("Novel", result.ContentType?.Name);
        Assert.DoesNotContain(result.PrimaryTitle!, result.AlternativeTitles);
        if (fixture != "yenpress") Assert.False(string.IsNullOrWhiteSpace(result.Description));
        if (fixture != "yenpress-book") Assert.StartsWith("https://", result.CanonicalUrl);
        if (!fixture.StartsWith("syosetu", StringComparison.Ordinal)) Assert.StartsWith("https://", result.CoverUrl);
    }

    [Fact]
    public async Task AnimePlanet_ExtractsAliasesAndClassifiesTagsWithoutRecommendationNoise()
    {
        var result = await Parse("animeplanet");
        Assert.Contains("薬屋のひとりごと", result.AlternativeTitles);
        Assert.Contains("Kusuriya no Hitorigoto (Light Novel)", result.AlternativeTitles);
        Assert.Contains(result.Genres, genre => genre.Name == "Mystery" && genre.Id != null);
        Assert.Contains("Medical", result.Tags);
        Assert.DoesNotContain("Light Novels", result.Tags);
        Assert.StartsWith("In the East", result.Description);
    }

    [Fact]
    public async Task MangaUpdates_ExtractsAliasesCategoriesAndOnlyGenreNames()
    {
        var result = await Parse("mangaupdates");
        Assert.Contains("Mushoku Tensei Redundancy (Novel)", result.AlternativeTitles);
        Assert.Contains("Smart Protagonist", result.Tags);
        Assert.Contains(result.Genres, genre => genre.Name == "Fantasy" && genre.Id != null);
        Assert.DoesNotContain(result.Genres, genre => genre.Name.Contains("Search for", StringComparison.Ordinal));
        Assert.DoesNotContain("Shirotaka", result.AuthorName!);
    }

    [Theory]
    [InlineData("ranobedb-series")]
    [InlineData("ranobedb-book")]
    public async Task RanobeDb_ExtractsTitlesAndSeparatesAuthorFromTranslations(string fixture)
    {
        var result = await Parse(fixture);
        Assert.Contains(result.AlternativeTitles, value => value.StartsWith("無職転生", StringComparison.Ordinal));
        Assert.DoesNotContain("ja", result.AlternativeTitles);
        Assert.Contains("isekai", result.Tags);
        Assert.Contains(result.Genres, genre => genre.Name == "fantasy");
        Assert.DoesNotContain("Kevin Frane", result.AuthorName!);
    }

    [Fact]
    public async Task Wuxiaworld_ReadsSynopsisGenresAndBookJsonLd()
    {
        var result = await Parse("wuxiaworld");
        Assert.StartsWith("Hunted for possessing", result.Description);
        Assert.Contains(result.Genres, genre => genre.Name == "Xuanhuan");
        Assert.StartsWith("https://cdn.wuxiaworld.com/images/covers/", result.CoverUrl);
        Assert.DoesNotContain("alyschu", result.AuthorName!);
    }

    [Fact]
    public async Task AniList_ReadsAllTitleLanguagesTagsAndOnlyStoryCredit()
    {
        var result = await Parse("anilist");
        Assert.Contains("Mushoku Tensei: Jobless Reincarnation", result.AlternativeTitles);
        Assert.Contains("無職転生 ～異世界行ったら本気だす～", result.AlternativeTitles);
        Assert.Contains("Isekai", result.Tags);
        Assert.DoesNotContain(result.Tags, tag => tag.Contains('%'));
    }

    [Fact]
    public async Task JNovelClub_PreservesFullSynopsisAndNativeTitleWithoutAgeLabelOrIllustrator()
    {
        var result = await Parse("jnovelclub");
        Assert.Contains("本好きの下剋上 ～司書になるためには手段を選んでいられません～", result.AlternativeTitles);
        Assert.Contains("book loving", result.Tags);
        Assert.StartsWith("A certain college girl", result.Description);
        Assert.DoesNotContain("Suggested", result.Description!);
        Assert.Equal("https://j-novel.club/series/ascendance-of-a-bookworm", result.CanonicalUrl);
    }

    [Fact]
    public async Task SevenSeas_UsesVolumeCoverAndExcludesRetailerBoilerplateFromSeriesSynopsis()
    {
        var result = await Parse("sevenseas");
        Assert.Contains("無職転生 - 異世界行ったら本気だす", result.AlternativeTitles);
        Assert.Contains("Isekai / Another World", result.Tags);
        Assert.Contains("MUSHOKU-TENSEI-LN-1-cover-FRONT", result.CoverUrl);
        Assert.DoesNotContain("Also available", result.Description!);
        Assert.DoesNotContain("siteheader", result.CoverUrl!);
    }

    [Fact]
    public async Task YenPress_DoesNotAssignFeaturedVolumeSynopsisToSeries()
    {
        var result = await Parse("yenpress");
        Assert.Null(result.Description);
        Assert.Contains(result.Warnings, warning => warning.Contains("featured volume", StringComparison.Ordinal));
        Assert.Equal("https://yenpress.com/series/86-eighty-six-light-novel", result.CanonicalUrl);
    }

    [Fact]
    public async Task YenPress_VolumeReadsOwnSynopsisCoverAndLabelsWithoutInventingCanonical()
    {
        var result = await Parse("yenpress-book");
        Assert.StartsWith("A War Without Casualties", result.Description);
        Assert.Contains("9781975303129.jpg", result.CoverUrl);
        Assert.Contains("Military", result.Tags);
        Assert.Null(result.CanonicalUrl);
        Assert.Contains(result.Warnings, warning => warning.Contains("canonical", StringComparison.OrdinalIgnoreCase));
    }

    [Theory]
    [InlineData("ranobedb-book")]
    [InlineData("sevenseas-book")]
    [InlineData("yenpress-book")]
    public async Task VolumePages_KeepVolumeTitleAndWarnInsteadOfPretendingToBeSeries(string fixture)
    {
        var result = await Parse(fixture);
        Assert.Contains("Vol.", result.PrimaryTitle);
        Assert.Contains(result.Warnings, warning => warning.Contains("volume page", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Syosetu_InformationPageReadsOwnSynopsisKeywordsAndGenreAndSkipsSocialTitleCard()
    {
        var result = await Parse("syosetu-info");
        Assert.StartsWith("３４歳", result.Description);
        Assert.Contains("R15", result.Tags);
        Assert.Contains("異世界転生", result.Tags);
        Assert.Contains("ハイファンタジー〔ファンタジー〕", result.Tags);
        Assert.Null(result.CoverUrl);
    }

    [Fact]
    public async Task Kakuyomu_UsesCurrentWorkHydrationWithoutExecutingScriptsOrSelectingRelatedNovels()
    {
        var result = await Parse("kakuyomu");
        Assert.Contains("あらすじ：新米女神", result.Description);
        Assert.Contains("異世界召喚", result.Tags);
        Assert.Contains("コメディ", result.Tags);
        Assert.Equal("https://cdn.kdkw.jp/cover_1000/322208/322208000526.jpg", result.CoverUrl);
        Assert.DoesNotContain("もう誰も死なせな異世界", result.PrimaryTitle!);
    }

    [Theory]
    [InlineData("animeplanet")]
    [InlineData("mangaupdates")]
    [InlineData("ranobedb-series")]
    [InlineData("wuxiaworld")]
    [InlineData("anilist")]
    [InlineData("jnovelclub")]
    [InlineData("sevenseas")]
    [InlineData("yenpress")]
    [InlineData("syosetu")]
    [InlineData("kakuyomu")]
    public async Task CanonicalAndOpenGraphWithoutBookMarkup_DoNotRecognizeNavigationOrChallenge(string fixture)
    {
        var document = new HtmlParser().ParseDocument(Fixture(fixture));
        var html = $"<html><head>{document.Head!.InnerHtml}</head><body><h1>Just a moment...</h1></body></html>";
        await Assert.ThrowsAsync<ValidationException>(() => Parser().ParseAsync(html, CancellationToken.None));
    }

    [Theory]
    [InlineData("animeplanet", ".tags a[href$='/light-novels']")]
    [InlineData("mangaupdates", "[data-cy='info-box-type']")]
    [InlineData("anilist", ".data-set:first-child .value")]
    public async Task MangaAdaptations_AreNotImportedAsNovels(string fixture, string selector)
    {
        var document = new HtmlParser().ParseDocument(Fixture(fixture));
        document.QuerySelector(selector)!.TextContent = "Manga";
        await Assert.ThrowsAsync<ValidationException>(() => Parser().ParseAsync(document.DocumentElement!.OuterHtml, CancellationToken.None));
    }

    [Theory]
    [InlineData("wuxiaworld")]
    [InlineData("kakuyomu")]
    public async Task InvalidEmbeddedJson_FallsBackToActualDomWithNoScriptEvaluation(string fixture)
    {
        var document = new HtmlParser().ParseDocument(Fixture(fixture));
        foreach (var script in document.QuerySelectorAll("script[type='application/ld+json'],script#__NEXT_DATA__"))
            script.TextContent = "{bad json <script>throw new Error('must not run')</script>";
        var result = await Parser().ParseAsync(document.DocumentElement!.OuterHtml, CancellationToken.None);
        Assert.NotNull(result.PrimaryTitle);
        Assert.NotNull(result.AuthorName);
        Assert.NotNull(result.Description);
        if (fixture == "kakuyomu") Assert.Contains(result.Warnings, warning => warning.Contains("JSON", StringComparison.Ordinal));
    }

    [Theory]
    [InlineData("animeplanet")]
    [InlineData("mangaupdates")]
    [InlineData("ranobedb-series")]
    [InlineData("wuxiaworld")]
    [InlineData("anilist")]
    [InlineData("jnovelclub")]
    [InlineData("sevenseas")]
    [InlineData("yenpress")]
    [InlineData("syosetu")]
    [InlineData("kakuyomu")]
    public async Task WrongCanonicalHost_DoesNotMatchEvenWithRealProviderMarkup(string fixture)
    {
        var document = new HtmlParser().ParseDocument(Fixture(fixture));
        foreach (var canonical in document.QuerySelectorAll("link[rel='canonical']")) canonical.Remove();
        foreach (var meta in document.QuerySelectorAll("meta[property='og:url']")) meta.Remove();
        var link = document.CreateElement("link");
        link.SetAttribute("rel", "canonical");
        link.SetAttribute("href", "https://unrelated.example/series/book");
        document.Head!.AppendChild(link);
        await Assert.ThrowsAsync<ValidationException>(() => Parser().ParseAsync(document.DocumentElement!.OuterHtml, CancellationToken.None));
    }
}
