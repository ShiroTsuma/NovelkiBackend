import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getStatusTone } from './bookStatus'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it.each([
    ['Reading', 'reading'],
    ['Completed', 'finished'],
    ['Plan To Read', 'plan'],
    ['On Hold', 'hold'],
    ['Dropped', 'dropped'],
    ['Something else', 'unknown'],
  ])('maps %s to the %s tone', (status, tone) => {
    expect(getStatusTone(status)).toBe(tone)
    render(<StatusBadge status={status} />)
    expect(screen.getByLabelText(`Book status: ${status}`)).toHaveAttribute('data-tone', tone)
  })

  it('gives Completed the only filled treatment', () => {
    render(
      <>
        <StatusBadge status="On Hold" />
        <StatusBadge status="Completed" />
      </>,
    )
    expect(screen.getByLabelText('Book status: Completed')).toHaveClass('bg-status-finished')
    expect(screen.getByLabelText('Book status: On Hold')).toHaveClass('bg-status-hold-soft')
  })
})
