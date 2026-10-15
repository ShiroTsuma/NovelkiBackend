import { useState, type ReactNode } from 'react'

const columnPopupWidthPx = 320
const columnPopupEdgeGapPx = 16
const columnPopupVerticalGapPx = 10

export type BookViewMode = 'table' | 'cards'
export type ColumnPreference = { id: string; visible: boolean }
export type ColumnDefinition<T> = {
  id: string
  label: ReactNode
  defaultVisible: boolean
  sortBy?: string
  widthClass?: string
  /** Takes the width left over by the fixed columns (the title). */
  grow?: boolean
  render: (item: T) => ReactNode
}

export function useColumnPreferences<T>(storageKey: string, columns: ColumnDefinition<T>[]) {
  const [preferences, setPreferences] = useState<ColumnPreference[]>(() =>
    readColumnPreferences(storageKey, columns),
  )

  function updatePreferences(next: ColumnPreference[]) {
    setPreferences(next)
    window.localStorage.setItem(storageKey, JSON.stringify(next))
  }

  return [preferences, updatePreferences] as const
}

export function getColumnPopupPosition(
  rect: Pick<DOMRect, 'left' | 'right' | 'bottom'>,
  viewportWidth: number,
  viewportHeight: number,
) {
  const maxWidth = Math.min(columnPopupWidthPx, viewportWidth - columnPopupEdgeGapPx * 2)
  const left =
    viewportWidth < 640
      ? columnPopupEdgeGapPx
      : Math.min(
          Math.max(columnPopupEdgeGapPx, rect.right - maxWidth),
          viewportWidth - maxWidth - columnPopupEdgeGapPx,
        )
  const top = Math.min(
    Math.max(columnPopupEdgeGapPx, rect.bottom + columnPopupVerticalGapPx),
    viewportHeight - columnPopupEdgeGapPx,
  )

  return {
    left: `${left}px`,
    top: `${top}px`,
  }
}

export function useViewMode(storageKey: string) {
  const [viewMode, setViewModeState] = useState<BookViewMode>(() => {
    const stored = window.localStorage.getItem(storageKey)
    return stored === 'cards' ? 'cards' : 'table'
  })

  function setViewMode(next: BookViewMode) {
    setViewModeState(next)
    window.localStorage.setItem(storageKey, next)
  }

  return [viewMode, setViewMode] as const
}

export function getVisibleColumns<T>(
  columns: ColumnDefinition<T>[],
  preferences: ColumnPreference[],
) {
  return preferences
    .filter((preference) => preference.visible)
    .map((preference) => columns.find((column) => column.id === preference.id))
    .filter((column): column is ColumnDefinition<T> => Boolean(column))
}

export function defaultColumnPreferences<T>(columns: ColumnDefinition<T>[]): ColumnPreference[] {
  return columns.map((column) => ({ id: column.id, visible: column.defaultVisible }))
}

function readColumnPreferences<T>(storageKey: string, columns: ColumnDefinition<T>[]) {
  const defaults = defaultColumnPreferences(columns)
  const stored = window.localStorage.getItem(storageKey)
  if (!stored) {
    return defaults
  }

  try {
    const parsed = JSON.parse(stored) as ColumnPreference[]
    const knownIds = new Set(columns.map((column) => column.id))
    const storedKnown = parsed.filter((preference) => knownIds.has(preference.id))
    const missing = defaults.filter(
      (preference) => !storedKnown.some((item) => item.id === preference.id),
    )
    return [...storedKnown, ...missing]
  } catch {
    return defaults
  }
}
