import { format, subDays } from 'date-fns'

/**
 * Small helpers that read and write single tokens of the library search
 * syntax (the same syntax the backend parser accepts). Status tabs and quick
 * filters only ever edit the query text through these functions, so the
 * search box stays the single source of truth.
 */

/** Splits a query into tokens, keeping quoted values ("plan to read") together. */
export function tokenizeQuery(query: string): string[] {
  const tokens: string[] = []
  let current = ''
  let quote: string | null = null
  for (const char of query) {
    if (quote) {
      current += char
      if (char === quote) quote = null
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      current += char
      continue
    }
    if (/\s/.test(char)) {
      if (current) tokens.push(current)
      current = ''
      continue
    }
    current += char
  }
  if (current) tokens.push(current)
  return tokens
}

function unquote(value: string): string {
  const first = value.at(0)
  if (value.length >= 2 && (first === '"' || first === "'") && value.endsWith(first)) {
    return value.slice(1, -1)
  }
  return value
}

function isStatusToken(token: string): boolean {
  return token.toLowerCase().startsWith('status:')
}

/**
 * Returns the status the query filters on when it holds exactly one plain
 * `status:` token with one value, or null when there is none.
 * Returns 'custom' for anything the tabs cannot represent (several values,
 * several tokens).
 */
export function getStatusFilter(query: string): string | null {
  const statusTokens = tokenizeQuery(query).filter(isStatusToken)
  if (statusTokens.length === 0) return null
  const [only] = statusTokens
  if (statusTokens.length > 1 || only === undefined) return 'custom'
  const value = unquote(only.slice('status:'.length)).trim()
  if (value === '' || value.includes(',')) return 'custom'
  return value.toLowerCase()
}

/** Replaces every plain `status:` token with one for `status` (or removes them). */
export function setStatusFilter(query: string, status: string | null): string {
  const rest = tokenizeQuery(query).filter((token) => !isStatusToken(token))
  if (status) {
    const value = /\s/.test(status) ? `"${status.toLowerCase()}"` : status.toLowerCase()
    rest.unshift(`status:${value}`)
  }
  return rest.join(' ')
}

export function hasToken(query: string, token: string): boolean {
  const wanted = token.toLowerCase()
  return tokenizeQuery(query).some((candidate) => candidate.toLowerCase() === wanted)
}

/** Adds the token when it is missing, removes it when present. */
export function toggleToken(query: string, token: string): string {
  const tokens = tokenizeQuery(query)
  const wanted = token.toLowerCase()
  const remaining = tokens.filter((candidate) => candidate.toLowerCase() !== wanted)
  return (remaining.length === tokens.length ? [...tokens, token] : remaining).join(' ')
}

export type QuickFilter = { label: string; token: string }

/** Presets shown as quick filter chips. Each is exactly one search token. */
export function getQuickFilters(today: Date = new Date()): QuickFilter[] {
  return [
    { label: 'Rated 8+', token: 'rating:>=8' },
    { label: 'Unrated', token: 'rating:none' },
    { label: 'No total chapters', token: 'total:none' },
    { label: 'No cover', token: 'cover:none' },
    {
      label: 'Untouched 90 days',
      token: `updated:<${format(subDays(today, 90), 'yyyy-MM-dd')}`,
    },
  ]
}

export type DescribedToken = {
  negated: boolean
  field: string | null
  operator: string
  value: string
}

const operatorWords: Record<string, string> = { '>=': '≥', '<=': '≤', '>': '>', '<': '<', '=': '=' }

/** Turns one token into words for a pill: `-tag:harem` → tag · not · harem. */
export function describeToken(token: string): DescribedToken {
  const negated = token.startsWith('-')
  const body = negated ? token.slice(1) : token
  const colon = body.indexOf(':')
  if (colon <= 0) {
    return { negated, field: null, operator: negated ? 'without' : 'text', value: unquote(body) }
  }
  const field = body.slice(0, colon)
  const raw = unquote(body.slice(colon + 1))
  const comparison = /^(>=|<=|>|<|=)(.*)$/.exec(raw)
  if (comparison) {
    const [, op = '=', rest = ''] = comparison
    return { negated, field, operator: operatorWords[op] ?? op, value: rest }
  }
  if (raw.toLowerCase() === 'none') {
    return { negated, field, operator: negated ? 'is set' : 'is', value: negated ? '' : 'missing' }
  }
  return {
    negated,
    field,
    operator: negated ? 'not' : 'is',
    value: raw
      .split(',')
      .map((part) => unquote(part.trim()))
      .join(' or '),
  }
}

/** Removes the token at `index` (as counted by tokenizeQuery). */
export function removeTokenAt(query: string, index: number): string {
  return tokenizeQuery(query)
    .filter((_, position) => position !== index)
    .join(' ')
}
