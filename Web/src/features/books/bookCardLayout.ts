import { useState } from 'react'
import { bookListPageSizeOptions, defaultBookListPageSize } from './bookListState'

export const cardSizeOptions = ['small', 'medium', 'large'] as const
export type CardSize = (typeof cardSizeOptions)[number]

/** Smallest card width for each size; the grid adds columns while they fit. */
const cardMinWidthPx: Record<CardSize, number> = { small: 170, medium: 220, large: 290 }
const cardGapPx = 20

/** The cards-per-row number the text and row-height scales below are tuned for. */
export function getCardSizeScale(size: CardSize) {
  return size === 'small' ? 8 : size === 'medium' ? 6 : 4
}

export function useCardSize(storageKey: string, legacyCardsPerRowKey: string) {
  const [cardSize, setCardSizeState] = useState<CardSize>(() =>
    readCardSize(storageKey, legacyCardsPerRowKey),
  )

  function setCardSize(next: CardSize) {
    setCardSizeState(next)
    window.localStorage.setItem(storageKey, next)
  }

  return [cardSize, setCardSize] as const
}

/** Reads the saved size; an older "cards per row" choice maps to the nearest size. */
export function readCardSize(storageKey: string, legacyCardsPerRowKey: string): CardSize {
  const stored = window.localStorage.getItem(storageKey)
  if (cardSizeOptions.includes(stored as CardSize)) {
    return stored as CardSize
  }
  const legacy = Number(window.localStorage.getItem(legacyCardsPerRowKey))
  if (!legacy) return 'medium'
  return legacy <= 4 ? 'large' : legacy <= 6 ? 'medium' : 'small'
}

/** grid-template-columns for the card grid (tablet and up). */
export function getCardGridColumns(size: CardSize) {
  return `repeat(auto-fill, minmax(min(${String(cardMinWidthPx[size])}px, 100%), 1fr))`
}

/** How many columns the grid shows at this width (phones always show two). */
export function getCardColumnCount(size: CardSize, containerWidth: number, isPhone: boolean) {
  if (isPhone) return 2
  return Math.max(1, Math.floor((containerWidth + cardGapPx) / (cardMinWidthPx[size] + cardGapPx)))
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

function normalizeCardsPerRow(value: number) {
  return Number.isInteger(value) && value >= 1 && value <= 12 ? value : 4
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
