import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
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

/**
 * The current query shown as readable pills, one per token. Removing a pill
 * removes exactly that token from the query text.
 */
export function ActiveFilterPills({
  query,
  onQueryChange,
}: {
  query: string
  onQueryChange: (query: string) => void
}) {
  const tokens = tokenizeQuery(query)
  if (tokens.length === 0) return null
  return (
    <ul aria-label="Active filters" className="m-0 flex list-none flex-wrap gap-1.5 p-0">
      {tokens.map((token, index) => {
        const described = describeToken(token)
        return (
          <li
            key={`${token}-${index}`}
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
            <span className="font-medium">{described.value}</span>
            <button
              type="button"
              aria-label={`Remove filter ${token}`}
              onClick={() => onQueryChange(removeTokenAt(query, index))}
              className="flex size-[22px] items-center justify-center rounded border-0 bg-transparent text-current opacity-70 hover:opacity-100"
            >
              <X aria-hidden="true" className="size-3" strokeWidth={2.4} />
            </button>
          </li>
        )
      })}
    </ul>
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
    <label className="flex items-center gap-2 text-ink-3">
      <span className="text-[13px]">Sort</span>
      <select
        className="ui-control h-9 min-h-9 w-auto py-0 text-ink"
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

/** Status shortcuts. They only rewrite the `status:` token of the query. */
export function StatusTabs({
  query,
  onQueryChange,
}: {
  query: string
  onQueryChange: (query: string) => void
}) {
  const active = getStatusFilter(query)
  return (
    <div className="flex flex-wrap items-end gap-2 border-b border-line">
      <div
        role="group"
        aria-label="Filter by status"
        className="-mx-4 flex flex-1 gap-0.5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      >
        {statusTabs.map((tab) => {
          const selected =
            tab.status === null ? active === null : active === tab.status.toLowerCase()
          const tone = tab.status ? getStatusTone(tab.status) : null
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

/** One-click filters. Each toggles a token of the search syntax and shows it. */
export function QuickFilters({
  query,
  onQueryChange,
}: {
  query: string
  onQueryChange: (query: string) => void
}) {
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
    </div>
  )
}
