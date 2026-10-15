import { ChevronDown, Search, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { BookSearchInput } from './BookSearchInput'
import { sortOptions, type SortOption } from './bookListSort'
import { getStatusTone, statusToneClasses } from './bookStatus'
import {
  describeToken,
  getQuickFilters,
  getStatusFilter,
  hasToken,
  removeTokenAt,
  setStatusFilter,
  tokenizeQuery,
  toggleToken,
} from './queryTokens'
import { useSavedViews } from './savedViews'

type QueryProps = {
  query: string
  onQueryChange: (query: string) => void
}

/**
 * Search bar with two views of the same query text:
 * - Filters: every token shown as a readable pill (display only; derived from the text)
 * - Query: the raw text in the existing search input with its suggestion engine
 * The text is the only state, so the pill view can never break searching.
 */
export function QueryBar({ query, onQueryChange }: QueryProps) {
  const tokens = tokenizeQuery(query)
  const [mode, setMode] = useState<'filters' | 'query'>(tokens.length ? 'filters' : 'query')
  const focusQueryInput = useRef(false)
  const effectiveMode = tokens.length === 0 ? 'query' : mode

  useEffect(() => {
    if (effectiveMode === 'query' && focusQueryInput.current) {
      focusQueryInput.current = false
      document.getElementById('book-search-input')?.focus()
    }
  }, [effectiveMode])

  function editAsText() {
    focusQueryInput.current = true
    setMode('query')
  }

  return (
    <div className="flex flex-wrap items-stretch gap-2">
      <div className="min-w-0 flex-[1_1_520px]">
        {effectiveMode === 'filters' ? (
          <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-field border border-line-strong bg-surface py-[5px] pr-2 pl-3">
            <Search aria-hidden="true" className="size-4 shrink-0 text-ink-3" />
            <ul aria-label="Active filters" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {tokens.map((token, index) => (
                <TokenPill
                  key={`${token}-${index}`}
                  token={token}
                  onRemove={() => onQueryChange(removeTokenAt(query, index))}
                />
              ))}
            </ul>
            <button
              type="button"
              onClick={editAsText}
              className="h-8 min-w-[160px] flex-1 border-0 bg-transparent text-left text-ink-3 hover:text-ink-2"
            >
              Add filter or search text…
            </button>
          </div>
        ) : (
          <BookSearchInput
            appearance="compact"
            showHelp={false}
            placeholder="Search text, or type genre: tag: rating: …"
            value={query}
            onChange={onQueryChange}
          />
        )}
      </div>
      <div
        role="group"
        aria-label="Query editing mode"
        className="flex gap-0.5 self-start rounded-field border border-line bg-surface p-[3px]"
      >
        <SegmentButton
          pressed={effectiveMode === 'filters'}
          disabled={tokens.length === 0}
          onClick={() => setMode('filters')}
        >
          Filters
        </SegmentButton>
        <SegmentButton pressed={effectiveMode === 'query'} onClick={editAsText} mono>
          Query
        </SegmentButton>
      </div>
    </div>
  )
}

function TokenPill({ token, onRemove }: { token: string; onRemove: () => void }) {
  const described = describeToken(token)
  return (
    <li
      className={cn(
        'inline-flex h-[30px] items-center gap-1.5 rounded-pill border pr-1 pl-2.5 text-[13px]',
        described.negated
          ? 'border-danger-line bg-danger-soft text-danger-ink'
          : 'border-line-focus bg-selected text-ink',
      )}
    >
      {described.field ? (
        <span className="font-mono text-xs opacity-85">{described.field}</span>
      ) : null}
      <span className="text-xs opacity-70">{described.operator}</span>
      {described.value ? <span className="font-medium">{described.value}</span> : null}
      <button
        type="button"
        aria-label={`Remove filter ${token}`}
        onClick={onRemove}
        className="flex size-[22px] items-center justify-center rounded border-0 bg-transparent text-current opacity-70 hover:opacity-100"
      >
        <X aria-hidden="true" className="size-3" strokeWidth={2.4} />
      </button>
    </li>
  )
}

export function SegmentButton({
  pressed,
  onClick,
  children,
  disabled = false,
  mono = false,
}: {
  pressed: boolean
  onClick: () => void
  children: ReactNode
  disabled?: boolean
  mono?: boolean
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex h-8 items-center gap-1.5 rounded-[7px] border-0 px-3 text-sm disabled:opacity-40',
        mono && 'font-mono text-[13px]',
        pressed
          ? 'bg-selected font-semibold text-ink'
          : 'bg-transparent font-medium text-ink-2 hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

/** Sort picker for the result toolbar; column headers still sort too. */
export function SortMenu({
  sortBy,
  onSortChange,
}: {
  sortBy: string | null
  onSortChange: (option: SortOption) => void
}) {
  const current = sortOptions.find((option) => option.sortBy === sortBy)
  return (
    <label className="relative flex h-9 items-center gap-1.5 rounded-control border border-line px-3 hover:border-line-strong">
      <span className="text-ink-3">Sort</span>
      <select
        className="h-full cursor-pointer appearance-none border-0 bg-transparent pr-5 text-ink outline-none"
        value={current?.sortBy ?? ''}
        onChange={(event) => {
          const next = sortOptions.find((option) => option.sortBy === event.target.value)
          if (next) onSortChange(next)
        }}
      >
        {current ? null : <option value="">Custom</option>}
        {sortOptions.map((option) => (
          <option key={option.sortBy} value={option.sortBy}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 size-3.5 text-ink-2"
      />
    </label>
  )
}

const statusTabs: { label: string; status: string | null }[] = [
  { label: 'All', status: null },
  { label: 'Reading', status: 'Reading' },
  { label: 'Completed', status: 'Completed' },
  { label: 'Plan to read', status: 'Plan To Read' },
  { label: 'On hold', status: 'On Hold' },
  { label: 'Dropped', status: 'Dropped' },
  { label: 'Unknown', status: 'Unknown' },
]

/**
 * Status shortcuts. They only rewrite the `status:` token of the query.
 * `counts` maps a lower-case status name (and 'all') to the number of books
 * the rest of the query matches.
 */
export function StatusTabs({
  query,
  onQueryChange,
  counts,
}: QueryProps & { counts?: Record<string, number> | undefined }) {
  const active = getStatusFilter(query)
  return (
    <div className="flex flex-wrap items-end gap-2 border-b border-line">
      <div
        role="group"
        aria-label="Filter by status"
        className="-mx-4 flex flex-1 gap-0.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {statusTabs.map((tab) => {
          const key = tab.status?.toLowerCase() ?? 'all'
          const selected = tab.status === null ? active === null : active === key
          const tone = tab.status ? getStatusTone(tab.status) : null
          const count = counts?.[key]
          return (
            <button
              key={tab.label}
              type="button"
              aria-pressed={selected}
              onClick={() => onQueryChange(setStatusFilter(query, tab.status))}
              className={cn(
                '-mb-px flex h-11 shrink-0 items-center gap-2 border-0 border-b-2 bg-transparent px-3.5 text-sm whitespace-nowrap transition-colors',
                selected
                  ? 'border-accent font-semibold text-ink'
                  : count === 0
                    ? 'border-transparent font-medium text-ink-disabled'
                    : 'border-transparent font-medium text-ink-2 hover:text-ink',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'size-2 rounded-full',
                  tone ? statusToneClasses[tone].bar : 'bg-ink-2',
                )}
              />
              {tab.label}
              {count !== undefined ? (
                <span
                  className={cn(
                    'rounded-full px-2 py-px text-xs tabular-nums',
                    selected ? 'bg-selected text-ink' : 'bg-hover text-ink-3',
                  )}
                >
                  {count.toLocaleString('en-US')}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
      <span className="hidden px-1 pb-3 font-mono text-xs text-ink-3 sm:inline">
        {active === null
          ? 'no status: filter'
          : active === 'custom'
            ? 'custom status: filter'
            : `status:${active}`}
      </span>
    </div>
  )
}

/** One-click filters (each toggles one token and shows it) and saved views. */
export function QuickFilters({ query, onQueryChange }: QueryProps) {
  const { views, save, remove } = useSavedViews()
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')

  return (
    <div
      className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      role="group"
      aria-label="Quick filters"
    >
      <span className="mr-1 shrink-0 text-[13px] text-ink-3">Quick filters</span>
      {getQuickFilters().map((filter) => {
        const on = hasToken(query, filter.token)
        return (
          <button
            key={filter.token}
            type="button"
            aria-pressed={on}
            onClick={() => onQueryChange(toggleToken(query, filter.token))}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-2.5 text-[13px] whitespace-nowrap transition-colors',
              on
                ? 'border-line-focus bg-selected font-semibold text-ink'
                : 'border-line bg-transparent text-ink hover:border-line-strong',
            )}
          >
            {filter.label}
            <span className={cn('font-mono text-xs', on ? 'text-ink-2' : 'text-ink-3')}>
              {filter.token}
            </span>
          </button>
        )
      })}
      {views.map((view) => {
        const on = view.query.trim() === query.trim()
        return (
          <span
            key={view.name}
            className={cn(
              'inline-flex h-8 shrink-0 items-center rounded-full border pl-2.5 text-[13px] whitespace-nowrap',
              on ? 'border-line-focus bg-selected text-ink' : 'border-line text-ink',
            )}
          >
            <button
              type="button"
              aria-pressed={on}
              title={view.query}
              onClick={() => onQueryChange(view.query)}
              className={cn('border-0 bg-transparent p-0 text-current', on && 'font-semibold')}
            >
              {view.name}
            </button>
            <button
              type="button"
              aria-label={`Delete saved view ${view.name}`}
              onClick={() => remove(view.name)}
              className="ml-1 flex size-7 items-center justify-center rounded-full border-0 bg-transparent text-ink-3 hover:text-ink"
            >
              <X aria-hidden="true" className="size-3" />
            </button>
          </span>
        )
      })}
      {naming ? (
        <form
          className="flex shrink-0 items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            save(name, query)
            setName('')
            setNaming(false)
          }}
        >
          <input
            aria-label="Saved view name"
            // eslint-disable-next-line jsx-a11y/no-autofocus -- the field appears in response to the click that asked for it
            autoFocus
            placeholder="View name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setNaming(false)
            }}
            className="h-8 w-40 rounded-full border border-line-strong bg-ground px-3 text-[13px] text-ink outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="h-8 rounded-full border-0 bg-accent px-3 text-[13px] font-semibold text-accent-ink disabled:opacity-50"
          >
            Save
          </button>
        </form>
      ) : (
        <button
          type="button"
          disabled={!query.trim()}
          onClick={() => setNaming(true)}
          className="h-8 shrink-0 rounded-full border border-dashed border-line-strong bg-transparent px-2.5 text-[13px] whitespace-nowrap text-ink-2 hover:text-ink disabled:opacity-40"
        >
          + Save current as view
        </button>
      )}
    </div>
  )
}
