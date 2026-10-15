import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Route, Routes } from 'react-router-dom'
import { api } from '@/api/client'
import { books, dictionaries, genres, paginated, statuses } from '@/test/fixtures'
import { renderWithProviders } from '@/test/render'
import { BookFormPage } from './BookFormPage'
import { bindPendingCoverUpload, stagePendingCoverUpload } from './coverUploadOutbox'

vi.mock('@/api/client', () => ({
  api: {
    getBook: vi.fn(),
    getAdminBook: vi.fn(),
    getTypes: vi.fn(),
    getStatuses: vi.fn(),
    getGenres: vi.fn(),
    searchAuthors: vi.fn(),
    searchTags: vi.fn(),
    getBooks: vi.fn(),
    createBook: vi.fn(),
    parseBookHtml: vi.fn(),
    updateBook: vi.fn(),
    updateAdminBook: vi.fn(),
    uploadBookCover: vi.fn(),
    setBookCoverFromUrl: vi.fn(),
    deleteBookCover: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}))

vi.mock('./coverUploadOutbox', () => ({
  stagePendingCoverUpload: vi.fn(),
  bindPendingCoverUpload: vi.fn(),
  discardPendingCoverUpload: vi.fn(),
}))

describe('BookFormPage', () => {
  beforeEach(() => {
    vi.mocked(api.getTypes).mockResolvedValue(paginated(dictionaries))
    vi.mocked(api.getStatuses).mockResolvedValue(paginated(statuses))
    vi.mocked(api.getGenres).mockResolvedValue(paginated(genres))
    vi.mocked(api.searchAuthors).mockResolvedValue([])
    vi.mocked(api.searchTags).mockResolvedValue([])
    vi.mocked(api.getBooks).mockResolvedValue({ skip: 0, take: 10, total: 0, data: [] })
    vi.mocked(api.createBook).mockResolvedValue({ id: 'book-1' })
    vi.mocked(stagePendingCoverUpload).mockResolvedValue('11111111-1111-1111-1111-111111111111')
    vi.mocked(bindPendingCoverUpload).mockResolvedValue()
  })

  it('disables native browser validation for numeric fields and keeps the controlled inputs text-based', async () => {
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    const form = await screen.findByRole('button', { name: /^(Save changes|Add to library)$/ })
    const currentChapterInput = screen.getByLabelText<HTMLInputElement>('Current chapter')
    const totalChaptersInput = screen.getByLabelText<HTMLInputElement>('Total chapters')
    expect(form.closest('form')).toHaveAttribute('novalidate')
    expect(currentChapterInput.type).toBe('text')
    expect(currentChapterInput).toHaveAttribute('inputmode', 'numeric')
    expect(totalChaptersInput.type).toBe('text')
    expect(totalChaptersInput).toHaveAttribute('inputmode', 'decimal')
  })

  it('rejects total chapters equal to zero with a field error', async () => {
    const user = userEvent.setup()
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    await screen.findByText('Add book')
    await user.type(screen.getByLabelText('Primary title'), 'Shadow Slave')
    await user.type(screen.getByLabelText('Author'), 'Guiltythree')
    await user.type(screen.getByLabelText('Current chapter'), '0')
    await user.type(screen.getByLabelText('Total chapters'), '0')
    await user.click(screen.getByRole('button', { name: /^(Save changes|Add to library)$/ }))

    expect(await screen.findByText('Total chapters must be greater than 0.')).toBeInTheDocument()
    expect(api.createBook).not.toHaveBeenCalled()
  })

  it('submits blank total chapters as null', async () => {
    const user = userEvent.setup()
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    await screen.findByText('Add book')
    await user.type(screen.getByLabelText('Primary title'), 'Shadow Slave')
    await user.type(screen.getByLabelText('Author'), 'Guiltythree')
    await user.type(screen.getByLabelText('Current chapter'), '0')
    await user.click(screen.getByRole('button', { name: /^(Save changes|Add to library)$/ }))

    await waitFor(() => expect(api.createBook).toHaveBeenCalled())
    expect(vi.mocked(api.createBook).mock.calls[0]![0].totalChapters).toBeNull()
    expect(vi.mocked(api.createBook).mock.calls[0]![0].currentChapterNumber).toBe(0)
  })

  it('parses pasted HTML, previews every resolved field, and applies it to the create draft', async () => {
    vi.mocked(api.parseBookHtml).mockResolvedValue({
      source: 'NovelUpdates',
      primaryTitle: 'Parsed Novel',
      authorName: 'Primary Author',
      contentType: { id: dictionaries[0]!.id, name: dictionaries[0]!.name },
      alternativeTitles: ['Alternate Name'],
      genres: [
        { id: genres[0]!.id, name: genres[0]!.name },
        { id: null, name: 'Unmapped Genre' },
      ],
      tags: ['Chinese', 'Slow Romance'],
      description: 'Parsed description.',
      canonicalUrl: 'https://www.novelupdates.com/series/parsed-novel/',
      coverUrl: 'https://cdn.example.com/parsed-cover.jpg',
      warnings: ["Genre 'Unmapped Genre' is not present in the library and will be skipped."],
    })
    const user = userEvent.setup()
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    await screen.findByText('Add book')
    await user.click(screen.getByRole('button', { name: 'Parse HTML' }))
    const dialog = screen.getByRole('dialog', { name: 'Parse page HTML' })
    fireEvent.change(within(dialog).getByLabelText('Full page HTML'), {
      target: { value: '<html>source</html>' },
    })
    await user.click(within(dialog).getByRole('button', { name: 'Parse HTML' }))

    expect(await within(dialog).findByText('NovelUpdates')).toBeInTheDocument()
    expect(within(dialog).getByText(/Unmapped Genre/)).toBeInTheDocument()
    within(dialog)
      .getAllByRole('checkbox')
      .forEach((checkbox) => expect(checkbox).toBeChecked())
    await user.click(within(dialog).getByRole('button', { name: 'Apply selected' }))

    expect(screen.getByLabelText('Primary title')).toHaveValue('Parsed Novel')
    expect(screen.getByLabelText('Author')).toHaveValue('Primary Author')
    expect(screen.getByLabelText('Description')).toHaveValue('Parsed description.')
    expect(screen.getByLabelText('Alternative title 1')).toHaveValue('Alternate Name')
    expect(screen.getByLabelText('Link 1 URL')).toHaveValue(
      'https://www.novelupdates.com/series/parsed-novel/',
    )

    await user.type(screen.getByLabelText('Current chapter'), '0')
    await user.click(screen.getByRole('button', { name: /^(Save changes|Add to library)$/ }))

    await waitFor(() => expect(api.createBook).toHaveBeenCalled())
    const request = vi.mocked(api.createBook).mock.calls[0]![0]
    expect(request).toMatchObject({
      primaryTitle: 'Parsed Novel',
      authorName: 'Primary Author',
      contentTypeId: dictionaries[0]!.id,
      genreIds: [genres[0]!.id],
      tags: ['Chinese', 'Slow Romance'],
      description: 'Parsed description.',
    })
    expect(request.alternativeTitles.map((title) => title.title)).toEqual(['Alternate Name'])
    expect(request.links.map((link) => link.url)).toContain(
      'https://www.novelupdates.com/series/parsed-novel/',
    )
    expect(request.initialCoverUrl).toBe('https://cdn.example.com/parsed-cover.jpg')
    expect(api.setBookCoverFromUrl).not.toHaveBeenCalled()
  })

  it('queues a local cover upload before creating the book instead of waiting for the network upload', async () => {
    const user = userEvent.setup()
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    await screen.findByText('Add book')
    await user.type(screen.getByLabelText('Primary title'), 'Shadow Slave')
    await user.type(screen.getByLabelText('Current chapter'), '0')
    const input = screen.getByLabelText('Choose a cover file')
    const file = new File(['cover'], 'cover.jpg', { type: 'image/jpeg' })
    await user.upload(input, file)

    await user.click(screen.getByRole('button', { name: /^(Save changes|Add to library)$/ }))

    await waitFor(() => expect(api.createBook).toHaveBeenCalled())
    expect(stagePendingCoverUpload).toHaveBeenCalledWith(file)
    expect(vi.mocked(api.createBook).mock.calls[0]![0].initialCoverUploadToken).toBe(
      '11111111-1111-1111-1111-111111111111',
    )
    expect(bindPendingCoverUpload).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      'book-1',
    )
    expect(api.uploadBookCover).not.toHaveBeenCalled()
  })

  it('keeps an existing field when the user deselects it in the HTML preview', async () => {
    vi.mocked(api.parseBookHtml).mockResolvedValue({
      source: 'NovelUpdates',
      primaryTitle: 'Resolved title',
      authorName: null,
      contentType: null,
      alternativeTitles: [],
      genres: [],
      tags: [],
      description: 'Resolved description.',
      canonicalUrl: null,
      coverUrl: null,
      warnings: [],
    })
    const user = userEvent.setup()
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    await screen.findByText('Add book')
    await user.type(screen.getByLabelText('Primary title'), 'Manual title')
    await user.click(screen.getByRole('button', { name: 'Parse HTML' }))
    const dialog = screen.getByRole('dialog', { name: 'Parse page HTML' })
    fireEvent.change(within(dialog).getByLabelText('Full page HTML'), {
      target: { value: '<html>source</html>' },
    })
    await user.click(within(dialog).getByRole('button', { name: 'Parse HTML' }))
    await within(dialog).findByText('Resolved title')

    await user.click(within(dialog).getByRole('checkbox', { name: /Primary title/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Apply selected' }))

    expect(screen.getByLabelText('Primary title')).toHaveValue('Manual title')
    expect(screen.getByLabelText('Description')).toHaveValue('Resolved description.')
  })

  it.each(['RoyalRoad', 'ScribbleHub', 'WebNovel'])(
    'shows the detected %s resolver source',
    async (source) => {
      vi.mocked(api.parseBookHtml).mockResolvedValue({
        source,
        primaryTitle: 'Resolved title',
        authorName: null,
        contentType: null,
        alternativeTitles: [],
        genres: [],
        tags: [],
        description: null,
        canonicalUrl: null,
        coverUrl: null,
        warnings: [],
      })
      const user = userEvent.setup()
      renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

      await screen.findByText('Add book')
      await user.click(screen.getByRole('button', { name: 'Parse HTML' }))
      const dialog = screen.getByRole('dialog', { name: 'Parse page HTML' })
      fireEvent.change(within(dialog).getByLabelText('Full page HTML'), {
        target: { value: '<html>source</html>' },
      })
      await user.click(within(dialog).getByRole('button', { name: 'Parse HTML' }))

      expect(await within(dialog).findByText(source)).toBeInTheDocument()
    },
  )

  it('does not treat a title substring search result as an exact duplicate', async () => {
    vi.mocked(api.getBooks).mockResolvedValue({
      skip: 0,
      take: 10,
      total: 1,
      data: [{ ...books[0]!, primaryTitle: "History's Greatest Husband" }],
    })
    const user = userEvent.setup()
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    await screen.findByText('Add book')
    await user.type(screen.getByLabelText('Primary title'), 'test')
    await user.type(screen.getByLabelText('Current chapter'), '0')
    await user.click(screen.getByRole('button', { name: /^(Save changes|Add to library)$/ }))

    await waitFor(() => expect(api.createBook).toHaveBeenCalled())
    expect(api.getBooks).not.toHaveBeenCalled()
  })

  it('requires current chapter and only accepts digits', async () => {
    const user = userEvent.setup()
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    await screen.findByText('Add book')
    await user.type(screen.getByLabelText('Primary title'), 'Shadow Slave')
    await user.click(screen.getByLabelText('Current chapter'))
    await user.tab()

    expect(screen.queryByText('Current chapter is required.')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^(Save changes|Add to library)$/ }))

    expect(await screen.findByText('Current chapter is required.')).toBeInTheDocument()
    expect(api.createBook).not.toHaveBeenCalled()

    const currentChapterInput = screen.getByLabelText('Current chapter')
    await user.type(currentChapterInput, '12e-3.4abc')
    expect(currentChapterInput).toHaveValue('1234')
  })

  it('normalizes the total chapters field while typing', async () => {
    const user = userEvent.setup()
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    await screen.findByText('Add book')

    const totalChaptersInput = screen.getByLabelText('Total chapters')
    await user.type(totalChaptersInput, '4..5x')
    expect(totalChaptersInput).toHaveValue('4.5')
  })

  it('picks priority from 1 to 5 and clears it on a second click', async () => {
    const user = userEvent.setup()
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    await screen.findByText('Add book')
    const priorityTwo = screen.getByRole('button', { name: 'Set priority to 2' })
    await user.click(priorityTwo)
    expect(priorityTwo).toHaveAttribute('aria-pressed', 'true')
    await user.click(priorityTwo)
    expect(priorityTwo).toHaveAttribute('aria-pressed', 'false')
  })

  it('selects a rating from 1 to 10 and clears it', async () => {
    const user = userEvent.setup()
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    await screen.findByText('Add book')
    const ratingSeven = screen.getByRole('button', { name: 'Set rating to 7/10' })
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled()

    await user.click(ratingSeven)
    expect(ratingSeven).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(ratingSeven).toHaveAttribute('aria-pressed', 'false')
  })

  it('renders type and status choices in domain order', async () => {
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    await screen.findByText('Add book')

    const type = screen.getByRole('group', { name: 'Type' })
    const status = screen.getByRole('group', { name: 'Status' })
    expect(
      within(type)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Novel', 'Manga'])
    expect(
      within(status)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['Reading', 'Completed'])
    expect(within(type).getByRole('button', { name: 'Novel' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('lays the form out as in the mock: sections, side panel and a sticky save bar', async () => {
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    const identity = await screen.findByRole('heading', { name: 'Identity' })
    const progress = screen.getByRole('heading', { name: 'Progress' })
    const genres = screen.getByRole('heading', { name: 'Genres & tags' })
    const details = screen.getByRole('heading', { name: 'Details' })
    const cover = screen.getByTestId('book-cover-editor')

    expect(
      identity.compareDocumentPosition(progress) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(progress.compareDocumentPosition(genres) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(genres.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByTestId('book-form-rail')).toContainElement(cover)
    expect(screen.getByRole('status')).toHaveTextContent('New book')
    expect(screen.getByRole('button', { name: 'Add to library' })).toHaveAttribute('type', 'submit')
  })

  it('keeps link labels and drops empty rows when saving', async () => {
    const user = userEvent.setup()
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    await screen.findByText('Add book')
    await user.type(screen.getByLabelText('Primary title'), 'Shadow Slave')
    await user.type(screen.getByLabelText('Current chapter'), '3')
    await user.click(screen.getByRole('button', { name: '+ Add alternative title' }))
    await user.type(screen.getByLabelText('Alternative title 1'), 'SS')
    await user.click(screen.getByRole('button', { name: '+ Add alternative title' }))
    await user.click(screen.getByRole('button', { name: '+ Add link' }))
    await user.type(screen.getByLabelText('Link 1 label'), 'NovelUpdates')
    await user.type(screen.getByLabelText('Link 1 URL'), 'https://example.com/ss')
    await user.click(screen.getByRole('button', { name: '+ Add link' }))
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved changes')
    await user.click(screen.getByRole('button', { name: 'Add to library' }))

    await waitFor(() => expect(api.createBook).toHaveBeenCalled())
    const request = vi.mocked(api.createBook).mock.calls[0]![0]
    expect(request.alternativeTitles.map((title) => title.title)).toEqual(['SS'])
    expect(request.links).toEqual([
      expect.objectContaining({ label: 'NovelUpdates', url: 'https://example.com/ss' }),
    ])
  })

  it('shows the matched alias but submits the primary author identity', async () => {
    const user = userEvent.setup()
    vi.mocked(api.searchAuthors).mockResolvedValue([
      {
        id: 'author-1',
        primaryName: 'Er Gen',
        otherNames: ['Ergen'],
        isPublic: true,
        isOwned: false,
      },
    ])
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    await screen.findByText('Add book')
    await user.type(screen.getByLabelText('Primary title'), 'Renegade Immortal')
    await user.type(screen.getByLabelText('Author'), 'Ergen')
    expect(
      await screen.findByRole('button', { name: /Er Gen \(Ergen\).*Public/i }),
    ).toBeInTheDocument()
    await user.click(screen.getByLabelText('Current chapter'))

    expect(screen.getByLabelText('Author')).toHaveValue('Er Gen (Ergen)')
    await user.type(screen.getByLabelText('Current chapter'), '1')
    await user.click(screen.getByRole('button', { name: /^(Save changes|Add to library)$/ }))

    await waitFor(() => expect(api.createBook).toHaveBeenCalled())
    expect(vi.mocked(api.createBook).mock.calls[0]![0]).toMatchObject({
      authorId: 'author-1',
      authorName: 'Er Gen',
    })
  })

  it('hides a technical cover download error on the edit page', async () => {
    vi.mocked(api.getBook).mockResolvedValue({
      ...books[0]!,
      cover: {
        id: 'cover-1',
        status: 'Failed',
        failureReason: 'Response status code does not indicate success: 301 (Moved Permanently).',
      },
    })

    renderWithProviders(
      <Routes>
        <Route element={<BookFormPage mode="edit" />} path="/books/:id/edit" />
      </Routes>,
      { route: '/books/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/edit' },
    )

    expect(
      await screen.findByText(
        'A cover was found, but the image could not be downloaded. Try searching again or upload a cover manually.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/301 \(Moved Permanently\)/)).not.toBeInTheDocument()
  })

  it('shows tag descriptions in the suggestion list', async () => {
    vi.mocked(api.searchTags).mockResolvedValue([
      {
        id: 'tag-1',
        name: 'cultivation',
        description: 'Progression through spiritual realms and techniques.',
        isGlobal: true,
      },
    ])

    const user = userEvent.setup()
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    await screen.findByText('Add book')
    await user.type(screen.getByRole('combobox', { name: 'Add tag' }), 'cult')

    expect(
      await screen.findByText('Progression through spiritual realms and techniques.'),
    ).toBeInTheDocument()
  })

  it('debounces author and tag suggestion requests while typing', async () => {
    const user = userEvent.setup()
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    await screen.findByText('Add book')
    await user.type(screen.getByLabelText('Author'), 'Ergen')

    expect(api.searchAuthors).not.toHaveBeenCalled()
    await waitFor(() => expect(api.searchAuthors).toHaveBeenCalledTimes(1))
    expect(api.searchAuthors).toHaveBeenLastCalledWith('Ergen', 8)

    await user.type(screen.getByRole('combobox', { name: 'Add tag' }), 'cult')

    expect(api.searchTags).not.toHaveBeenCalled()
    await waitFor(() => expect(api.searchTags).toHaveBeenCalledTimes(1))
    expect(api.searchTags).toHaveBeenLastCalledWith('cult', 8)
  })

  it('accepts active genre and tag suggestions with Tab without losing focus', async () => {
    vi.mocked(api.searchTags).mockResolvedValue([
      {
        id: 'tag-1',
        name: 'cultivation',
        description: 'Progression fantasy',
        isGlobal: true,
      },
    ])
    const user = userEvent.setup()
    renderWithProviders(<BookFormPage mode="create" />, { route: '/books/new' })

    await screen.findByText('Add book')
    const genreInput = screen.getByRole('combobox', { name: 'Add genre' })
    await user.type(genreInput, 'Fan')
    await user.keyboard('{Tab}')
    expect(screen.getByText('Fantasy')).toBeInTheDocument()
    expect(genreInput).toHaveFocus()

    const tagInput = screen.getByRole('combobox', { name: 'Add tag' })
    await user.type(tagInput, 'cult')
    expect(await screen.findByRole('option', { name: /cultivation/i })).toBeInTheDocument()
    await user.keyboard('{Tab}')
    expect(screen.getByText('cultivation')).toBeInTheDocument()
    expect(tagInput).toHaveFocus()
  })
})
