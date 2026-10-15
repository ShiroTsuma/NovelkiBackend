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
| Search or jump (Ctrl K) | later: needs a command palette |
| Account menu (avatar) | deviate: a plain Log out button, because there is nothing else to put in a menu yet |
| Phone bottom tab bar | do |

## Library list

| Mock | Decision |
| --- | --- |
| Serif "Library" title | do |
| Subtitle "142 books · 13 finished · 36,388 chapters read" | deviate: a one-line description. The match count is in the result toolbar as in the mock. Finished and chapter totals need the summary request, which stays lazy (only when Summary is open) |
| One "Import / Export" menu | deviate: Summary, Export and Import stay as three buttons. Summary isn't in the mock but is an existing feature; each menu has three entries |
| Status tabs with a `status:` hint | do |
| Counts on the status tabs | later: needs per-status counts that ignore the status filter (a summary variant) |
| Search field with token pills inside it and a Filters / Query toggle | deviate: pills sit in a row right under the field (each removable, exclusions red), and the field shows the raw query. The suggestion, caret and quoting engine of the search box stays untouched |
| Search field look (plain field, no boxed panel) | do |
| Quick filter chips showing their syntax | do |
| "+ Save current as view" | later: needs saved views stored on the server |
| Result toolbar: match count, Sort menu, Table / Cards switch, column settings | do. Cards per row stays next to the switch in cards view (existing feature) |
| Table title cell: cover, title as a link, author and alt titles under it | do. The Author column is still available in column settings but hidden by default |
| Status badge, Type, Progress (label first, count, bar), Rating | do |
| "Last progress" column | deviate: labelled "Updated" (last modified), because the list API has no last-progress date |
| Tags column | deviate: hidden by default (mock doesn't show it); still in column settings |
| Row actions "Log progress" + ⋯ | do: "Log progress" + Edit icon. There is no ⋯ menu, because Edit would be its only entry. The eye icon is gone because the title links to the book |
| Cards: type-coloured placeholder with a serif title when there's no cover, type label, rating chip, status strip | do |
| Card footer: title, author, label + count, "Log" button | do |
| Pagination "Showing x–y", page pills, Next | do (restyled). Page size and jump-to-page stay (existing features) |
| Phone: compact list rows with a log button | later: phones currently get the cards view, 2 per row |
