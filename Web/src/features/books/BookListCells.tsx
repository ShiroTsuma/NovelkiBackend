import { Star } from 'lucide-react'
import type { BookListItemDto } from '@/api/types'
import { cn } from '@/lib/utils'
import { titleInitials, typeCoverClass } from './bookCovers'
import { isLowRating } from './bookRating'
import { getStatusTone, statusToneClasses } from './bookStatus'
import { useCoverLoadPermission } from './useCoverLoadPermission'
import { useResolvedCoverImage } from './useResolvedCoverImage'

const numberFormat = new Intl.NumberFormat('en-US')

/** Small lazy cover for table rows; falls back to type-coloured initials. */
export function CoverThumb({ book, className }: { book: BookListItemDto; className?: string }) {
  const { permitted, setTarget } = useCoverLoadPermission(true)
  const url = useResolvedCoverImage(book.cover, 'thumbnail', permitted)
  return (
    <span
      ref={setTarget}
      aria-hidden="true"
      className={cn(
        'flex h-[60px] w-10 shrink-0 items-end overflow-hidden rounded p-1 font-display text-[13px] leading-none font-bold',
        url ? 'bg-raised' : typeCoverClass(book.contentType),
        className,
      )}
    >
      {url ? (
        <img alt="" className="-m-1 h-[60px] w-10 max-w-none object-cover" src={url} />
      ) : (
        titleInitials(book.primaryTitle)
      )}
    </span>
  )
}

/**
 * Card cover: the stored thumbnail, or a type-coloured placeholder that shows
 * the type and the title in the display face (as in the mock).
 */
export function CardCover({ book }: { book: BookListItemDto }) {
  const { permitted, setTarget } = useCoverLoadPermission(true)
  const url = useResolvedCoverImage(book.cover, 'thumbnail', permitted)
  return (
    <span
      ref={setTarget}
      className={cn(
        'book-card__cover relative block aspect-[2/3] w-full max-w-full min-w-0 overflow-hidden rounded-[10px]',
        url ? 'bg-raised' : typeCoverClass(book.contentType),
      )}
    >
      {url ? (
        <img
          alt={book.primaryTitle}
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          loading="lazy"
          src={url}
        />
      ) : (
        <>
          <span className="absolute top-2.5 left-2.5 text-[11px] font-semibold tracking-[0.06em] uppercase opacity-85">
            {book.contentType}
          </span>
          <span className="absolute right-3 bottom-12 left-3 line-clamp-4 font-display text-xl leading-tight font-bold break-words">
            {book.primaryTitle}
          </span>
        </>
      )}
    </span>
  )
}

export function StatusCell({ status }: { status: string }) {
  const tone = getStatusTone(status)
  return (
    <span
      aria-label={`Book status: ${status}`}
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-medium',
        statusToneClasses[tone].badge,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 shrink-0 rounded-full', statusToneClasses[tone].dot)}
      />
      <span className="truncate">{status}</span>
    </span>
  )
}

export function ProgressCell({ book }: { book: BookListItemDto }) {
  const tone = getStatusTone(book.status)
  const finished = tone === 'finished'
  const current = typeof book.currentChapterNumber === 'number' ? book.currentChapterNumber : null
  const total = typeof book.totalChapters === 'number' ? book.totalChapters : null
  const label = book.currentChapterLabel ?? (current != null ? String(current) : null)
  const percent = finished
    ? 100
    : current != null && total != null && total > 0
      ? Math.min(100, (current / total) * 100)
      : null

  let detail = ''
  if (finished) detail = current != null ? `${numberFormat.format(current)} chapters` : ''
  else if (current != null && total != null)
    detail = `${numberFormat.format(current)} / ${numberFormat.format(total)}`
  else if (current != null) detail = `${numberFormat.format(current)} read`

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-baseline gap-2 tabular-nums">
        <span
          className={cn(
            'truncate font-semibold',
            finished ? 'text-status-finished-ink' : 'text-ink',
          )}
        >
          {finished ? 'Finished' : label ? `Ch. ${label}` : '—'}
        </span>
        {detail ? <span className="truncate text-[13px] text-ink-3">{detail}</span> : null}
      </div>
      <div
        aria-hidden="true"
        className={cn(
          'mt-1.5 h-1 overflow-hidden rounded-full',
          percent == null
            ? 'bg-[repeating-linear-gradient(90deg,var(--color-line)_0_6px,transparent_6px_10px)]'
            : 'bg-line',
        )}
      >
        {percent != null ? (
          <div
            className={cn('h-full rounded-full', statusToneClasses[tone].bar)}
            style={{ width: `${percent}%` }}
          />
        ) : null}
      </div>
    </div>
  )
}

export function RatingCell({ rating }: { rating?: number | null | undefined }) {
  if (typeof rating !== 'number') {
    return <span className="text-ink-disabled">—</span>
  }
  const low = isLowRating(rating)
  return (
    <span
      aria-label={`Rating ${rating} out of 10`}
      className={cn(
        'inline-flex items-center gap-1 font-semibold tabular-nums',
        low ? 'text-danger-ink' : 'text-ink',
      )}
    >
      <Star
        aria-hidden="true"
        className={cn('size-3.5', low ? 'fill-danger text-danger' : 'fill-star text-star')}
      />
      {rating}
    </span>
  )
}
