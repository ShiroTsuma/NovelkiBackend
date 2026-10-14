import { useEffect, useState } from 'react'
import type { BookCoverSummaryDto } from '@/api/types'
import { loadCoverBlobUrl } from './coverCache'

const COVER_CACHE_TTL_MS = 60_000

type CoverCacheEntry = {
  blobUrl: string | null
  promise: Promise<string | null> | null
  refs: number
  cleanupTimer: ReturnType<typeof setTimeout> | null
}

type LoadedCover = {
  cacheKey: string
  blobUrl: string | null
}

const coverImageCache = new Map<string, CoverCacheEntry>()

export function useResolvedCoverImage(
  cover?: BookCoverSummaryDto | null,
  variant: 'full' | 'thumbnail' = 'full',
  enabled = true,
) {
  const [loaded, setLoaded] = useState<LoadedCover | null>(null)
  const targetUrl = enabled ? getCoverTargetUrl(cover, variant) : null
  const cacheKey = targetUrl ? getCoverCacheKey(targetUrl, variant, cover?.lastAttemptAt) : null

  useEffect(() => {
    if (!cacheKey || !targetUrl) {
      return
    }

    let active = true
    const entry = acquireCoverCacheEntry(cacheKey)

    if (!entry.promise && !entry.blobUrl) {
      entry.promise = loadCoverBlobUrl(targetUrl)
        .then((nextBlobUrl) => {
          entry.blobUrl = nextBlobUrl
          return nextBlobUrl
        })
        .finally(() => {
          entry.promise = null
        })
    }

    if (entry.promise) {
      void entry.promise.then((nextBlobUrl) => {
        if (active) {
          setLoaded({ cacheKey, blobUrl: nextBlobUrl })
        }
      })
    }

    return () => {
      active = false
      releaseCoverCacheEntry(cacheKey)
    }
  }, [cacheKey, targetUrl])

  if (!cacheKey) {
    return null
  }

  if (loaded?.cacheKey === cacheKey) {
    return loaded.blobUrl
  }

  return coverImageCache.get(cacheKey)?.blobUrl ?? null
}

function getCoverTargetUrl(
  cover: BookCoverSummaryDto | null | undefined,
  variant: 'full' | 'thumbnail',
) {
  const targetUrl =
    variant === 'thumbnail' ? (cover?.thumbnailImageUrl ?? cover?.imageUrl) : cover?.imageUrl
  if (!targetUrl) {
    return null
  }
  return targetUrl
}

function getCoverCacheKey(
  targetUrl: string,
  variant: 'full' | 'thumbnail',
  lastAttemptAt: string | null | undefined,
) {
  return `${variant}::${targetUrl}::${lastAttemptAt ?? ''}`
}

function acquireCoverCacheEntry(cacheKey: string) {
  const existing = coverImageCache.get(cacheKey)
  if (existing) {
    existing.refs += 1
    if (existing.cleanupTimer) {
      clearTimeout(existing.cleanupTimer)
      existing.cleanupTimer = null
    }
    return existing
  }

  const created: CoverCacheEntry = {
    blobUrl: null,
    promise: null,
    refs: 1,
    cleanupTimer: null,
  }
  coverImageCache.set(cacheKey, created)
  return created
}

function releaseCoverCacheEntry(cacheKey: string) {
  const entry = coverImageCache.get(cacheKey)
  if (!entry) {
    return
  }

  entry.refs = Math.max(0, entry.refs - 1)
  if (entry.refs > 0 || entry.cleanupTimer) {
    return
  }

  entry.cleanupTimer = setTimeout(() => {
    const current = coverImageCache.get(cacheKey)
    if (!current || current.refs > 0) {
      return
    }

    if (current.blobUrl) {
      URL.revokeObjectURL(current.blobUrl)
    }
    coverImageCache.delete(cacheKey)
  }, COVER_CACHE_TTL_MS)
}
