import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { bookFilesApi, formatFileSize, startFileDownload } from '@/api/bookFiles'
import { buttonVariants } from '@/components/app/DesignSystem'
import { FileJobProgress, FileModal, fileError, isJobWorking, useFileJob } from './FileDialogs'

export function FileExportDialog({ query, onClose }: { query?: string; onClose: () => void }) {
  const client = useQueryClient()
  const [scope, setScope] = useState<'filtered' | 'all'>('filtered')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [visibleBooks, setVisibleBooks] = useState(20)
  const [visibleFiles, setVisibleFiles] = useState<Record<string, number>>({})
  const [jobId, setJobId] = useState<string>()
  const job = useFileJob(jobId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [started, setStarted] = useState(false)
  const initialized = useRef<string | undefined>(undefined)
  const candidates = useQuery({
    queryKey: ['epub-candidates', scope, query],
    queryFn: () => bookFilesApi.candidates(scope === 'filtered' ? query : undefined),
    enabled: !jobId,
    refetchOnWindowFocus: false,
  })
  const limits = useQuery({ queryKey: ['epub-limits'], queryFn: bookFilesApi.limits })
  const jobs = useQuery({
    queryKey: ['epub-jobs'],
    queryFn: bookFilesApi.jobs,
    enabled: !jobId,
    retry: false,
  })
  useEffect(() => {
    const key = `${scope}:${query ?? ''}`
    if (!candidates.data || initialized.current === key) return
    initialized.current = key
    setSelected(new Set(candidates.data.flatMap((b) => b.files.map((f) => f.id))))
  }, [candidates.data, query, scope])
  const files = candidates.data?.flatMap((b) => b.files) ?? []
  const chosen = files.filter((f) => selected.has(f.id))
  const bytes = chosen.reduce((sum, f) => sum + f.sizeBytes, 0)
  const booksCount =
    candidates.data?.filter((b) => b.files.some((f) => selected.has(f.id))).length ?? 0
  const resumable = jobs.data?.find(
    (j) => j.kind === 'LibraryExport' && !['Failed', 'Cancelled', 'Completed'].includes(j.status),
  )
  function toggleFiles(ids: string[], include: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      ids.forEach((id) => (include ? next.add(id) : next.delete(id)))
      return next
    })
  }
  async function create() {
    setBusy(true)
    setError('')
    try {
      const result = await bookFilesApi.export(
        chosen.map((f) => f.id),
        undefined,
        true,
      )
      setJobId(result.id)
      void client.invalidateQueries({ queryKey: ['epub-jobs'] })
    } catch (e) {
      setError(fileError(e))
    } finally {
      setBusy(false)
    }
  }
  async function download() {
    setBusy(true)
    setError('')
    try {
      startFileDownload(await bookFilesApi.jobDownload(jobId!))
      setStarted(true)
    } catch (e) {
      setError(fileError(e))
    } finally {
      setBusy(false)
    }
  }
  async function close() {
    if (jobId && isJobWorking(job.data)) {
      try {
        await bookFilesApi.cancel(jobId)
        void client.invalidateQueries({ queryKey: ['epub-jobs'] })
      } catch (e) {
        setError(fileError(e))
        return
      }
    }
    onClose()
  }
  return (
    <FileModal
      title="Export EPUB files"
      onClose={() => void close()}
      footer={
        <>
          <button className={buttonVariants.secondary} type="button" onClick={() => void close()}>
            {isJobWorking(job.data) ? 'Cancel export' : 'Close'}
          </button>
          {!jobId && (
            <button
              className={buttonVariants.primary}
              type="button"
              disabled={
                busy ||
                candidates.isPending ||
                candidates.isError ||
                chosen.length === 0 ||
                !limits.data ||
                bytes + 16 * 1024 ** 2 > limits.data.maxLibraryArchiveBytes
              }
              onClick={() => void create()}
            >
              {busy ? 'Starting export…' : `Export selected (${chosen.length})`}
            </button>
          )}
        </>
      }
    >
      <p className="file-hint">
        A separate ZIP with EPUBs organised by book and a manifest for restoring titles, order and
        book assignments. Book data and covers use the existing full backup.
      </p>
      {error && (
        <p className="file-error" role="alert">
          {error}
        </p>
      )}
      {job.isError && (
        <p role="alert" className="file-error">
          {fileError(job.error)}{' '}
          <button className={buttonVariants.secondary} onClick={() => void job.refetch()}>
            Retry status
          </button>
        </p>
      )}
      {jobId ? (
        <>
          {job.data ? (
            <FileJobProgress job={job.data} />
          ) : (
            <p className="file-hint">Loading export status…</p>
          )}
          {job.data?.status === 'Ready' && (
            <button
              className={buttonVariants.primary}
              disabled={busy}
              onClick={() => void download()}
            >
              {started ? 'Download archive again' : 'Download EPUB archive'}
            </button>
          )}
          {job.data?.status === 'Ready' && (
            <button
              className={buttonVariants.secondary}
              disabled={busy}
              onClick={() => {
                setBusy(true)
                void bookFilesApi
                  .cancel(jobId)
                  .then(() => {
                    setJobId(undefined)
                    setStarted(false)
                    void client.invalidateQueries({ queryKey: ['epub-jobs'] })
                  })
                  .catch((e) => setError(fileError(e)))
                  .finally(() => setBusy(false))
              }}
            >
              Discard archive and choose again
            </button>
          )}
          {started && (
            <p role="status" className="file-hint">
              Download started. Your browser handles the transfer.
            </p>
          )}
          {job.data?.status === 'Failed' && (
            <button
              className={buttonVariants.secondary}
              onClick={() => {
                setJobId(undefined)
                setError('')
              }}
            >
              Change selection and retry
            </button>
          )}
        </>
      ) : (
        <>
          {resumable && (
            <button className={buttonVariants.secondary} onClick={() => setJobId(resumable.id)}>
              Resume previous EPUB export
            </button>
          )}
          <fieldset className="file-selection-bar">
            <legend className="sr-only">Export scope</legend>
            <label className="file-check">
              <input
                type="radio"
                name="epub-export-scope"
                checked={scope === 'filtered'}
                onChange={() => {
                  setScope('filtered')
                  setVisibleBooks(20)
                }}
              />
              Current filters (all matching pages)
            </label>
            <label className="file-check">
              <input
                type="radio"
                name="epub-export-scope"
                checked={scope === 'all'}
                onChange={() => {
                  setScope('all')
                  setVisibleBooks(20)
                }}
              />
              Entire library
            </label>
          </fieldset>
          {query && scope === 'filtered' && (
            <p className="file-hint break-words">Filter: {query}</p>
          )}
          {candidates.isPending ? (
            <p className="file-hint">Loading books with EPUBs…</p>
          ) : candidates.isError ? (
            <p role="alert" className="file-error">
              Could not load EPUBs.{' '}
              <button
                className={buttonVariants.secondary}
                onClick={() => void candidates.refetch()}
              >
                Retry
              </button>
            </p>
          ) : (
            <>
              <div className="file-selection-bar">
                <strong>
                  {booksCount} books · {chosen.length} EPUBs · {formatFileSize(bytes)}
                </strong>
                <button
                  className={buttonVariants.secondary}
                  onClick={() => setSelected(new Set(files.map((f) => f.id)))}
                >
                  Select all files
                </button>
                <button className={buttonVariants.ghost} onClick={() => setSelected(new Set())}>
                  Clear selection
                </button>
              </div>
              {limits.data && (
                <p className="file-hint">
                  Archive limit: {formatFileSize(limits.data.maxLibraryArchiveBytes)}. Select
                  smaller groups for separate exports if needed.
                </p>
              )}
              {limits.isError && (
                <p className="file-error" role="alert">
                  Could not load export limits.{' '}
                  <button
                    className={buttonVariants.secondary}
                    onClick={() => void limits.refetch()}
                  >
                    Retry
                  </button>
                </p>
              )}
              {files.length === 0 && (
                <p className="file-empty">
                  No active EPUBs in this scope. Add files from a book's details.
                </p>
              )}
              <div className="file-export-books">
                {candidates.data?.slice(0, visibleBooks).map((book) => {
                  const ids = book.files.map((f) => f.id)
                  const count = ids.filter((id) => selected.has(id)).length
                  const countVisible = visibleFiles[book.bookId] ?? 50
                  return (
                    <div key={book.bookId} className="file-export-book">
                      <div className="file-export-book__header">
                        <label className="file-check min-w-0">
                          <input
                            type="checkbox"
                            aria-label={`Export ${book.bookTitle}`}
                            checked={count === ids.length}
                            ref={(node) => {
                              if (node) node.indeterminate = count > 0 && count < ids.length
                            }}
                            onChange={(e) => toggleFiles(ids, e.target.checked)}
                          />
                          <span className="min-w-0 break-words">
                            <strong>{book.bookTitle}</strong>
                            <span className="file-hint block">
                              {book.contentType} · {count} / {ids.length} selected
                            </span>
                          </span>
                        </label>
                        <button
                          className={buttonVariants.secondary}
                          aria-expanded={expanded.has(book.bookId)}
                          onClick={() =>
                            setExpanded((current) => {
                              const next = new Set(current)
                              next.has(book.bookId)
                                ? next.delete(book.bookId)
                                : next.add(book.bookId)
                              return next
                            })
                          }
                        >
                          Choose files
                        </button>
                      </div>
                      {expanded.has(book.bookId) && (
                        <div className="file-export-book__files">
                          {book.files.slice(0, countVisible).map((file) => (
                            <label className="file-check" key={file.id}>
                              <input
                                type="checkbox"
                                aria-label={`Export file ${file.title}`}
                                checked={selected.has(file.id)}
                                onChange={(e) => toggleFiles([file.id], e.target.checked)}
                              />
                              <span className="min-w-0 break-words">
                                {file.title}
                                <span className="file-hint block">
                                  {formatFileSize(file.sizeBytes)}
                                </span>
                              </span>
                            </label>
                          ))}
                          {book.files.length > countVisible && (
                            <button
                              className={buttonVariants.secondary}
                              onClick={() =>
                                setVisibleFiles((current) => ({
                                  ...current,
                                  [book.bookId]: countVisible + 50,
                                }))
                              }
                            >
                              Show more files
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {(candidates.data?.length ?? 0) > visibleBooks && (
                <button
                  className={buttonVariants.secondary}
                  onClick={() => setVisibleBooks((v) => v + 20)}
                >
                  Show more books
                </button>
              )}
            </>
          )}
        </>
      )}
    </FileModal>
  )
}
