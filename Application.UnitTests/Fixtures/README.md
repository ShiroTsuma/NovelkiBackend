# HTML metadata fixtures

Captured from real public novel pages on 2026-10-10. Tests read these snapshots locally; they never request live sites.
Keep provider markup and embedded structured data intact when refreshing them. Re-run the metadata tests and review
expected title, author, aliases, taxonomy, synopsis, cover and canonical URL after any layout change.

| Fixture              | Source URL                                                                                       | Capture                                                   |
|----------------------|--------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| animeplanet.html     | https://www.anime-planet.com/manga/the-apothecary-diaries-light-novel                            | Chrome rendered DOM, after manual Cloudflare verification |
| mangaupdates.html    | https://www.mangaupdates.com/series/3uwqn6s/mushoku-tensei-dasoku-hen-novel                      | Chrome rendered DOM                                       |
| anilist.html         | https://anilist.co/manga/85470/Mushoku-Tensei-Isekai-Ittara-Honki-Dasu/                          | Chrome rendered DOM                                       |
| ranobedb-series.html | https://ranobedb.org/series/3336                                                                 | HTTP response HTML                                        |
| ranobedb-book.html   | https://ranobedb.org/book/12020                                                                  | HTTP response HTML                                        |
| wuxiaworld.html      | https://www.wuxiaworld.com/novel/against-the-gods                                                | HTTP response HTML                                        |
| jnovelclub.html      | https://j-novel.club/series/ascendance-of-a-bookworm                                             | HTTP response HTML                                        |
| sevenseas.html       | https://sevenseasentertainment.com/series/mushoku-tensei-jobless-reincarnation-light-novel/      | HTTP response HTML                                        |
| sevenseas-book.html  | https://sevenseasentertainment.com/books/mushoku-tensei-jobless-reincarnation-light-novel-vol-1/ | HTTP response HTML                                        |
| yenpress.html        | https://yenpress.com/series/86-eighty-six-light-novel                                            | HTTP response HTML                                        |
| yenpress-book.html   | https://yenpress.com/titles/9781975303129-86-eighty-six-vol-1-light-novel                        | HTTP response HTML                                        |
| syosetu.html         | https://ncode.syosetu.com/n9669bk/                                                               | HTTP response HTML                                        |
| syosetu-info.html    | https://ncode.syosetu.com/novelview/infotop/ncode/n9669bk/                                       | HTTP response HTML                                        |
| kakuyomu.html        | https://kakuyomu.jp/works/1177354054881165840                                                    | HTTP response HTML                                        |

The pre-existing royalroad.html, scribblehub.html and webnovel.html snapshots were retained.

## Parser behavior and fallbacks

- Paste full book-page HTML. For client-rendered sites such as AniList, use the loaded DOM (DevTools Elements,
  `Copy outerHTML` on the `html` element), rather than the empty initial page source. Scripts in pasted HTML are never
  executed.
- Each resolver requires source identity plus provider-specific book markup. Catalogs, challenge pages, chapter pages,
  manga adaptations and unrelated canonical hosts are rejected rather than assigned `Novel` automatically.
- Provider DOM is preferred; explicit JSON-LD/OpenGraph fallbacks are used where implemented. Missing fields produce
  warnings.
  Invalid or changed Kakuyomu hydration falls back to the DOM/catchphrase with a warning. The current work ID is used to
  select embedded data, never the first recommendation in the hydration object.
- RanobeDB, Seven Seas and Yen Press volume pages keep their volume titles and warn; they are never silently converted
  to series.
- Yen Press series pages expose a featured volume synopsis, which is deliberately skipped. Yen Press volume pages
  without
  a canonical URL still provide metadata, but no URL is guessed from recommendations.
- J-Novel Club's missing canonical is reconstructed only from the validated series heading slug.
- Seven Seas combines story/art credits; the first creator is returned with a review warning when multiple creators
  exist.
- Syosetu social previews are title cards and are skipped. Kakuyomu uses its explicit publication cover when present,
  not its generic OpenGraph title card. No cover is fabricated when one is unavailable.
- Genre/tag candidates are matched to existing library genres; remaining labels become tags. Unsupported DTO fields
  (ISBN, publication status, volume/chapter totals, illustrators, translators) are not inferred into unrelated fields.

Run `dotnet test Application.UnitTests/Application.UnitTests.csproj --filter FullyQualifiedName~BookHtmlParserTests`
to check these snapshots and the existing parsers. These tests detect layout regressions during development; they do not
constitute a scheduled live-site monitor.
