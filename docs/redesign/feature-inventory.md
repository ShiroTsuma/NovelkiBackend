# Redesign feature inventory

Before a screen is rebuilt, every feature it has today is listed here. After the rebuild each item is checked:

- `[x]` kept (same behaviour, may look different)
- `[~]` changed on purpose (reason given)
- `[ ]` not done yet

Nothing may disappear without a `[~]` note.

---

## Book details (`/books/:id`) — rebuilt in 6a9ff2b

- [x] Back link returns to the exact filtered list URL (`bookListReturnTo` state)
- [x] Cover: click opens the lightbox when a cover exists; otherwise "Search cover" / "Search again" queues a cover search (not for manual uploads or URLs)
- [x] Cover status and failure hint; technical download errors are replaced by a friendly message
- [x] Cover polling every 2 s while the cover status is Pending
- [x] Cover source shown in the hover footer and lightbox. `[~]` raw enum (`ManualUpload`) is now human text ("Uploaded manually")
- [x] Content type, title, alternative titles, author
- [x] Status indicator with `aria-label="Book status: …"`
- [x] Progress: label, count, total, percentage bar. `[~]` an unknown total shows a dashed bar instead of an empty one; Completed shows "Finished" and a full green bar
- [x] Rating: ≤5 shown in red. `[~]` a single star and number instead of 10 stars
- [~] Priority: newly shown on the details page
- [x] Genres and tags with descriptions on hover or focus. `[~]` tags collapse after 14, with "Show all N tags"
- [x] Description clamped, with "Show more" / "Show less" when it overflows; line breaks preserved
- [x] Links: custom label, then source type, then hostname; open in a new tab
- [x] Notes
- [x] Progress history with deltas between entries (+n green / −n red), labels, comments and dates. `[~]` now a timeline
- [x] Log progress dialog: number validation (non-negative, no exponent, not above total), label ≤100 chars, comment ≤1000 chars, a comment-only save without changing the chapter, toast messages
- [x] Edit link keeps `bookListReturnTo`
- [x] Delete with confirmation, then return to the list. `[~]` moved from the header into a danger panel
- [x] EPUB panel: file count and size, the dialog for managing, rename, reorder, share, trash and restore, the import dialog, the ZIP or separate download dialog, and per-file download. `[~]` files are listed inline on the page; management opens directly in manage mode
- [~] Find EPUB (search and download through the crawler, currently mocked): new

## Library list (`/books`) — rebuilt (see commit after 4ab5471)

### Header and page actions
- [~] Page title: now "Library" with a live "N books match" count; the description shows only while loading
- [x] Summary toggle (lazy: the summary is fetched only when opened) with metrics (total, rated, unrated, average rating, current chapters), status, type and genre breakdowns, an empty state, and a link to analytics that carries the current query (date filters move into the from/to params)
- [x] Export menu: CSV (current filters and sort), Full backup ZIP (CSV and covers), EPUB files ZIP (export dialog with the current query). API rate-limit detail shown in a toast
- [x] Import menu: CSV, Full backup ZIP, EPUB archive (restore to existing books)
- [x] "Last import" card: imported and skipped counts, up to 10 errors and "More errors: N"
- [~] Add book: removed from the page actions, because the app header has it on every screen

### Search
- [x] Search box with syntax suggestions (fields, operators, frequency-ranked values, exclusion, the remove-token action), a clear button, the caret kept on edit, and a debounce of 220 ms
- [x] Spaces kept in the input while the API gets a trimmed query
- [x] Hint text about `:` and `-`
- [x] "Searching…" indicator while fetching

### View controls
- [x] Table / cards toggle, persisted in localStorage
- [x] Cards per row control, persisted; responsive count on small screens; card page sizes aligned to whole rows. `[~]` phones show 2 cards per row instead of 1
- [x] Column settings popup: table columns can be reordered and toggled; card fields can be toggled; popup position adapts to desktop and mobile

### Table
- [x] Sortable columns with the sort kept in the URL; status and type cycle through the domain order (advanceCycle) without an extra refetch
- [x] Columns:
  - title, with an alternative titles tooltip and "+N" (`[~]` plus a cover thumbnail, or type-coloured initials when there is no cover)
  - author, with other names
  - status (`[~]` coloured badge), type, progress (`[~]` label first, count and total after, with a bar)
  - total chapters (custom label), rating, priority
  - created, updated (`[~]` updated is date only, which makes the column narrower)
  - genres and tags (pills with descriptions and "+N omitted")
  - links count, notes, description (truncated with a title tooltip)
- [x] Actions column stays sticky on the right: View and Edit. Both remember the scroll position and the return URL
- [x] Loading and empty states ("No books match the current filters.")

### Cards
- [x] Cover thumbnail, lazy loaded
- [x] Rating overlay only when rated; ≤5 in red
- [x] Status overlay with status colours. `[~]` Completed gets a FINISHED stamp and a full green bar instead of the golden glow; every card has a progress strip
- [x] Fields: title, alternative titles, author, progress, type (each can be toggled)
- [x] Card text scales with cards per row; every card stays inside its grid track

### Paging and navigation
- [x] Page numbers with gap popovers to jump to a page (validation, focus on open, one popover at a time)
- [x] Page size select, persisted, restored after returning
- [x] Scrolls to the top of the results when the page changes near the bottom
- [x] Scroll shortcut buttons (back to top / go down)
- [x] URL state: skip, take, query, sort, direction
- [x] Scroll position restored and consumed after coming back from details or edit

### New in the redesign
- [x] Status tabs that write `status:` into the query
- [x] Quick filters that toggle syntax tokens (`rating:>=8`, `rating:none`, `total:none`, `cover:none`, `updated:<…`)
- [x] Status tabs and quick filters scroll horizontally on phones
- [x] The page grid is width-constrained, so nothing overflows the viewport on phones

Known follow-ups: the summary panel and the export and import menus still use the old component styles, mapped to the new palette.
