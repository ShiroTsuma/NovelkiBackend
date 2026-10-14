/**
 * Dummy crawler results for the EPUB search mock.
 *
 * Safe to edit: add novels or sources here to try other UI states. Every
 * search returns these candidates, with `{query}` replaced by the searched
 * text so the results look related to the book being viewed.
 */
import type { EpubCandidateNovel } from './types'

export const mockSearchedSourceCount = 42

/** How long a mocked search takes, in milliseconds. */
export const mockSearchDelayMs = 600

/** How long the mock spends on each chapter while "crawling". */
export const mockMsPerChapter = 40

export const mockCandidates: readonly EpubCandidateNovel[] = [
  {
    id: 'novel-primary',
    title: '{query}',
    match: 'title',
    sources: [
      {
        id: 'source-a',
        sourceName: 'Source A',
        url: 'https://source-a.example/novel/sample',
        chapterCount: 311,
        latestChapterLabel: '311-312',
        updatedAt: '2026-10-12T08:00:00Z',
        language: 'en',
      },
      {
        id: 'source-b',
        sourceName: 'Source B',
        url: 'https://source-b.example/book/12345',
        chapterCount: 298,
        latestChapterLabel: 'c298',
        updatedAt: '2026-10-01T08:00:00Z',
        language: 'en',
      },
      {
        id: 'source-c',
        sourceName: 'Source C',
        url: 'https://source-c.example/n/sample',
        chapterCount: 120,
        latestChapterLabel: 'v2c40',
        updatedAt: '2025-09-20T08:00:00Z',
        language: 'en',
      },
    ],
  },
  {
    id: 'novel-similar',
    title: '{query} (fan translation)',
    match: 'similar',
    sources: [
      {
        id: 'source-d',
        sourceName: 'Source D',
        url: 'https://source-d.example/series/sample',
        chapterCount: 45,
        latestChapterLabel: '45',
        updatedAt: '2022-05-02T08:00:00Z',
        language: 'en',
      },
    ],
  },
]
