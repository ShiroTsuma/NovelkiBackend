import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bookFilesApi, type BookFileList } from '@/api/bookFiles'
import { EpubSearchClientContext } from '@/features/epubSearch/clientContext'
import { createMockEpubSearchClient } from '@/features/epubSearch/mockClient'
import { renderWithProviders } from '@/test/render'
import { BookFilesPanel } from './BookFilesPanel'

const fileList: BookFileList = {
  files: [
    {
      id: 'file-1',
      bookId: 'book-1',
      title: 'Volume 1',
      originalFileName: 'volume-1.epub',
      sortOrder: 0,
      sizeBytes: 1_200_000,
      createdAt: '2026-07-18T20:37:00Z',
      deletedAtUtc: null,
      isShared: false,
    },
  ],
  snapshotId: null,
  usedStorageBytes: 1_200_000,
  maxStorageBytes: 10_000_000_000,
  maxFileBytes: 100_000_000,
  maxUploadBytes: 300_000_000,
}

describe('BookFilesPanel EPUB search', () => {
  beforeEach(() => {
    vi.spyOn(bookFilesApi, 'list').mockResolvedValue(fileList)
  })

  it('opens the EPUB search for the book and continues file numbering', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <BookFilesPanel
        bookId="book-1"
        searchBook={{
          id: 'book-1',
          title: 'Super Soldier',
          alternativeTitles: [],
          chaptersRead: 110,
          chapterLabel: '110',
        }}
      />,
    )

    expect(await screen.findByText(/1 file/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Find & download' }))

    const dialog = screen.getByRole('dialog', { name: 'Find EPUB' })
    expect(dialog).toHaveTextContent("you're at Ch. 110")
    expect(screen.getByRole('searchbox')).toHaveValue('Super Soldier')
  })

  it('hides Find EPUB when no book details are given', async () => {
    renderWithProviders(<BookFilesPanel bookId="book-1" />)
    expect(await screen.findByText(/1 file/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Find & download' })).not.toBeInTheDocument()
  })

  it('keeps a background download visible in the panel', async () => {
    const user = userEvent.setup()
    const client = createMockEpubSearchClient({
      wait: () => Promise.resolve(),
      msPerChapter: 1_000_000,
    })
    renderWithProviders(
      <EpubSearchClientContext value={client}>
        <BookFilesPanel
          bookId="book-1"
          searchBook={{
            id: 'book-1',
            title: 'Super Soldier',
            alternativeTitles: [],
            chaptersRead: 110,
            chapterLabel: '110',
          }}
        />
      </EpubSearchClientContext>,
    )

    await user.click(await screen.findByRole('button', { name: 'Find & download' }))
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await user.click(await screen.findByRole('radio', { name: /Source A/ }))
    await user.click(screen.getByRole('button', { name: 'Use this source' }))
    await user.click(screen.getByRole('button', { name: 'Start download' }))
    await user.click(await screen.findByRole('button', { name: 'Run in background' }))

    expect(screen.queryByRole('dialog', { name: 'Find EPUB' })).not.toBeInTheDocument()
    expect(await screen.findByText('Downloading from Source A')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Details' }))
    expect(screen.getByRole('dialog', { name: 'Find EPUB' })).toBeInTheDocument()
  })
})
