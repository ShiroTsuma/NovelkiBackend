import type { BookAnalyticsDto } from '@/api/types'
import { formatCount, formatPercent, percent } from './chartUtils'

export function priorityRows(data?: BookAnalyticsDto) {
  return (data?.planning.prioritiesByStatus ?? []).flatMap((row) =>
    row.priorities.map((priority) => [
      row.status,
      priority.priority,
      formatCount(priority.bookCount),
      formatPercent(percent(priority.bookCount, row.totalBooks)),
    ]),
  )
}
