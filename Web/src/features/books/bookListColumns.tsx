import { ArrowDown, ArrowUp, ChevronsUpDown, RefreshCw, Settings2 } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  defaultColumnPreferences,
  getColumnPopupPosition,
  type ColumnDefinition,
  type ColumnPreference,
} from './columnPreferences'

export function TotalChaptersColumnLabel() {
  return (
    <>
      <span className="sm:hidden">Total</span>
      <span className="hidden sm:inline">Total chapters</span>
    </>
  )
}

export function ColumnSettingsPopup<T>({
  allowReorder = true,
  columns,
  description = 'Change table order and visibility.',
  preferences,
  title = 'Visible columns',
  onChange,
}: {
  allowReorder?: boolean
  columns: ColumnDefinition<T>[]
  description?: string
  preferences: ColumnPreference[]
  title?: string
  onChange: (next: ColumnPreference[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 'auto', top: 'auto' })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    function updatePosition() {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) {
        return
      }

      setPosition(getColumnPopupPosition(rect, window.innerWidth, window.innerHeight))
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  function togglePopup() {
    if (open) {
      setOpen(false)
      return
    }

    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }

    setPosition(getColumnPopupPosition(rect, window.innerWidth, window.innerHeight))
    setOpen(true)
  }

  function toggleColumn(id: string) {
    onChange(
      preferences.map((preference) =>
        preference.id === id ? { ...preference, visible: !preference.visible } : preference,
      ),
    )
  }

  function moveColumn(id: string, direction: -1 | 1) {
    const index = preferences.findIndex((preference) => preference.id === id)
    const nextIndex = index + direction
    if (index < 0 || nextIndex < 0 || nextIndex >= preferences.length) {
      return
    }

    const next = [...preferences]
    const [item] = next.splice(index, 1)
    if (!item) {
      return
    }
    next.splice(nextIndex, 0, item)
    onChange(next)
  }

  function resetColumns() {
    onChange(defaultColumnPreferences(columns))
  }

  return (
    <div className="inline-block text-left" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Columns"
        ref={buttonRef}
        className="flex size-9 items-center justify-center rounded-control border border-line bg-transparent text-ink-2 hover:border-line-strong hover:text-ink"
        title="Choose columns"
        type="button"
        onClick={togglePopup}
      >
        <Settings2 aria-hidden="true" className="size-4" />
      </button>
      {open ? (
        <div
          className="ui-popover fixed grid max-h-[min(34rem,calc(100vh-1rem))] w-[min(20rem,calc(100vw-1rem))] gap-3 overflow-y-auto p-4 text-left normal-case tracking-normal"
          data-testid="column-settings-popup"
          role="dialog"
          style={position}
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="text-sm font-semibold text-slate-950">{title}</div>
              <div className="text-xs font-normal text-slate-500">{description}</div>
            </div>
            <button
              className="tablet-touch-target text-xs font-semibold text-slate-500 hover:text-slate-950"
              type="button"
              onClick={resetColumns}
            >
              Reset
            </button>
          </div>
          {preferences.map((preference, index) => {
            const column = columns.find((item) => item.id === preference.id)
            if (!column) {
              return null
            }

            return (
              <div
                className={`flex items-center justify-between gap-3 rounded-md border bg-white px-3.5 py-2.5 text-sm text-slate-700 ${preference.visible ? 'border-emerald-400' : 'border-slate-200'}`}
                key={preference.id}
              >
                <button
                  aria-pressed={preference.visible}
                  className="tablet-touch-target inline-flex min-w-0 flex-1 items-center gap-2 text-left font-medium text-inherit"
                  type="button"
                  onClick={() => toggleColumn(preference.id)}
                >
                  <span
                    className={`book-column-switch relative inline-flex h-5 w-9 shrink-0 rounded-full border transition ${preference.visible ? 'book-column-switch--active' : ''}`}
                  >
                    <span
                      className={`absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition ${preference.visible ? 'left-4' : 'left-0.5'}`}
                    />
                  </span>
                  {column.label}
                </button>
                {allowReorder ? (
                  <div className="flex shrink-0 gap-1">
                    <button
                      className="min-h-11 border border-slate-200 px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:text-slate-300"
                      disabled={index === 0}
                      type="button"
                      onClick={() => moveColumn(preference.id, -1)}
                    >
                      Up
                    </button>
                    <button
                      className="min-h-11 border border-slate-200 px-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:text-slate-300"
                      disabled={index === preferences.length - 1}
                      type="button"
                      onClick={() => moveColumn(preference.id, 1)}
                    >
                      Down
                    </button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export function ColumnHeader<T>({
  activeDirection,
  isCyclic = false,
  column,
  onSort,
}: {
  activeDirection: string | null
  isCyclic?: boolean
  column: ColumnDefinition<T>
  onSort: (sortBy: string) => void
}) {
  const Icon =
    isCyclic && activeDirection
      ? RefreshCw
      : activeDirection === 'asc'
        ? ArrowUp
        : activeDirection === 'desc'
          ? ArrowDown
          : ChevronsUpDown

  const sortBy = column.sortBy
  if (!sortBy) {
    return (
      <th className={`${column.widthClass ?? ''} border-b border-line px-3 py-3`}>
        {column.label}
      </th>
    )
  }

  return (
    <th className={`${column.widthClass ?? ''} border-b border-line px-3 py-2`}>
      <button
        className="-ml-2 inline-flex h-8 items-center gap-1 rounded-control px-2 text-xs font-semibold tracking-wider text-ink-3 uppercase hover:bg-raised hover:text-ink"
        type="button"
        onClick={() => onSort(sortBy)}
      >
        {column.label}
        <Icon className="h-3.5 w-3.5" />
      </button>
    </th>
  )
}
