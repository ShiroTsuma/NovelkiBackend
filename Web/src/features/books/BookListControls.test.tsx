import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QuickFilters, StatusTabs } from './BookListControls'

describe('StatusTabs', () => {
  it('marks the tab that matches the status token', () => {
    render(<StatusTabs query='status:"plan to read" dragon' onQueryChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Plan to read' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('rewrites only the status token of the query', async () => {
    const onQueryChange = vi.fn()
    render(<StatusTabs query="status:reading genre:fantasy" onQueryChange={onQueryChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Completed' }))
    expect(onQueryChange).toHaveBeenLastCalledWith('status:completed genre:fantasy')
    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(onQueryChange).toHaveBeenLastCalledWith('genre:fantasy')
  })
})

describe('QuickFilters', () => {
  it('toggles a token and shows its syntax', async () => {
    const onQueryChange = vi.fn()
    const { rerender } = render(<QuickFilters query="dragon" onQueryChange={onQueryChange} />)
    const rated = screen.getByRole('button', { name: /Rated 8\+/ })
    expect(rated).toHaveTextContent('rating:>=8')
    expect(rated).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(rated)
    expect(onQueryChange).toHaveBeenLastCalledWith('dragon rating:>=8')

    rerender(<QuickFilters query="dragon rating:>=8" onQueryChange={onQueryChange} />)
    expect(screen.getByRole('button', { name: /Rated 8\+/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await userEvent.click(screen.getByRole('button', { name: /Rated 8\+/ }))
    expect(onQueryChange).toHaveBeenLastCalledWith('dragon')
  })
})
