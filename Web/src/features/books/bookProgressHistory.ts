import type { BookProgressHistoryDto } from '@/api/types'

export function getProgressHistoryWithDeltas(entries: BookProgressHistoryDto[]) {
  const sorted = [...entries].sort(
    (left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime(),
  )

  return sorted.map((entry, index) => {
    const previousEntry = sorted[index + 1]
    const currentChapterNumber = entry.chapterNumber
    const previousChapterNumber = previousEntry?.chapterNumber
    const delta =
      currentChapterNumber != null && previousChapterNumber != null
        ? currentChapterNumber - previousChapterNumber
        : null

    return {
      ...entry,
      delta: delta && delta !== 0 ? delta : null,
    }
  })
}
