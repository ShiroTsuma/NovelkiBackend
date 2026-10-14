import type { BookAnalyticsDto } from '@/api/types'
import { formatCount, formatPercent } from './chartUtils'

export function metadataCompletenessRows(data?: BookAnalyticsDto) {
  const totalBooks = data?.overview.totalBooks ?? 0
  return [...(data?.quality.fieldCompleteness ?? [])]
    .sort(
      (left, right) =>
        left.shareOfBooks - right.shareOfBooks || left.field.localeCompare(right.field),
    )
    .map((item) => [
      formatFieldName(item.field),
      formatCount(item.bookCount),
      formatPercent(item.shareOfBooks),
      formatCount(Math.max(0, totalBooks - item.bookCount)),
    ])
}

export function formatFieldName(field: string) {
  return field.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (first) => first.toUpperCase())
}
