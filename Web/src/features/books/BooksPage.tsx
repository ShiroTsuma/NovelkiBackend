import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Download, Edit, LayoutGrid, List, Star, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/api/client'
import { HttpError } from '@/api/http'
import type {
  BookImportFinalizeResult,
  BookListItemDto,
  BookSummaryDto,
  BookSummaryTypeCountDto,
} from '@/api/types'
import { extractAnalyticsDateFilters } from '@/features/analytics/dateQueryFilters'
import { inputClass, secondaryButtonClass } from '@/components/app/designTokens'
import { Surface } from '@/components/app/DesignSystem'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { cn } from '@/lib/utils'
import { BookDataTable } from './BookDataTable'
import { isLowRating } from './bookRating'
import { BookSearchInput } from './BookSearchInput'
import { CardCover, CoverThumb, ProgressCell, RatingCell, StatusCell } from './BookListCells'
import { ProgressDialog } from './ProgressDialog'
import { getStatusTone, statusToneClasses } from './bookStatus'
import { ActiveFilterPills, QuickFilters, SortMenu, StatusTabs } from './BookListControls'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { formatProgress } from './bookProgress'
import { saveBookListScrollPosition, takeBookListScrollPosition } from './bookListNavigation'
import { ColumnSettingsPopup, TotalChaptersColumnLabel } from './bookListColumns'
import {
  getVisibleColumns,
  useColumnPreferences,
  useViewMode,
  type BookViewMode,
  type ColumnDefinition,
} from './columnPreferences'
import { BookListFooter, ScrollShortcutButtons } from './BookListShared'
import {
  bookListPageSizeOptions,
  getNextSortDirection,
  useBookListPagination,
  useBookListScrollShortcuts,
  useBookListUrlState,
} from './bookListState'
import {
  cardsPerRowOptions,
  getCardDetailRowClass,
  getCardPageSizeOptions,
  getCardRowMinHeightClasses,
  getCardTextSizeClasses,
  getClosestPageSize,
  getDesktopCardsPerRowClass,
  useCardsPerRow,
  useResponsiveCardsPerRow,
} from './bookCardLayout'
import {
  formatAverageRating,
  formatBookCount,
  formatChapterCount,
  formatDate,
} from './bookFormatters'
import { ImportBooksDialog } from './ImportBooksDialog'
import { FileImportDialog } from './files/FileImportDialog'
import { FileExportDialog } from './files/FileExportDialog'
import { DescribedMetadataPills, MetadataSummary } from './MetadataBadges'

const bookColumnsStorageKey = 'novelki.books.columns.v1'
const bookCardFieldsStorageKey = 'novelki.books.card-fields.v1'
const bookLayoutStorageKey = 'novelki.books.layout.v1'
const cardsPerRowStorageKey = 'novelki.books.cards-per-row.v1'
const pageSizeStorageKey = 'novelki.books.page-size.v1'
const topActionButtonSpacingClass = 'gap-2.5 pl-3.5 pr-4'
const bookSearchDelayMs = 220

const bookColumns: ColumnDefinition<BookListItemDto>[] = [
  {
    id: 'title',
    label: 'Title',
    defaultVisible: true,
    sortBy: 'title',
    widthClass: 'w-80',
    render: (book) => <TitleCell book={book} />,
  },
  {
    id: 'author',
    label: 'Author',
    defaultVisible: false,
    sortBy: 'author',
    widthClass: 'w-40',
    render: (book) => <AuthorCell book={book} />,
  },
  {
    id: 'status',
    label: 'Status',
    defaultVisible: true,
    sortBy: 'status',
    widthClass: 'w-36',
    render: (book) => <StatusCell status={book.status} />,
  },
  {
    id: 'type',
    label: 'Type',
    defaultVisible: true,
    sortBy: 'type',
    widthClass: 'w-20',
    render: (book) => book.contentType,
  },
  {
    id: 'progress',
    label: 'Progress',
    defaultVisible: true,
    sortBy: 'progress',
    widthClass: 'w-48',
    render: (book) => <ProgressCell book={book} />,
  },
  {
    id: 'totalChapters',
    label: <TotalChaptersColumnLabel />,
    defaultVisible: false,
    sortBy: 'chapters',
    widthClass: 'w-28',
    render: (book) => book.totalChapters ?? '-',
  },
  {
    id: 'rating',
    label: 'Rating',
    defaultVisible: true,
    sortBy: 'rating',
    widthClass: 'w-16',
    render: (book) => <RatingCell rating={book.rating} />,
  },
  {
    id: 'priority',
    label: 'Priority',
    defaultVisible: false,
    sortBy: 'priority',
    widthClass: 'w-20',
    render: (book) => book.priority ?? '-',
  },
  {
    id: 'created',
    label: 'Created',
    defaultVisible: false,
    sortBy: 'created',
    widthClass: 'w-40',
    render: (book) => formatDate(book.created),
  },
  {
    id: 'lastModified',
    label: 'Updated',
    defaultVisible: true,
    sortBy: 'lastModified',
    widthClass: 'w-28',
    render: (book) => formatShortDate(book.lastModified || book.created),
  },
  {
    id: 'genres',
    label: 'Genres',
    defaultVisible: false,
    widthClass: 'w-40',
    render: (book) => (
      <DescribedMetadataPills
        descriptions={book.genreDescriptions}
        totalCount={book.genresCount}
        values={book.genres}
      />
    ),
  },
  {
    id: 'tags',
    label: 'Tags',
    defaultVisible: false,
    widthClass: 'w-40',
    render: (book) => (
      <DescribedMetadataPills
        descriptions={book.tagDescriptions}
        totalCount={book.tagsCount}
        values={book.tags}
      />
    ),
  },
  {
    id: 'links',
    label: 'Links',
    defaultVisible: false,
    widthClass: 'w-16',
    render: (book) => book.linksCount,
  },
  {
    id: 'notes',
    label: 'Notes',
    defaultVisible: false,
    widthClass: 'w-56',
    render: (book) => <TruncatedCellText value={book.notes} />,
  },
  {
    id: 'description',
    label: 'Description',
    defaultVisible: false,
    widthClass: 'w-56',
    render: (book) => <TruncatedCellText value={book.description} />,
  },
]

const bookCardFields: ColumnDefinition<BookListItemDto>[] = [
  {
    id: 'title',
    label: 'Title',
    defaultVisible: true,
    render: (book) => <span>{book.primaryTitle}</span>,
  },
  {
    id: 'alternativeTitles',
    label: 'Alternative titles',
    defaultVisible: false,
    render: (book) => <span>{formatList(book.alternativeTitles)}</span>,
  },
  {
    id: 'author',
    label: 'Author',
    defaultVisible: true,
    render: (book) => <span>{book.author ?? 'Unknown author'}</span>,
  },
  {
    id: 'status',
    label: 'Status',
    defaultVisible: true,
    render: (book) => <span>{book.status}</span>,
  },
  {
    id: 'type',
    label: 'Type',
    defaultVisible: false,
    render: (book) => <span>{book.contentType}</span>,
  },
  {
    id: 'progress',
    label: 'Progress',
    defaultVisible: true,
    render: (book) => <span>{formatProgress(book)}</span>,
  },
  {
    id: 'rating',
    label: 'Rating',
    defaultVisible: true,
    render: (book) => <span>{book.rating ?? '-'}</span>,
  },
]

export function BooksPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const restoredScrollPosition = useRef(false)
  const queryClient = useQueryClient()
  const [columnPreferences, setColumnPreferences] = useColumnPreferences(
    bookColumnsStorageKey,
    bookColumns,
  )
  const [cardFieldPreferences, setCardFieldPreferences] = useColumnPreferences(
    bookCardFieldsStorageKey,
    bookCardFields,
  )
  const [viewMode, setViewMode] = useViewMode(bookLayoutStorageKey)
  const [cardsPerRow, setCardsPerRow] = useCardsPerRow(cardsPerRowStorageKey)
  const effectiveCardsPerRow = useResponsiveCardsPerRow(cardsPerRow)
  const [lastImportResult, setLastImportResult] = useState<BookImportFinalizeResult | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importMenuOpen, setImportMenuOpen] = useState(false)
  const [epubExportOpen, setEpubExportOpen] = useState(false)
  const [epubImportOpen, setEpubImportOpen] = useState(false)
  const [importMode, setImportMode] = useState<'csv' | 'full'>('csv')
  const [summaryOpen, setSummaryOpen] = useState(false)
  const pageSizeOptions =
    viewMode === 'cards' ? getCardPageSizeOptions(effectiveCardsPerRow) : bookListPageSizeOptions
  const {
    pageSize: requestedPageSize,
    query,
    requestQuery,
    setPageSize,
    setSkip,
    setSort: setSortParams,
    skip,
    sortBy,
    sortDirection,
    updateQuery,
  } = useBookListUrlState(searchParams, setSearchParams, { pageSizeStorageKey })
  const pageSize = getClosestPageSize(requestedPageSize, pageSizeOptions)
  const debouncedRequestQuery = useDebouncedValue(requestQuery, bookSearchDelayMs)
  const isWaitingForSearch = debouncedRequestQuery !== requestQuery

  useEffect(() => {
    if (pageSize !== requestedPageSize) {
      setPageSize(String(pageSize))
    }
  }, [pageSize, requestedPageSize, setPageSize])

  const visibleColumns = getVisibleColumns(bookColumns, columnPreferences)
  const visibleCardFields = getVisibleColumns(bookCardFields, cardFieldPreferences)
  const booksQuery = useQuery({
    queryKey: ['books', skip, pageSize, debouncedRequestQuery, sortBy, sortDirection],
    queryFn: ({ signal }) =>
      api.getBooks({
        skip,
        take: pageSize,
        query: debouncedRequestQuery,
        sortBy,
        sortDirection,
        signal,
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
  const summaryQuery = useQuery({
    queryKey: ['books-summary', debouncedRequestQuery],
    queryFn: () => api.getBooksSummary({ query: debouncedRequestQuery }),
    enabled: summaryOpen,
    staleTime: 30_000,
  })
  const cycleSortMutation = useMutation({
    mutationFn: ({
      nextSortBy,
      currentSortDirection,
    }: {
      nextSortBy: string
      currentSortDirection: string | null
    }) =>
      api.getBooks({
        skip,
        take: pageSize,
        query: requestQuery,
        sortBy: nextSortBy,
        ...(currentSortDirection != null ? { sortDirection: currentSortDirection } : {}),
        advanceCycle: true,
      }),
    onSuccess: (result, variables) => {
      const resolvedSortDirection =
        getCyclicSortDirectionFromResult(result.data, variables.nextSortBy) ??
        variables.currentSortDirection ??
        sortDirection
      queryClient.setQueryData(
        ['books', skip, pageSize, requestQuery, variables.nextSortBy, resolvedSortDirection],
        result,
      )

      setSortParams(variables.nextSortBy, resolvedSortDirection)
    },
  })
  const exportMutation = useMutation({
    mutationFn: () => api.downloadBooksExport({ query: requestQuery, sortBy, sortDirection }),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'books-export.csv'
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Export ready.')
    },
    onError: (error) => {
      toast.error(error instanceof HttpError ? error.apiError.detail : 'Could not export books.')
    },
  })

  useEffect(() => {
    if (restoredScrollPosition.current || !booksQuery.data) {
      return
    }

    restoredScrollPosition.current = true
    const scrollY = takeBookListScrollPosition(`${location.pathname}${location.search}`)
    if (scrollY !== null) {
      window.scrollTo({ top: scrollY, behavior: 'auto' })
    }
  }, [booksQuery.data, location.pathname, location.search])
  const fullExportMutation = useMutation({
    mutationFn: () => api.downloadBooksFullExport({ query: requestQuery, sortBy, sortDirection }),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'books-full-export.zip'
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Full backup ready.')
    },
    onError: (error) => {
      toast.error(
        error instanceof HttpError ? error.apiError.detail : 'Could not export the full backup.',
      )
    },
  })
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  function setSort(nextSortBy: string) {
    if (isCyclicSort(nextSortBy)) {
      cycleSortMutation.mutate({
        nextSortBy,
        currentSortDirection: sortBy === nextSortBy ? sortDirection : null,
      })
      return
    }

    const nextDirection = getNextSortDirection(nextSortBy, sortBy, sortDirection)
    setSortParams(nextSortBy, nextDirection)
  }

  const total = booksQuery.data?.total ?? 0
  const pagination = useBookListPagination({
    pageSize,
    scrollTargetId: 'book-list-results',
    setSkip,
    skip,
    total,
  })
  const scrollShortcuts = useBookListScrollShortcuts()
  const settingsColumns = viewMode === 'cards' ? bookCardFields : bookColumns
  const settingsPreferences = viewMode === 'cards' ? cardFieldPreferences : columnPreferences
  const setSettingsPreferences =
    viewMode === 'cards' ? setCardFieldPreferences : setColumnPreferences
  const settingsTitle = viewMode === 'cards' ? 'Visible card fields' : 'Visible columns'
  const settingsDescription =
    viewMode === 'cards'
      ? 'Choose which book fields appear on cards.'
      : 'Change table order and visibility.'
  const allowSettingsReorder = viewMode === 'table'

  function handleImportComplete(result: BookImportFinalizeResult) {
    setLastImportResult(result)
    void booksQuery.refetch()
    toast.success(`Imported ${result.importedCount} books. Skipped ${result.skippedCount}.`)
  }

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="m-0 font-display text-[40px] leading-tight font-bold tracking-tight">
            Library
          </h1>
          <p className="m-0 mt-1.5 text-[15px] text-ink-2 tabular-nums">
            Search with the filter syntax, switch status with the tabs, log progress from any row.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <>
            <button
              aria-controls="books-summary-panel"
              aria-expanded={summaryOpen}
              className={`${secondaryButtonClass} ${topActionButtonSpacingClass}`}
              type="button"
              onClick={() => setSummaryOpen((current) => !current)}
            >
              <span>Summary</span>
              <ChevronDown className={`h-4 w-4 transition ${summaryOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className="relative">
              <button
                aria-expanded={exportMenuOpen}
                aria-haspopup="menu"
                className={`${secondaryButtonClass} ${topActionButtonSpacingClass}`}
                type="button"
                onClick={() => {
                  setImportMenuOpen(false)
                  setExportMenuOpen((current) => !current)
                }}
              >
                <Download className="h-4 w-4" />
                Export
                <ChevronDown
                  className={`h-4 w-4 transition ${exportMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {exportMenuOpen ? (
                <div
                  className="ui-popover absolute right-0 z-20 mt-2 grid min-w-56 overflow-hidden p-1"
                  role="menu"
                >
                  <button
                    className="rounded-[var(--qs-control-radius)] px-3 py-2 text-left text-sm font-semibold text-[var(--qs-text)] hover:bg-[var(--qs-surface-muted)] disabled:opacity-60"
                    disabled={exportMutation.isPending}
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false)
                      exportMutation.mutate()
                    }}
                  >
                    {exportMutation.isPending ? 'Exporting CSV...' : 'CSV'}
                    <span className="mt-0.5 block text-xs font-normal text-[var(--qs-muted)]">
                      Books matching the current filters
                    </span>
                  </button>
                  <button
                    className="rounded-[var(--qs-control-radius)] px-3 py-2 text-left text-sm font-semibold text-[var(--qs-text)] hover:bg-[var(--qs-surface-muted)] disabled:opacity-60"
                    disabled={fullExportMutation.isPending}
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false)
                      fullExportMutation.mutate()
                    }}
                  >
                    {fullExportMutation.isPending ? 'Creating full backup...' : 'Full backup (ZIP)'}
                    <span className="mt-0.5 block text-xs font-normal text-[var(--qs-muted)]">
                      CSV plus stored cover files; EPUBs exported separately
                    </span>
                  </button>
                  <button
                    className="px-3 py-3 text-left text-sm font-semibold hover:bg-[var(--qs-surface-muted)]"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setExportMenuOpen(false)
                      setEpubExportOpen(true)
                    }}
                  >
                    EPUB files (ZIP)
                    <span className="mt-0.5 block text-xs font-normal text-[var(--qs-muted)]">
                      Choose books and files; includes a restore manifest
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
            <div className="relative">
              <button
                aria-expanded={importMenuOpen}
                aria-haspopup="menu"
                className={`${secondaryButtonClass} ${topActionButtonSpacingClass}`}
                type="button"
                onClick={() => {
                  setExportMenuOpen(false)
                  setImportMenuOpen((current) => !current)
                }}
              >
                <Upload className="h-4 w-4" />
                Import
                <ChevronDown
                  className={`h-4 w-4 transition ${importMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {importMenuOpen ? (
                <div
                  className="ui-popover absolute right-0 z-20 mt-2 grid min-w-56 overflow-hidden p-1"
                  role="menu"
                >
                  <button
                    className="rounded-[var(--qs-control-radius)] px-3 py-2 text-left text-sm font-semibold text-[var(--qs-text)] hover:bg-[var(--qs-surface-muted)]"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setImportMenuOpen(false)
                      setImportMode('csv')
                      setImportDialogOpen(true)
                    }}
                  >
                    CSV
                    <span className="mt-0.5 block text-xs font-normal text-[var(--qs-muted)]">
                      Import book data from a CSV file
                    </span>
                  </button>
                  <button
                    className="rounded-[var(--qs-control-radius)] px-3 py-2 text-left text-sm font-semibold text-[var(--qs-text)] hover:bg-[var(--qs-surface-muted)]"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setImportMenuOpen(false)
                      setImportMode('full')
                      setImportDialogOpen(true)
                    }}
                  >
                    Full backup (ZIP)
                    <span className="mt-0.5 block text-xs font-normal text-[var(--qs-muted)]">
                      Restore book data and stored covers
                    </span>
                  </button>
                  <button
                    className="px-3 py-3 text-left text-sm font-semibold hover:bg-[var(--qs-surface-muted)]"
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setImportMenuOpen(false)
                      setEpubImportOpen(true)
                    }}
                  >
                    EPUB archive
                    <span className="mt-0.5 block text-xs font-normal text-[var(--qs-muted)]">
                      Restore EPUBs to existing books
                    </span>
                  </button>
                </div>
              ) : null}
            </div>
          </>
        </div>
      </div>

      {lastImportResult ? (
        <Surface className="grid gap-2 p-4">
          <div className="text-sm font-semibold text-slate-950">Last import</div>
          <p className="text-sm text-slate-600">
            Imported: {lastImportResult.importedCount}. Skipped: {lastImportResult.skippedCount}.
          </p>
          {lastImportResult.errors.length ? (
            <div className="grid gap-1 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              {lastImportResult.errors.slice(0, 10).map((error) => (
                <p key={error}>{error}</p>
              ))}
              {lastImportResult.errors.length > 10 ? (
                <p>More errors: {lastImportResult.errors.length - 10}</p>
              ) : null}
            </div>
          ) : null}
        </Surface>
      ) : null}

      {summaryOpen ? (
        <BookSummaryPanel
          analyticsHref={buildAnalyticsHref(requestQuery)}
          id="books-summary-panel"
          isError={summaryQuery.isError}
          isLoading={summaryQuery.isLoading}
          summary={summaryQuery.data}
        />
      ) : null}

      <StatusTabs query={query} onQueryChange={updateQuery} />

      <div className="grid gap-2.5">
        <BookSearchInput
          appearance="compact"
          showHelp={false}
          value={query}
          onChange={updateQuery}
        />
        <ActiveFilterPills query={query} onQueryChange={updateQuery} />
        <QuickFilters query={query} onQueryChange={updateQuery} />
      </div>

      <section
        aria-label="Books"
        className="min-w-0 overflow-hidden rounded-panel border border-line bg-sunk"
        id="book-list-results"
      >
        <div className="flex flex-wrap items-center justify-end gap-2 border-b border-line px-4 py-3">
          <span className="mr-auto text-ink-2 tabular-nums" role="status">
            {(isWaitingForSearch || booksQuery.isFetching || cycleSortMutation.isPending) &&
            !booksQuery.isLoading
              ? 'Searching...'
              : booksQuery.data
                ? `${formatBookCount(total)} ${total === 1 ? 'book matches' : 'books match'}`
                : ''}
          </span>
          <SortMenu
            sortBy={sortBy}
            onSortChange={(option) => {
              if (option.direction === null) {
                setSort(option.sortBy)
                return
              }
              setSortParams(option.sortBy, option.direction)
            }}
          />
          {viewMode === 'cards' ? (
            <CardsPerRowControl value={cardsPerRow} onChange={setCardsPerRow} />
          ) : null}
          <ViewModeToggle value={viewMode} onChange={setViewMode} />
          <ColumnSettingsPopup
            allowReorder={allowSettingsReorder}
            columns={settingsColumns}
            description={settingsDescription}
            preferences={settingsPreferences}
            title={settingsTitle}
            onChange={setSettingsPreferences}
          />
        </div>
        {viewMode === 'table' ? (
          <BookDataTable
            columns={visibleColumns}
            emptyMessage="No books match the current filters."
            actionsWidthRem={11}
            isCyclicSort={isCyclicSort}
            isLoading={booksQuery.isLoading}
            items={booksQuery.data?.data ?? []}
            renderActions={(book) => (
              <div className="flex justify-end gap-2">
                <ProgressDialog book={book} triggerSize="sm" triggerVariant="secondary" />
                <BookEditLink
                  ariaLabel={`Edit ${book.primaryTitle}`}
                  bookId={book.id}
                  className={buttonStyles({ variant: 'outline', size: 'iconSm' })}
                >
                  <Edit aria-hidden="true" className="size-4" />
                </BookEditLink>
              </div>
            )}
            sortBy={sortBy}
            sortDirection={sortDirection}
            wrapperClassName="w-full overflow-x-auto"
            onSort={setSort}
          />
        ) : (
          <BookCardGrid
            books={booksQuery.data?.data ?? []}
            cardsPerRow={effectiveCardsPerRow}
            fields={visibleCardFields}
            isLoading={booksQuery.isLoading}
          />
        )}
        <BookListFooter
          activePageGapId={pagination.activePageGapId}
          canGoBack={pagination.canGoBack}
          canGoForward={pagination.canGoForward}
          currentPage={pagination.currentPage}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          setActivePageGapId={pagination.setActivePageGapId}
          setPageSize={setPageSize}
          skip={skip}
          total={total}
          totalPages={pagination.totalPages}
          visiblePages={pagination.visiblePages}
          onGoToPage={pagination.onGoToPage}
        />
      </section>
      {epubExportOpen && (
        <FileExportDialog query={requestQuery} onClose={() => setEpubExportOpen(false)} />
      )}
      {epubImportOpen && (
        <FileImportDialog
          onClose={() => setEpubImportOpen(false)}
          onImported={() => {
            void queryClient.invalidateQueries({ queryKey: ['book-files'] })
          }}
        />
      )}
      <ImportBooksDialog
        mode={importMode}
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImported={handleImportComplete}
      />
      <ScrollShortcutButtons
        showBackToTop={scrollShortcuts.showBackToTop}
        showGoDown={scrollShortcuts.showGoDown}
        onBackToTop={scrollShortcuts.scrollBackToTop}
        onGoDown={scrollShortcuts.scrollToPageBottom}
      />
    </div>
  )
}

function CardsPerRowControl({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="hidden items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 lg:flex">
      <span>Cards / row</span>
      <span className="relative inline-flex">
        <select
          aria-label="Cards per row"
          className={`${inputClass} ui-control--compact-select bg-white text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white focus:bg-white`}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        >
          {cardsPerRowOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </span>
    </label>
  )
}

export function ViewModeToggle({
  value,
  onChange,
}: {
  value: BookViewMode
  onChange: (value: BookViewMode) => void
}) {
  return (
    <div className="flex gap-0.5 rounded-field border border-line bg-surface p-[3px]">
      {(
        [
          ['table', 'Table', List],
          ['cards', 'Cards', LayoutGrid],
        ] as const
      ).map(([mode, label, Icon]) => (
        <button
          aria-pressed={value === mode}
          className={cn(
            'flex h-8 items-center gap-1.5 rounded-[7px] border-0 px-3 text-sm',
            value === mode
              ? 'bg-selected font-semibold text-ink'
              : 'bg-transparent font-medium text-ink-2 hover:text-ink',
          )}
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
        >
          <Icon aria-hidden="true" className="size-4" />
          {label}
        </button>
      ))}
    </div>
  )
}

export function BookAdvancedSearch({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <BookSearchInput
      placeholder={'Search: returnee author:Toika genre:fantasy rating:>=8 -tag:dropped -rating:8'}
      remoteSuggestionsEnabled={false}
      value={value}
      onChange={onChange}
    />
  )
}

function BookSummaryPanel({
  analyticsHref,
  id,
  isError,
  isLoading,
  summary,
}: {
  analyticsHref: string
  id: string
  isError: boolean
  isLoading: boolean
  summary: BookSummaryDto | undefined
}) {
  if (isLoading) {
    return (
      <Surface className="grid gap-3 p-4" id={id}>
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Library summary</h2>
          <p className="text-sm text-slate-500">Loading summary...</p>
        </div>
      </Surface>
    )
  }

  if (isError) {
    return (
      <Surface className="grid gap-3 p-4" id={id} tone="danger">
        <div>
          <h2 className="text-sm font-semibold text-rose-950">Library summary</h2>
          <p className="text-sm text-rose-800">Could not load summary.</p>
        </div>
      </Surface>
    )
  }

  if (!summary) {
    return null
  }

  return (
    <Surface className="grid gap-4 p-4" id={id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Library summary</h2>
          <p className="text-sm text-slate-500">
            Aggregated from all books matching the current filters.
          </p>
        </div>
        <Link
          className={`${secondaryButtonClass} ${topActionButtonSpacingClass}`}
          to={analyticsHref}
        >
          Open analytics
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <SummaryMetricCard label="Total books" value={formatBookCount(summary.totalBooks)} />
        <SummaryMetricCard label="Rated" value={formatBookCount(summary.ratedBooks)} />
        <SummaryMetricCard label="Unrated" value={formatBookCount(summary.unratedBooks)} />
        <SummaryMetricCard
          label="Average rating"
          value={formatAverageRating(summary.averageRating)}
        />
        <SummaryMetricCard
          label="Current chapters"
          value={formatChapterCount(summary.currentChapters)}
        />
      </div>
      {summary.totalBooks === 0 ? (
        <Surface as="div" className="px-4 py-3 text-sm text-slate-600" tone="muted">
          No books match the current filters.
        </Surface>
      ) : (
        <Surface as="div" className="grid gap-4 p-4" tone="muted">
          <div className="grid gap-4 xl:grid-cols-2">
            <SummaryCompactSection
              title="Status distribution"
              items={summary.statusCounts.map((status) => ({
                label: status.status,
                value: formatBookCount(status.count),
              }))}
            />
            <SummaryCompactTypeSection items={summary.typeCounts} />
          </div>
        </Surface>
      )}
    </Surface>
  )
}

function SummaryMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Surface as="div" className="px-4 py-3" tone="elevated">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-950">{value}</div>
    </Surface>
  )
}

function SummaryCompactSection({
  items,
  title,
}: {
  items: { label: string; value: string }[]
  title: string
}) {
  return (
    <Surface as="div" className="p-4">
      <div className="mb-3 text-sm font-semibold text-slate-950">{title}</div>
      <SummaryCountList items={items} />
    </Surface>
  )
}

function SummaryCountList({ items }: { items: { label: string; value: string }[] }) {
  if (!items.length) {
    return <div className="text-sm text-slate-500">No data for this tab.</div>
  }

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div
          className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          key={item.label}
        >
          <span className="font-medium text-slate-700">{item.label}</span>
          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function SummaryCompactTypeSection({ items }: { items: BookSummaryTypeCountDto[] }) {
  return (
    <Surface as="div" className="p-4">
      <div className="mb-3 text-sm font-semibold text-slate-950">Book types</div>
      <SummaryTypeDetails items={items} />
    </Surface>
  )
}

function SummaryTypeDetails({ items }: { items: BookSummaryTypeCountDto[] }) {
  if (!items.length) {
    return <div className="text-sm text-slate-500">No type data for this filter.</div>
  }

  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3" key={item.type}>
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold text-slate-950">{item.type}</div>
            <div className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
              {formatBookCount(item.bookCount)} books
            </div>
          </div>
          <div className="mt-2 text-sm text-slate-600">
            Current chapters: {formatChapterCount(item.currentChapters)}
          </div>
        </div>
      ))}
    </div>
  )
}

function BookCardGrid({
  books,
  cardsPerRow,
  fields,
  isLoading,
}: {
  books: BookListItemDto[]
  cardsPerRow: number
  fields: ColumnDefinition<BookListItemDto>[]
  isLoading: boolean
}) {
  if (isLoading) {
    return <div className="px-4 py-8 text-center text-ink-3">Loading...</div>
  }

  if (!books.length) {
    return (
      <div className="px-4 py-8 text-center text-ink-3">No books match the current filters.</div>
    )
  }

  const cardText = getCardTextSizeClasses(cardsPerRow)
  const cardRowMinHeights = getCardRowMinHeightClasses(cardsPerRow)
  const showTitle = hasCardField(fields, 'title')
  const showAlternativeTitles = hasCardField(fields, 'alternativeTitles')
  const showAuthor = hasCardField(fields, 'author')
  const showProgress = hasCardField(fields, 'progress')
  const showType = hasCardField(fields, 'type')
  const showStatus = hasCardField(fields, 'status')
  const showRating = hasCardField(fields, 'rating')
  const cardDetailsClass = getCardDetailRowClass({
    cardsPerRow,
    showAlternativeTitles,
    showAuthor,
    showProgress,
    showTitle,
    showType,
  })

  return (
    <div
      className={`book-card-grid grid min-w-0 grid-cols-2 gap-x-5 gap-y-7 p-4 ${getDesktopCardsPerRowClass(cardsPerRow)}`}
    >
      {books.map((book) => {
        const finished = isCompletedStatus(book.status)
        const tone = getStatusTone(book.status)
        const rated = showRating && book.rating != null
        const low = book.rating != null && isLowRating(book.rating)
        return (
          <article
            className={cn(
              'book-card flex min-w-0 w-full max-w-full flex-col gap-2.5',
              finished && 'book-card--completed',
            )}
            data-status-tone={tone}
            key={book.id}
          >
            <BookDetailsLink
              ariaLabel={book.primaryTitle}
              bookId={book.id}
              className="group relative block w-full max-w-full min-w-0 overflow-hidden rounded-[10px]"
            >
              <CardCover book={book} />
              {finished ? (
                <span className="pointer-events-none absolute top-4 -right-1 rotate-[8deg] rounded border-2 border-status-finished bg-ground/85 px-2.5 py-1 text-xs font-bold tracking-[0.12em] text-status-finished-ink">
                  FINISHED
                </span>
              ) : null}
              {showStatus || rated ? (
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-ground/80 px-2.5 py-2 text-xs backdrop-blur">
                  {showStatus ? (
                    <span className="flex min-w-0 items-center gap-1.5 font-semibold text-ink">
                      <span
                        aria-hidden="true"
                        className={cn(
                          'size-1.5 shrink-0 rounded-full',
                          statusToneClasses[tone].bar,
                        )}
                      />
                      <span aria-label={`Book status: ${book.status}`} className="truncate">
                        {book.status}
                      </span>
                    </span>
                  ) : (
                    <span />
                  )}
                  {rated ? (
                    <span
                      aria-label={`Rating ${book.rating} out of 10`}
                      className={cn(
                        'book-card-rating inline-flex shrink-0 items-center gap-1 font-semibold tabular-nums',
                        low ? 'book-card-rating--low text-danger-ink' : 'text-star',
                      )}
                    >
                      <Star
                        aria-hidden="true"
                        className={cn(
                          'book-card-rating__star size-3',
                          low ? 'fill-danger text-danger' : 'fill-star text-star',
                        )}
                      />
                      {book.rating}
                    </span>
                  ) : null}
                </span>
              ) : null}
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-white/10">
                <span
                  className={cn('block h-full', statusToneClasses[tone].bar)}
                  style={{ width: `${getProgressPercent(book) ?? 0}%` }}
                />
              </span>
            </BookDetailsLink>
            <div className={`grid min-w-0 max-w-full gap-0.5 overflow-hidden ${cardDetailsClass}`}>
              {showTitle ? (
                <div className="min-h-10 min-w-0 max-w-full overflow-hidden">
                  <h2
                    className={`m-0 line-clamp-2 min-w-0 max-w-full font-sans leading-snug font-semibold break-words text-ink ${cardText.title}`}
                    title={book.primaryTitle}
                  >
                    <BookDetailsLink
                      bookId={book.id}
                      className="text-ink hover:text-ink hover:underline hover:underline-offset-4"
                    >
                      {book.primaryTitle}
                    </BookDetailsLink>
                  </h2>
                </div>
              ) : null}
              {showAlternativeTitles ? (
                <div className="min-h-10 min-w-0 max-w-full overflow-hidden">
                  <p
                    className={`m-0 line-clamp-2 min-w-0 max-w-full break-words text-ink-3 ${cardText.meta}`}
                    title={formatListTooltip(book.alternativeTitles, book.alternativeTitlesCount)}
                  >
                    {formatList(book.alternativeTitles)}
                  </p>
                </div>
              ) : null}
              {showAuthor || showType ? (
                <div
                  className={`flex min-w-0 max-w-full gap-1.5 overflow-hidden ${cardRowMinHeights.author}`}
                >
                  {showAuthor ? (
                    <p
                      className={`m-0 min-w-0 truncate text-ink-2 ${cardText.meta}`}
                      title={book.author ?? 'Unknown author'}
                    >
                      {book.author ?? 'Unknown author'}
                    </p>
                  ) : null}
                  {showType ? (
                    <p
                      className={`m-0 shrink-0 truncate text-ink-3 ${cardText.meta}`}
                      title={book.contentType}
                    >
                      {showAuthor ? '· ' : ''}
                      {book.contentType}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
            {showProgress ? (
              <div
                className={`mt-auto flex min-w-0 items-center justify-between gap-2 ${cardRowMinHeights.progress}`}
              >
                <div className="min-w-0 tabular-nums">
                  <div
                    className={cn(
                      `truncate font-semibold ${cardText.meta}`,
                      finished ? 'text-status-finished-ink' : 'text-ink',
                    )}
                    title={formatProgress(book)}
                  >
                    {finished ? 'Finished' : getCardProgressLabel(book)}
                  </div>
                  <div className="truncate text-xs text-ink-3">{getCardProgressCount(book)}</div>
                </div>
                {finished ? null : (
                  <ProgressDialog
                    book={book}
                    triggerLabel="Log"
                    triggerSize="sm"
                    triggerVariant="secondary"
                  />
                )}
              </div>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}

function getCardProgressLabel(book: BookListItemDto) {
  const label =
    book.currentChapterLabel ??
    (book.currentChapterNumber != null ? String(book.currentChapterNumber) : null)
  return label ? `Ch. ${label}` : 'Not started'
}

function getCardProgressCount(book: BookListItemDto) {
  const format = new Intl.NumberFormat('en-US')
  const current = book.currentChapterNumber
  const total = book.totalChapters
  if (typeof current !== 'number')
    return typeof total === 'number' ? `${format.format(total)} chapters` : ''
  if (typeof total === 'number') return `${format.format(current)} / ${format.format(total)}`
  return `${format.format(current)} read`
}

function getProgressPercent(book: BookListItemDto) {
  if (isCompletedStatus(book.status)) return 100
  const current = book.currentChapterNumber
  const total = book.totalChapters
  if (typeof current !== 'number' || typeof total !== 'number' || total <= 0) return null
  return Math.min(100, (current / total) * 100)
}

function hasCardField(fields: ColumnDefinition<BookListItemDto>[], id: string) {
  return fields.some((field) => field.id === id)
}

function TitleCell({ book }: { book: BookListItemDto }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <CoverThumb book={book} />
      <div className="min-w-0 flex-1">
        <BookDetailsLink
          bookId={book.id}
          className="block min-w-0 truncate text-[15px] font-semibold text-ink hover:text-ink hover:underline hover:decoration-line-focus hover:underline-offset-4"
        >
          {book.primaryTitle}
        </BookDetailsLink>
        <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] text-ink-2">
          <MetadataSummary
            alternatives={book.authorOtherNames}
            countNoun="alternative name"
            primary={book.author ?? 'Unknown author'}
            primaryClassName="block min-w-0 truncate"
          />
          {book.alternativeTitlesCount > 0 ? (
            <MetadataSummary
              alternatives={book.alternativeTitles}
              countNoun="alternative title"
              primary=""
              primaryClassName="hidden"
              totalCount={book.alternativeTitlesCount}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}

function BookDetailsLink({
  ariaLabel,
  bookId,
  children,
  className,
}: {
  ariaLabel?: string
  bookId: string
  children: ReactNode
  className: string
}) {
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`

  function rememberScrollPosition(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    saveBookListScrollPosition(returnTo, window.scrollY)
  }

  return (
    <Link
      aria-label={ariaLabel}
      className={className}
      state={{ bookListReturnTo: returnTo }}
      to={`/books/${bookId}`}
      onClick={rememberScrollPosition}
    >
      {children}
    </Link>
  )
}

function BookEditLink({
  ariaLabel,
  bookId,
  children,
  className,
}: {
  ariaLabel?: string
  bookId: string
  children: ReactNode
  className: string
}) {
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`

  function rememberScrollPosition(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return
    }

    saveBookListScrollPosition(returnTo, window.scrollY)
  }

  return (
    <Link
      aria-label={ariaLabel}
      className={className}
      state={{ bookListReturnTo: returnTo }}
      to={`/books/${bookId}/edit`}
      onClick={rememberScrollPosition}
    >
      {children}
    </Link>
  )
}

function AuthorCell({ book }: { book: BookListItemDto }) {
  return (
    <MetadataSummary
      alternatives={book.authorOtherNames}
      countNoun="alternative name"
      primary={book.author ?? '-'}
    />
  )
}

function isCyclicSort(sortBy: string) {
  return sortBy === 'status' || sortBy === 'type'
}

function getCyclicSortDirectionFromResult(books: BookListItemDto[], sortBy: string) {
  const firstBook = books[0]
  if (!firstBook) {
    return null
  }

  return sortBy === 'status' ? firstBook.status : sortBy === 'type' ? firstBook.contentType : null
}

function formatList(values: string[]) {
  return values.length ? values.slice(0, 3).join(', ') : '-'
}

function isCompletedStatus(status: string) {
  return status.trim().toLowerCase() === 'completed'
}

function formatListTooltip(values: string[], totalCount = values.length) {
  if (!values.length) {
    return '-'
  }

  const unlistedCount = Math.max(0, totalCount - values.length)
  return [...values, unlistedCount ? `+${unlistedCount} more` : null]
    .filter((line): line is string => Boolean(line))
    .join('\n')
}

function TruncatedCellText({ value }: { value?: string | null | undefined }) {
  const text = (value ?? '') || '-'
  return (
    <span className="block truncate" title={value ?? undefined}>
      {text}
    </span>
  )
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(value))
}

function buildAnalyticsHref(query: string) {
  const params = new URLSearchParams()
  const analyticsFilters = extractAnalyticsDateFilters(query)
  if (analyticsFilters.query) {
    params.set('query', analyticsFilters.query)
  }
  if (analyticsFilters.from) {
    params.set('from', analyticsFilters.from)
  }
  if (analyticsFilters.to) {
    params.set('to', analyticsFilters.to)
  }

  const search = params.toString()
  return search ? `/analytics?${search}` : '/analytics'
}
