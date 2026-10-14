import type { BookAnalyticsDto } from '@/api/types'
import { formatCount } from './chartUtils'

export function ratingRows(data?: BookAnalyticsDto) {
  const ratings = data?.ratings
  if (!ratings) {
    return []
  }

  return [
    ...ratings.counts.map((item) => [String(item.rating), formatCount(item.bookCount)]),
    ['Unrated', formatCount(ratings.unratedBooks)],
  ]
}
