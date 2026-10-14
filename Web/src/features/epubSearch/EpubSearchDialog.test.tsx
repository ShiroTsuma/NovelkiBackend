import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '@/test/render'
import { EpubSearchClientContext } from './clientContext'
import { EpubSearchDialog, type EpubSearchBook } from './EpubSearchDialog'
import { createMockEpubSearchClient } from './mockClient'

const book: EpubSearchBook = {
  id: 'book-1',
  title: 'My Entire Class Was Summoned to Another World except for Me',
  alternativeTitles: ['Class ga Isekai Shoukan Sareta Naka Ore dake Nokottan Desu ga'],
  chaptersRead: 167,
  chapterLabel: '166',
  existingFileCount: 3,
}

function renderDialog(onDownloadFinished = vi.fn()) {
  const client = createMockEpubSearchClient({ wait: () => Promise.resolve(), msPerChapter: 0 })
  renderWithProviders(
    <EpubSearchClientContext value={client}>
      <EpubSearchDialog
        book={book}
        open
        onClose={vi.fn()}
        onDownloadFinished={onDownloadFinished}
      />
    </EpubSearchClientContext>,
  )
  return { onDownloadFinished }
}

describe('EpubSearchDialog', () => {
  it('searches, picks a source, plans the files and starts a download', async () => {
    const user = userEvent.setup()
    renderDialog()

    expect(screen.getByRole('searchbox')).toHaveValue(book.title)
    await user.click(
      screen.getByRole('button', {
        name: 'Class ga Isekai Shoukan Sareta Naka Ore dake Nokottan Desu ga',
      }),
    )
    expect(screen.getByRole('searchbox')).toHaveValue(book.alternativeTitles[0])
    await user.click(screen.getByRole('button', { name: 'Search' }))

    const useSource = screen.getByRole('button', { name: 'Use this source' })
    expect(useSource).toBeDisabled()
    await user.click(await screen.findByRole('radio', { name: /Source A/ }))
    expect(screen.getByRole('radio', { name: /Source A/ })).toHaveAttribute('aria-checked', 'true')
    await user.click(useSource)

    expect(screen.getByRole('radio', { name: /Continue from my progress/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    expect(screen.getByText(/Volume 4, Volume 5/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Start download' }))
    expect(
      await screen.findByRole('progressbar', { name: 'Download progress' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Volume 4')).toBeInTheDocument()
  })

  it('reports a finished download once', async () => {
    const user = userEvent.setup()
    const { onDownloadFinished } = renderDialog()
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await user.click(await screen.findByRole('radio', { name: /Source A/ }))
    await user.click(screen.getByRole('button', { name: 'Use this source' }))
    await user.click(screen.getByRole('button', { name: 'Start download' }))

    expect(
      await screen.findByText('All files added to the book', {}, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(onDownloadFinished).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it('marks sources that are behind the reader', async () => {
    const user = userEvent.setup()
    renderDialog()
    await user.click(screen.getByRole('button', { name: 'Search' }))
    expect(await screen.findAllByText('Behind you')).not.toHaveLength(0)
    expect(screen.getAllByText('Covers Ch. 168+')).not.toHaveLength(0)
  })
})
