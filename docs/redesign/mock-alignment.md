# Mock alignment

Every element of the mock ([Novelki Redesign Mock](https://claude.ai/artifact/5dKnWe32vY5JN3p9rV17Xr)), with one decision each:

- **do**: built as in the mock
- **deviate**: built differently, for the reason given
- **later**: not built yet, needs the thing named

If a screen differs from the mock and this file doesn't say why, that's a bug.

## App shell

| Mock | Decision |
| --- | --- |
| Sticky header: brand, Library / Discover / Stats / Manage, Add book (primary) | do |
| NSFW toggle with eye icon | do |
| Search or jump (Ctrl K) | do: command palette with books (title search) and pages |
| Account menu (avatar) | do: avatar initial from the access token, menu with the account name and Log out |
| Phone bottom tab bar | do |

## Library list

| Mock | Decision |
| --- | --- |
| Serif "Library" title | do |
| Subtitle "142 books · 13 finished · 36,388 chapters read" | do: whole-library summary (plus average rating) |
| One "Import / Export" menu | do: one menu with Export and Import sections |
| Status tabs with counts and a `status:` hint | do: counts come from the summary of the query without its status token |
| Search field with token pills and a Filters / Query toggle | do: Filters shows the pills (display only, derived from the text); Query is the existing search input. The query text is the only state |
| Quick filter chips showing their syntax | do |
| "+ Save current as view" | do: views are stored in localStorage (per browser) until the API can store them |
| Result toolbar: match count, Sort menu, Table / Cards switch, column settings | do. "Open in Stats" link added next to the count (keeps the old summary-to-analytics link); cards per row next to the switch in cards view (existing feature) |
| Table title cell: cover, title link, author and alt titles | do (author keeps the other-names tooltip) |
| Status badge, Type, Progress (label first, count, bar), Rating | do |
| "Last progress" column | deviate: "Updated" (last modified), because the list API has no last-progress date |
| Row actions "Log progress" + ⋯ | do: the ⋯ menu has Open details and Edit book |
| Cards: type-coloured placeholder with a serif title, type label, rating chip, status strip, FINISHED stamp | do |
| Card footer: title, author, label + count, "Log" | do |
| Pagination: "Showing x–y", page pills, Previous / Next | do. Page size and jump-to-page stay (existing features) |
| Phone: compact rows with a log button | do (table view on phones) |
| Tablet (Galaxy Tab S10+) | do: 3 cards per row in portrait; the table keeps its columns |
