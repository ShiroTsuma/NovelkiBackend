import type { BookAnalyticsDto, BookAnalyticsLibraryGrowthPointDto } from '@/api/types'
import { dateRangeForBucket, formatCount, formatDateRange } from './chartUtils'

export function libraryGrowthRows(data?: BookAnalyticsDto) {
  return compactGrowthPoints(data?.libraryGrowth.points ?? [], data?.scope.bucket ?? 'day').map(
    (point) => [
      point.label,
      formatCount(point.booksAdded),
      formatCount(point.cumulativeBooks),
      point.byType.length
        ? point.byType.map((item) => `${item.type}: ${formatCount(item.bookCount)}`).join(', ')
        : 'No additions',
    ],
  )
}

export function libraryGrowthChartPoints(
  points: BookAnalyticsLibraryGrowthPointDto[],
  bucket: string,
) {
  return points.map((point) => {
    const period = dateRangeForBucket(point.date, bucket)
    return { ...point, label: formatDateRange(period.start, period.end), endExclusive: period.end }
  })
}

export function compactGrowthPoints(points: BookAnalyticsLibraryGrowthPointDto[], bucket: string) {
  return libraryGrowthChartPoints(points, bucket).reduce<
    (BookAnalyticsLibraryGrowthPointDto & { label: string; endExclusive: string })[]
  >((rows, point) => {
    const isEmpty = point.booksAdded === 0 && point.byType.length === 0
    const previous = rows.at(-1)
    if (
      isEmpty &&
      previous?.booksAdded === 0 &&
      previous.byType.length === 0 &&
      previous.cumulativeBooks === point.cumulativeBooks
    ) {
      previous.endExclusive = point.endExclusive
      previous.label = formatDateRange(previous.date, previous.endExclusive)
      return rows
    }

    rows.push(point)
    return rows
  }, [])
}
