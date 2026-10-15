import { useEffect, useState } from 'react'
import { bookListPageSizeOptions, defaultBookListPageSize } from './bookListState'

export const cardsPerRowOptions = [2, 3, 4, 5, 6, 7, 8] as const

export function useCardsPerRow(storageKey: string) {
  const [cardsPerRow, setCardsPerRowState] = useState<number>(() => readCardsPerRow(storageKey))

  function setCardsPerRow(next: number) {
    const normalized = normalizeCardsPerRow(next)
    setCardsPerRowState(normalized)
    window.localStorage.setItem(storageKey, String(normalized))
  }

  return [cardsPerRow, setCardsPerRow] as const
}

export function getResponsiveCardsPerRow(cardsPerRow: number, viewportWidth: number) {
  if (viewportWidth < 640) {
    return 2
  }

  if (viewportWidth < 1024) {
    return 3
  }

  return normalizeCardsPerRow(cardsPerRow)
}

export function useResponsiveCardsPerRow(cardsPerRow: number) {
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)

  useEffect(() => {
    function updateViewportWidth() {
      setViewportWidth(window.innerWidth)
    }

    window.addEventListener('resize', updateViewportWidth)
    return () => window.removeEventListener('resize', updateViewportWidth)
  }, [])

  return getResponsiveCardsPerRow(cardsPerRow, viewportWidth)
}

export function getCardTextSizeClasses(cardsPerRow: number) {
  const normalized = normalizeCardsPerRow(cardsPerRow)

  if (normalized <= 4) {
    return {
      title: 'text-[15px]',
      meta: 'text-[13px]',
    }
  }

  if (normalized <= 6) {
    return {
      title: 'text-sm',
      meta: 'text-xs',
    }
  }

  return {
    title: 'text-[13px]',
    meta: 'text-xs',
  }
}

export function getCardRowMinHeightClasses(cardsPerRow: number) {
  const normalized = normalizeCardsPerRow(cardsPerRow)

  if (normalized <= 4) {
    return {
      author: 'min-h-6',
      progress: 'min-h-7',
    }
  }

  if (normalized <= 6) {
    return {
      author: 'min-h-5',
      progress: 'min-h-6',
    }
  }

  return {
    author: 'min-h-4',
    progress: 'min-h-5',
  }
}

export function getCardDetailRowClass({
  cardsPerRow,
  showAlternativeTitles,
  showAuthor,
  showProgress,
  showTitle,
  showType,
}: {
  cardsPerRow: number
  showAlternativeTitles: boolean
  showAuthor: boolean
  showProgress: boolean
  showTitle: boolean
  showType: boolean
}) {
  const rows: string[] = []

  if (showTitle) {
    rows.push(`minmax(0,${getCardTitleRowHeight(cardsPerRow)})`)
  }

  if (showAlternativeTitles) {
    rows.push('minmax(0,2.5rem)')
  }

  if (showAuthor) {
    rows.push(`minmax(0,${getCardAuthorRowHeight(cardsPerRow)})`)
  }

  if (showProgress || showType) {
    rows.push(`minmax(0,${getCardProgressRowHeight(cardsPerRow)})`)
  }

  return rows.length ? `grid-rows-[${rows.join('_')}]` : ''
}

function getCardTitleRowHeight(cardsPerRow: number) {
  const normalized = normalizeCardsPerRow(cardsPerRow)

  if (normalized <= 4) {
    return '3.5rem'
  }

  if (normalized <= 6) {
    return '3rem'
  }

  return '2.5rem'
}

function getCardAuthorRowHeight(cardsPerRow: number) {
  const normalized = normalizeCardsPerRow(cardsPerRow)

  if (normalized <= 4) {
    return '1.5rem'
  }

  if (normalized <= 6) {
    return '1.25rem'
  }

  return '1rem'
}

function getCardProgressRowHeight(cardsPerRow: number) {
  const normalized = normalizeCardsPerRow(cardsPerRow)

  if (normalized <= 4) {
    return '1.75rem'
  }

  if (normalized <= 6) {
    return '1.5rem'
  }

  return '1.25rem'
}

export function readCardsPerRow(storageKey: string) {
  const stored = Number(window.localStorage.getItem(storageKey) ?? 4)
  return normalizeCardsPerRow(stored)
}

function normalizeCardsPerRow(value: number) {
  return cardsPerRowOptions.includes(value as (typeof cardsPerRowOptions)[number]) ? value : 4
}

export function getCardPageSizeOptions(cardsPerRow: number) {
  const normalizedCardsPerRow = cardsPerRow === 1 ? 1 : normalizeCardsPerRow(cardsPerRow)
  const maximumPageSize = Math.max(...bookListPageSizeOptions)
  return [
    ...new Set(
      bookListPageSizeOptions.map((pageSize) => {
        const roundedUp = Math.ceil(pageSize / normalizedCardsPerRow) * normalizedCardsPerRow
        return roundedUp <= maximumPageSize
          ? roundedUp
          : Math.floor(maximumPageSize / normalizedCardsPerRow) * normalizedCardsPerRow
      }),
    ),
  ]
}

export function getClosestPageSize(pageSize: number, options: readonly number[]) {
  return options.reduce(
    (closest, option) =>
      Math.abs(option - pageSize) < Math.abs(closest - pageSize) ? option : closest,
    options[0] ?? defaultBookListPageSize,
  )
}

export function getDesktopCardsPerRowClass(cardsPerRow: number) {
  const normalized = normalizeCardsPerRow(cardsPerRow)
  const classMap: Record<number, string> = {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
    4: 'lg:grid-cols-4',
    5: 'lg:grid-cols-5',
    6: 'lg:grid-cols-6',
    7: 'lg:grid-cols-7',
    8: 'lg:grid-cols-8',
  }

  return classMap[normalized]
}
