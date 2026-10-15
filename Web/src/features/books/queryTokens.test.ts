import { describe, expect, it } from 'vitest'
import {
  describeToken,
  getStatusFilter,
  hasToken,
  removeTokenAt,
  toggleTokenNegationAt,
  setStatusFilter,
  tokenizeQuery,
  toggleToken,
} from './queryTokens'

describe('tokenizeQuery', () => {
  it('keeps quoted values together', () => {
    expect(tokenizeQuery('status:"plan to read"  rating:>=8 dragon')).toEqual([
      'status:"plan to read"',
      'rating:>=8',
      'dragon',
    ])
  })
})

describe('getStatusFilter', () => {
  it('reads a single status token', () => {
    expect(getStatusFilter('status:Reading genre:fantasy')).toBe('reading')
    expect(getStatusFilter('status:"plan to read"')).toBe('plan to read')
  })

  it('returns null without a status token and ignores exclusions', () => {
    expect(getStatusFilter('genre:fantasy -status:dropped')).toBeNull()
  })

  it('reports queries the tabs cannot represent', () => {
    expect(getStatusFilter('status:reading,completed')).toBe('custom')
    expect(getStatusFilter('status:reading status:completed')).toBe('custom')
  })
})

describe('setStatusFilter', () => {
  it('replaces the status token and keeps everything else', () => {
    expect(setStatusFilter('status:reading genre:fantasy', 'completed')).toBe(
      'status:completed genre:fantasy',
    )
  })

  it('quotes multi-word statuses', () => {
    expect(setStatusFilter('', 'Plan To Read')).toBe('status:"plan to read"')
  })

  it('removes the filter for "all"', () => {
    expect(setStatusFilter('status:reading -status:dropped dragon', null)).toBe(
      '-status:dropped dragon',
    )
  })
})

describe('toggleToken', () => {
  it('adds and removes a token case-insensitively', () => {
    const added = toggleToken('genre:fantasy', 'rating:>=8')
    expect(added).toBe('genre:fantasy rating:>=8')
    expect(hasToken(added, 'RATING:>=8')).toBe(true)
    expect(toggleToken(added, 'rating:>=8')).toBe('genre:fantasy')
  })
})

describe('describeToken', () => {
  it('describes fields, comparisons, exclusions and missing values', () => {
    expect(describeToken('genre:fantasy,romance')).toEqual({
      negated: false,
      field: 'genre',
      operator: 'is',
      value: 'fantasy or romance',
    })
    expect(describeToken('rating:>=8')).toMatchObject({
      field: 'rating',
      operator: '≥',
      value: '8',
    })
    expect(describeToken('-tag:harem')).toMatchObject({
      negated: true,
      operator: 'not',
      value: 'harem',
    })
    expect(describeToken('total:none')).toMatchObject({ operator: 'is', value: 'missing' })
    expect(describeToken('dragon')).toMatchObject({
      field: null,
      operator: 'text',
      value: 'dragon',
    })
  })
})

describe('removeTokenAt', () => {
  it('removes only the token at the given position', () => {
    expect(removeTokenAt('status:reading dragon dragon', 1)).toBe('status:reading dragon')
  })
})

describe('toggleTokenNegationAt', () => {
  it('excludes and re-includes only the token at the given position', () => {
    const excluded = toggleTokenNegationAt('genre:fantasy tag:"slow burn"', 1)
    expect(excluded).toBe('genre:fantasy -tag:"slow burn"')
    expect(toggleTokenNegationAt(excluded, 1)).toBe('genre:fantasy tag:"slow burn"')
  })
})
