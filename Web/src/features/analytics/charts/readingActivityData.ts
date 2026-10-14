import type { BookAnalyticsActivityPointDto, BookAnalyticsDto } from '@/api/types'
import { dateRangeForBucket, formatCount, formatDateRange } from './chartUtils'

export function readingActivityRows(data?: BookAnalyticsDto) {
  return compactActivityPoints(
    data?.activity.points ?? [],
    data?.scope.bucket ?? 'day',
    data?.activity.baselineChapters ?? 0,
  ).map((point) => [
    point.label,
    formatCount(point.dailyChapters),
    formatCount(point.cumulativeChapters),
    formatCount(point.progressEvents),
    formatCount(point.booksTouched),
  ])
}

export function readingActivityChartPoints(
  points: BookAnalyticsActivityPointDto[],
  bucket: string,
  baselineChapters = 0,
) {
  let cumulativeChapters = baselineChapters
  return points.map((point) => {
    const period = dateRangeForBucket(point.date, bucket)
    const dailyChapters = point.chaptersAdvanced
    cumulativeChapters += dailyChapters
    return {
      ...point,
      dailyChapters,
      cumulativeChapters,
      label: formatDateRange(period.start, period.end),
      endExclusive: period.end,
    }
  })
}

export function compactActivityPoints(
  points: BookAnalyticsActivityPointDto[],
  bucket: string,
  baselineChapters = 0,
) {
  return readingActivityChartPoints(points, bucket, baselineChapters).reduce<
    (BookAnalyticsActivityPointDto & {
      dailyChapters: number
      cumulativeChapters: number
      label: string
      endExclusive: string
    })[]
  >((rows, point) => {
    const isEmpty =
      point.progressEvents === 0 && point.booksTouched === 0 && point.dailyChapters === 0
    const previous = rows.at(-1)
    if (
      isEmpty &&
      previous?.progressEvents === 0 &&
      previous.booksTouched === 0 &&
      previous.dailyChapters === 0
    ) {
      previous.endExclusive = point.endExclusive
      previous.label = formatDateRange(previous.date, previous.endExclusive)
      previous.cumulativeChapters = point.cumulativeChapters
      return rows
    }

    rows.push(point)
    return rows
  }, [])
}
