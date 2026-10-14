import type { BookAnalyticsDto } from '@/api/types'
import { formatChapterCount } from '@/features/books/bookFormatters'
import { formatCount } from './chartUtils'

export function chapterVolumeRows(data?: BookAnalyticsDto) {
  return (data?.progress.typeVolumes ?? []).map((item) => [
    item.type,
    formatCount(item.bookCount),
    formatChapterCount(item.currentChapters),
    formatChapterCount(item.averageCurrentChapter),
    formatChapterCount(item.medianCurrentChapter),
  ])
}
