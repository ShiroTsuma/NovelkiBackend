/** Sort choices for the result toolbar. A null direction means a cyclic sort (status, type). */
export type SortOption = { label: string; sortBy: string; direction: 'asc' | 'desc' | null }

export const sortOptions: SortOption[] = [
  { label: 'Last updated', sortBy: 'lastModified', direction: 'desc' },
  { label: 'Title', sortBy: 'title', direction: 'asc' },
  { label: 'Author', sortBy: 'author', direction: 'asc' },
  { label: 'Rating', sortBy: 'rating', direction: 'desc' },
  { label: 'Progress', sortBy: 'progress', direction: 'desc' },
  { label: 'Total chapters', sortBy: 'chapters', direction: 'desc' },
  { label: 'Priority', sortBy: 'priority', direction: 'asc' },
  { label: 'Date added', sortBy: 'created', direction: 'desc' },
  { label: 'Status', sortBy: 'status', direction: null },
  { label: 'Type', sortBy: 'type', direction: null },
]
