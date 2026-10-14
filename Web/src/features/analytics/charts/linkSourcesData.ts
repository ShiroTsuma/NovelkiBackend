import type { BookAnalyticsDto } from '@/api/types'
import { formatCount, formatPercent } from './chartUtils'

export function linkSourceRows(data?: BookAnalyticsDto) {
  return (data?.quality.linkSources ?? []).map((item) => [
    item.source || 'Unknown source',
    formatCount(item.linkCount),
    formatCount(item.bookCount),
    formatPercent(item.shareOfBooks),
  ])
}
