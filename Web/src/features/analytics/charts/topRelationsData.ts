import type { BookAnalyticsRelationCountDto } from '@/api/types'
import { formatCount, formatPercent } from './chartUtils'

export function relationRows(items: BookAnalyticsRelationCountDto[]) {
  return toAllRelationRows(items).map((item) => [
    item.name,
    formatCount(item.bookCount),
    formatPercent(item.shareOfBooks),
  ])
}

export function toAllRelationRows(items: BookAnalyticsRelationCountDto[]) {
  return [...items]
    .sort((left, right) => right.bookCount - left.bookCount || left.name.localeCompare(right.name))
    .map((item) => ({ ...item, isOther: false }))
}

export function toLimitedRelationRows(items: BookAnalyticsRelationCountDto[], limit: number) {
  const sorted = [...items].sort(
    (left, right) => right.bookCount - left.bookCount || left.name.localeCompare(right.name),
  )
  const top = sorted.slice(0, limit).map((item) => ({ ...item, isOther: false }))
  const other = sorted.slice(limit)
  if (!other.length) {
    return top
  }

  return [
    ...top,
    {
      name: 'Other',
      bookCount: other.reduce((sum, item) => sum + item.bookCount, 0),
      shareOfBooks: other.reduce((sum, item) => sum + item.shareOfBooks, 0),
      isOther: true,
    },
  ]
}
