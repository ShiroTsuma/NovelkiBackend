import { useEffect, useState } from 'react'
import type { SetURLSearchParams } from 'react-router-dom'

export const defaultBookListPageSize = 20
export const bookListPageSizeOptions = [defaultBookListPageSize, 50, 100, 500]

export function useBookListUrlState(
  searchParams: URLSearchParams,
  setSearchParams: SetURLSearchParams,
  options: {
    defaultSortBy?: string
    defaultSortDirection?: string
    pageSizeStorageKey?: string
  } = {},
) {
  const defaultSortBy = options.defaultSortBy ?? 'lastModified'
  const defaultSortDirection = options.defaultSortDirection ?? 'desc'
  const skip = Number(searchParams.get('skip') ?? 0)
  const pageSize = readBookListPageSize(searchParams, options.pageSizeStorageKey)
  const sortBy = searchParams.get('sortBy') ?? defaultSortBy
  const sortDirection = searchParams.get('sortDirection') ?? defaultSortDirection
  const query = searchParams.get('query') ?? ''
  const requestQuery = query.trim()

  useEffect(() => {
    if (options.pageSizeStorageKey) {
      window.localStorage.setItem(options.pageSizeStorageKey, String(pageSize))
    }
  }, [options.pageSizeStorageKey, pageSize])

  function updateQuery(value: string) {
    const next = new URLSearchParams(searchParams)
    if (value.trim()) {
      next.set('query', value)
    } else {
      next.delete('query')
    }
    next.delete('skip')
    setSearchParams(next)
  }

  function setSkip(nextSkip: number) {
    const next = new URLSearchParams(searchParams)
    next.set('skip', String(Math.max(0, nextSkip)))
    setSearchParams(next)
  }

  function setPageSize(nextPageSize: string) {
    if (options.pageSizeStorageKey) {
      window.localStorage.setItem(options.pageSizeStorageKey, nextPageSize)
    }
    const next = new URLSearchParams(searchParams)
    next.set('take', nextPageSize)
    next.delete('skip')
    setSearchParams(next)
  }

  function setSort(nextSortBy: string, nextSortDirection: string) {
    const next = new URLSearchParams(searchParams)
    next.set('sortBy', nextSortBy)
    next.set('sortDirection', nextSortDirection)
    next.delete('skip')
    setSearchParams(next)
  }

  return {
    pageSize,
    query,
    requestQuery,
    setPageSize,
    setSkip,
    setSort,
    skip,
    sortBy,
    sortDirection,
    updateQuery,
  }
}

export function useBookListPagination({
  pageSize,
  scrollTargetId,
  setSkip,
  skip,
  total,
}: {
  pageSize: number
  scrollTargetId?: string
  setSkip: (nextSkip: number) => void
  skip: number
  total: number
}) {
  const [activePageGapId, setActivePageGapId] = useState<string | null>(null)
  const canGoBack = skip > 0
  const canGoForward = skip + pageSize < total
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(totalPages, Math.floor(skip / pageSize) + 1)
  const visiblePages = getVisiblePageNumbers(currentPage, totalPages)

  function goToPage(page: number) {
    const nextPage = Math.min(Math.max(1, page), totalPages)
    setActivePageGapId(null)
    scrollToResultsStart()
    setSkip((nextPage - 1) * pageSize)
  }

  function scrollToResultsStart() {
    if (!scrollTargetId) {
      return
    }

    const target = document.getElementById(scrollTargetId)
    if (!target) {
      return
    }

    window.scrollTo({
      top: Math.max(0, window.scrollY + target.getBoundingClientRect().top),
      behavior: 'auto',
    })
  }

  return {
    activePageGapId,
    canGoBack,
    canGoForward,
    currentPage,
    setActivePageGapId,
    totalPages,
    visiblePages,
    onGoToPage: goToPage,
  }
}

export function useBookListScrollShortcuts() {
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [showGoDown, setShowGoDown] = useState(false)

  useEffect(() => {
    function updateScrollShortcutVisibility() {
      const distanceFromBottom =
        document.documentElement.scrollHeight - (window.scrollY + window.innerHeight)
      setShowBackToTop(window.scrollY > 480)
      setShowGoDown(distanceFromBottom > 480)
    }

    updateScrollShortcutVisibility()
    window.addEventListener('scroll', updateScrollShortcutVisibility, { passive: true })
    window.addEventListener('resize', updateScrollShortcutVisibility)
    return () => {
      window.removeEventListener('scroll', updateScrollShortcutVisibility)
      window.removeEventListener('resize', updateScrollShortcutVisibility)
    }
  }, [])

  return {
    showBackToTop,
    showGoDown,
    scrollBackToTop: () => window.scrollTo({ top: 0, behavior: 'smooth' }),
    scrollToPageBottom: () =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' }),
  }
}

export function getNextSortDirection(
  nextSortBy: string,
  currentSortBy: string,
  currentSortDirection: string,
) {
  const defaultDirection =
    nextSortBy === 'lastModified' || nextSortBy === 'created' ? 'desc' : 'asc'
  return currentSortBy === nextSortBy
    ? currentSortDirection === 'asc'
      ? 'desc'
      : 'asc'
    : defaultDirection
}

function readBookListPageSize(searchParams: URLSearchParams, storageKey?: string) {
  const parameter = searchParams.get('take')
  const value = Number(
    parameter ?? (storageKey ? window.localStorage.getItem(storageKey) : null) ?? 20,
  )
  return Number.isInteger(value) && value >= 1 && value <= 1_000 ? value : 20
}

export function getVisiblePageNumbers(
  currentPage: number,
  totalPages: number,
): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 6, 'ellipsis', totalPages]
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      'ellipsis',
      totalPages - 5,
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ]
  }

  return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages]
}
