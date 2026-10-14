import type { BookAnalyticsDto } from '@/api/types'
import { formatCount, formatPercent } from './chartUtils'

export function coverAvailabilityRows(data?: BookAnalyticsDto) {
  const statusRows = (data?.quality.coverStatuses ?? []).map((item) => [
    'Status',
    item.status || 'Unknown status',
    formatCount(item.bookCount),
    formatPercent(item.shareOfBooks),
  ])
  const sourceRows = (data?.quality.coverSources ?? []).map((item) => [
    'Provider',
    item.source || 'Unknown provider',
    formatCount(item.bookCount),
    formatPercent(item.shareOfBooks),
  ])
  return [...statusRows, ...sourceRows]
}
