import type { BookImportSessionDto } from '@/api/types'

export function getImportSessionStats(session: BookImportSessionDto | null) {
  const invalidRows = session?.rows.filter((row) => !row.isValid) ?? []
  const totalRows = session?.totalRows ?? 0
  const validRows = session?.validRows ?? 0

  return {
    invalidRows,
    invalidRowsCount: session?.invalidRows ?? 0,
    progressPercent: totalRows === 0 ? 0 : (validRows / totalRows) * 100,
    totalRows,
    validRows,
  }
}
