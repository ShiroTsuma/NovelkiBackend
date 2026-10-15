# Redesign feature inventory

Before a screen is rebuilt, every feature it has today is listed here. After the rebuild each item is checked:

- `[x]` kept (same behaviour, may look different)
- `[~]` changed on purpose (reason given)
- `[ ]` not done yet

Nothing may disappear without a `[~]` note.

---

## Book details (`/books/:id`) — rebuilt in 6a9ff2b

- [x] Back link returns to the exact filtered list URL (`bookListReturnTo` state)
- [x] Cover: click opens the lightbox when a cover exists; otherwise "Search cover" / "Search again" queues a cover search (not for manual uploads or URLs). `[~]` without a cover a type-coloured placeholder shows; the search is also in the ⋯ menu
- [x] Cover status and failure hint; technical download errors are replaced by a friendly message. `[~]` shown as one line under the cover (pending or failed only)
- [x] Cover polling every 2 s while the cover status is Pending
- [x] Cover source shown in the hover footer and lightbox. `[~]` raw enum (`ManualUpload`) is now human text ("Uploaded manually")
- [x] Content type, title, alternative titles, author. `[~]` the author links to the library filtered by `author:`
- [x] Status indicator with `aria-label="Book status: …"`
- [x] Progress: label, count, total, percentage bar. `[~]` an unknown total shows a dashed bar instead of an empty one; Completed shows "Finished" and a full green bar
- [x] Rating: ≤5 shown in red. `[~]` a single star and number instead of 10 stars
- [~] Priority: newly shown on the details page
- [x] Genres and tags with descriptions on hover or focus. `[~]` tags collapse after 14 ("Show all N"); chips link to the library filtered by `genre:` / `tag:`
- [x] Description clamped, with "Show more" / "Show less" when it overflows; line breaks preserved
- [x] Links: custom label, then source type, then hostname; open in a new tab
- [x] Notes
- [x] Progress history with deltas between entries (+n green / −n red), labels, comments and dates. `[~]` now a timeline
- [x] Log progress dialog: number validation (non-negative, no exponent, not above total), label ≤100 chars, comment ≤1000 chars, a comment-only save without changing the chapter, toast messages
- [x] Edit link keeps `bookListReturnTo`
- [x] Delete with confirmation, then return to the list. `[~]` in the ⋯ menu next to the actions
- [x] EPUB panel: file count and size, the dialog for managing, rename, reorder, share, trash and restore, the import dialog, the ZIP or separate download dialog, and per-file download. `[~]` files are listed inline on the page; management opens directly in manage mode
- [~] Find EPUB (search and download through the crawler, currently mocked): new. In the action row and the EPUB panel; a download sent to the background shows its progress in the panel (Details reopens it); files added in the last 7 days get a NEW badge

## Library list (`/books`) — rebuilt (see commit after 4ab5471)

### Header and page actions
- [~] Page title: now "Library" with a live "N books match" count; the description shows only while loading
- [~] Summary panel replaced: whole-library stats line under the title; per-status counts on the tabs; "Open in Stats" link keeps the query (date filters move to from/to). Status, type and genre breakdowns live on the Stats page
- [x] Export (CSV with filters and sort, Full backup ZIP, EPUB files ZIP) and Import (CSV, Full backup ZIP, EPUB archive); API rate-limit detail shown in a toast. `[~]` one "Import / Export" menu
- [x] "Last import" card: imported and skipped counts, up to 10 errors and "More errors: N"
- [~] Add book: removed from the page actions, because the app header has it on every screen

### Search
- [x] Search box with syntax suggestions (fields, operators, frequency-ranked values, exclusion, the remove-token action), a clear button, the caret kept on edit, and a debounce of 220 ms
- [x] Spaces kept in the input while the API gets a trimmed query
- [~] Hint text replaced by the Filters / Query bar and quick filters with visible syntax
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
- [x] Actions column stays sticky on the right. `[~]` "Log progress" + Edit; View is replaced by the title link. Links remember the scroll position and the return URL
- [x] Loading and empty states ("No books match the current filters.")

### Cards
- [x] Cover thumbnail, lazy loaded
- [x] Rating overlay only when rated; ≤5 in red
- [x] Status overlay with status colours. `[~]` Completed gets a FINISHED stamp and a full green bar instead of the golden glow; every card has a progress strip
- [x] Fields: title, alternative titles, author, progress, type (each can be toggled)
- [x] Card text scales with cards per row; every card stays inside its grid track

### Paging and navigation
- [x] Page numbers with gap popovers to jump to a page (validation, focus on open, one popover at a time). `[~]` First / Last arrows removed (the first and last pages are always listed); Previous / Next are text buttons
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

- [~] Default columns follow the mock: author moves into the title cell (other names tooltip kept) and tags are hidden; both stay available in column settings
- [~] Sort menu in the toolbar, alongside header sorting
- [~] Active filters shown as removable pills under the search field
- [~] Cards: type-coloured placeholder with the title in the display face; status and rating in a strip; footer with label, count and Log
- [~] Pagination shows "Showing x–y of N"; page buttons restyled

Known follow-ups: the summary panel and the export and import menus still use the old component styles, mapped to the new palette.

## Add / edit book form (`/books/new`, `/books/:id/edit`, `/admin/books/:id/edit`)

- [x] Modes: create, edit and admin edit. Back link goes to the book, the library or admin
- [x] Loads types, statuses and genres; in create mode the first type and status are preselected; focuses the title once ready
- [x] Primary title (required) with validation messages
- [x] Author combobox: debounced search (2+ characters), alias matching ("Name (Alias)"), Public/Private label, "No author found. A new one will be created.", exact match picked on blur, resolved again on save
- [x] Type and status selects, each with a description help line. `[~]` the native select is restyled with a custom chevron
- [x] Progress: current chapter (integer sanitising, required), label, total chapters (decimal, validated against current). `[~]` visible labels now read "Chapters read" and "Label in source" (aria labels unchanged)
- [x] Priority 1–5 (integer); rating as 10 stars with hover preview, click again to clear, "?/10" readout. `[~]` star colour now comes from the token
- [x] Genre chips from the dictionary; tag chips with server suggestions
- [x] Description, alternative titles (one per line), links (one URL per line), private notes
- [x] Cover: click to preview, or open the source dialog (upload JPG/PNG/WebP, or a URL); draft cover held until save; remove existing cover on save; status, source and failure info. Create mode stages the upload through the durable outbox
- [x] Parse HTML (create mode only): parse page HTML, choose fields, merge into the form, including the cover URL and canonical link. `[~]` moved into a "Fill from a page" banner
- [x] Save: create or update, with cover upload, URL or remove, plus the cover source link; toasts for added, updated and cover warnings; navigates to the book or admin
- [x] Save bar: fixed at the bottom on phones and tablets, in the side rail on desktop. `[~]` the rail is sticky on desktop, and on phones the bar sits above the tab bar
- [~] Section numbers ("01", "02", "03") hidden; section titles kept for headings and tests

- [~] Saved views (localStorage) and the Ctrl K jump palette are new
