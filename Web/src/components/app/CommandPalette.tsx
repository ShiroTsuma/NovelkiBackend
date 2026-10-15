import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { useBodyScrollLock } from '@/components/app/useBodyScrollLock'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { cn } from '@/lib/utils'

type Destination = { id: string; label: string; hint: string; to: string }

const pages: Destination[] = [
  { id: 'page-library', label: 'Library', hint: 'Page', to: '/books' },
  { id: 'page-add', label: 'Add book', hint: 'Page', to: '/books/new' },
  { id: 'page-discover', label: 'Discover', hint: 'Page', to: '/discover' },
  { id: 'page-stats', label: 'Stats', hint: 'Page', to: '/analytics' },
  { id: 'page-manage', label: 'Manage', hint: 'Page', to: '/manage' },
]

const adminPage: Destination = { id: 'page-admin', label: 'Admin', hint: 'Page', to: '/admin' }

/**
 * "Jump to book or page" palette. Opens with Ctrl+K / Cmd+K or the header
 * button; plain text searches book titles through the normal list API.
 */
export function CommandPalette({
  open,
  isAdmin,
  onClose,
}: {
  open: boolean
  isAdmin: boolean
  onClose: () => void
}) {
  if (!open) return null
  return <PaletteDialog isAdmin={isAdmin} onClose={onClose} />
}

function PaletteDialog({ isAdmin, onClose }: { isAdmin: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const [text, setText] = useState('')
  const [active, setActive] = useState(0)
  const search = useDebouncedValue(text.trim(), 180)
  useBodyScrollLock(true)

  const books = useQuery({
    queryKey: ['command-palette', search],
    queryFn: ({ signal }) => api.getBooks({ skip: 0, take: 8, query: search, signal }),
    enabled: search.length >= 2,
    staleTime: 30_000,
  })

  const lowered = text.trim().toLowerCase()
  const pageResults = (isAdmin ? [...pages, adminPage] : pages).filter((page) =>
    page.label.toLowerCase().includes(lowered),
  )
  const bookResults: Destination[] =
    search.length >= 2
      ? (books.data?.data ?? []).map((book) => ({
          id: book.id,
          label: book.primaryTitle,
          hint: [book.contentType, book.author].filter(Boolean).join(' · '),
          to: `/books/${book.id}`,
        }))
      : []
  const results = [...bookResults, ...pageResults]
  const activeIndex = Math.min(active, Math.max(0, results.length - 1))

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function go(destination: Destination | undefined) {
    if (!destination) return
    onClose()
    void navigate(destination.to)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-overlay px-4 pt-[12vh]"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Jump to book or page"
        className="w-full max-w-[560px] overflow-hidden rounded-dialog border border-line-strong bg-surface shadow-overlay"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search aria-hidden="true" className="size-4 shrink-0 text-ink-3" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={results[activeIndex] ? `${listId}-${activeIndex}` : undefined}
            aria-label="Jump to book or page"
            placeholder="Jump to book or page…"
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              setActive(0)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose()
              if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActive(Math.min(activeIndex + 1, results.length - 1))
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActive(Math.max(activeIndex - 1, 0))
              }
              if (event.key === 'Enter') {
                event.preventDefault()
                go(results[activeIndex])
              }
            }}
            className="h-13 min-w-0 flex-1 border-0 bg-transparent py-4 text-base text-ink outline-none"
          />
          <kbd className="rounded border border-line-strong px-1.5 py-0.5 font-sans text-xs text-ink-2">
            Esc
          </kbd>
        </div>
        <ul
          id={listId}
          role="listbox"
          aria-label="Results"
          className="m-0 max-h-[50vh] list-none overflow-y-auto p-1.5"
        >
          {search.length >= 2 && books.isFetching && bookResults.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-ink-3">Searching books…</li>
          ) : null}
          {results.map((result, index) => (
            // Keyboard selection runs through the combobox (aria-activedescendant).
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- options are driven from the combobox input; the click is a mouse shortcut
            <li
              key={result.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-3 rounded-control px-3 py-2.5',
                index === activeIndex ? 'bg-selected' : 'hover:bg-hover',
              )}
              onPointerEnter={() => setActive(index)}
              onClick={() => go(result)}
            >
              <span className="truncate font-medium text-ink">{result.label}</span>
              <span className="shrink-0 text-xs text-ink-3">{result.hint}</span>
            </li>
          ))}
          {results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-ink-3">Nothing matches “{text}”.</li>
          ) : null}
        </ul>
      </div>
    </div>
  )
}
