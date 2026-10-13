import { API_BASE_URL, apiRequest, apiUploadRequest } from './http'

export type BookFile = {
  id: string; bookId: string; title: string; originalFileName: string; sortOrder: number
  sizeBytes: number; createdAt: string; deletedAtUtc: string | null; isShared: boolean
  firstContentLabel?: string | null; lastContentLabel?: string | null
}
export type BookFileList = {
  files: BookFile[]; snapshotId: string | null; usedStorageBytes: number; maxStorageBytes: number
  maxFileBytes: number; maxUploadBytes: number
}
export type ImportEntry = {
  id: string; bookId: string | null; bookTitle: string; contentType: string; title: string
  originalFileName: string; sortOrder: number; sizeBytes: number; error: string | null; isDuplicate: boolean
  firstContentLabel?: string | null; lastContentLabel?: string | null
}
export type FileJob = {
  id: string; bookId: string | null; kind: 'BookImport' | 'LibraryImport' | 'Export' | 'LibraryExport'; status: string
  processedFiles: number; totalFiles: number; expiresAtUtc: string; error: string | null
  entries: ImportEntry[]; warnings: string[]; importedCount: number; skippedCount: number
}
export type ImportSelection = { entryId: string; bookId: string; title: string; sortOrder: number }
export type ExportCandidate = { bookId: string; bookTitle: string; contentType: string; files: BookFile[] }
export type DownloadTicket = { fileId: string; title: string; url: string }

export const bookFilesApi = {
  limits: () => apiRequest<{ maxFileBytes: number; maxUploadBytes: number; maxFilesPerImport: number; maxLibraryArchiveBytes: number; retentionDays: number }>('/book/files/limits'),
  list: (bookId: string) => apiRequest<BookFileList>(`/book/${bookId}/files`),
  publicList: (snapshotId: string) => apiRequest<BookFile[]>(`/public-book/${snapshotId}/files`),
  rename: (bookId: string, fileId: string, title: string) => apiRequest<void>(`/book/${bookId}/files/${fileId}`, { method: 'PUT', body: { title } }),
  reorder: (bookId: string, ids: string[]) => apiRequest<void>(`/book/${bookId}/files/order`, { method: 'PUT', body: ids }),
  share: (bookId: string, ids: string[]) => apiRequest<void>(`/book/${bookId}/files/shared`, { method: 'PUT', body: ids }),
  remove: (bookId: string, fileId: string) => apiRequest<void>(`/book/${bookId}/files/${fileId}`, { method: 'DELETE' }),
  restore: (bookId: string, fileId: string) => apiRequest<void>(`/book/${bookId}/files/${fileId}/restore`, { method: 'POST' }),
  upload: (bookId: string | undefined, files: File[], onProgress: (percent: number) => void, signal: AbortSignal) => {
    const form = new FormData()
    files.forEach(file => form.append('files', file))
    return apiUploadRequest<FileJob>(bookId ? `/book/${bookId}/files/import/sessions` : '/book/files/import/sessions', form, onProgress, signal)
  },
  jobs: () => apiRequest<FileJob[]>('/book/files/sessions'),
  job: (id: string) => apiRequest<FileJob>(`/book/files/sessions/${id}`),
  confirm: (id: string, selection: ImportSelection[]) => apiRequest<FileJob>(`/book/files/sessions/${id}/confirm`, { method: 'POST', body: selection }),
  cancel: (id: string) => apiRequest<void>(`/book/files/sessions/${id}`, { method: 'DELETE' }),
  candidates: (query?: string) => apiRequest<ExportCandidate[]>(`/book/files/export/candidates${query ? `?query=${encodeURIComponent(query)}` : ''}`),
  export: (ids: string[], snapshotId?: string, includeManifest = false) => apiRequest<FileJob>('/book/files/export/sessions', { method: 'POST', body: { fileIds: ids, snapshotId, includeManifest } }),
  downloads: (ids: string[], snapshotId?: string) => apiRequest<DownloadTicket[]>('/book/files/downloads', { method: 'POST', body: { fileIds: ids, snapshotId } }),
  jobDownload: (id: string) => apiRequest<DownloadTicket>(`/book/files/sessions/${id}/download`, { method: 'POST' }),
}

export function startFileDownload(ticket: DownloadTicket) {
  const prefix = '/api/v1'
  if (!ticket.url.startsWith(`${prefix}/book/files/download/`)) throw new Error('Invalid download URL.')
  const link = document.createElement('a')
  link.href = `${API_BASE_URL}${ticket.url.slice(prefix.length)}`
  link.referrerPolicy = 'no-referrer'
  document.body.append(link)
  link.click()
  link.remove()
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MiB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GiB`
}
