import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Download, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  bookFilesApi,
  formatFileSize,
  startFileDownload,
  type BookFile,
  type BookFileList,
  type FileJob,
} from '@/api/bookFiles'
import { buttonVariants, controlClass, Surface } from '@/components/app/DesignSystem'
import { FileModal, fileError } from './files/FileDialogs'
import { FileDownloadDialog } from './files/FileDownloadDialog'
import { FileImportDialog } from './files/FileImportDialog'
import { FileContents } from './files/FileContents'

function useBookFiles(bookId?: string, snapshotId?: string) {
  return useQuery<BookFileList | BookFile[]>({
    queryKey: ['book-files', bookId ?? snapshotId],
    queryFn: () => (bookId ? bookFilesApi.list(bookId) : bookFilesApi.publicList(snapshotId!)),
  })
}

export function BookFilesPanel({ bookId }: { bookId: string }) {
  const query = useBookFiles(bookId)
  const [open, setOpen] = useState(false)
  const files =
    query.data && 'files' in query.data ? query.data.files.filter((f) => !f.deletedAtUtc) : []
  return (
    <>
      <Surface className="epub-summary p-5" aria-label="Book EPUBs">
        <div>
          <h2 className="text-base font-semibold">EPUB</h2>
          <p className="file-hint">
            {query.isPending
              ? 'Loading…'
              : query.isError
                ? 'Unavailable'
                : files.length
                  ? `${files.length} ${files.length === 1 ? 'file' : 'files'} · ${formatFileSize(files.reduce((sum, f) => sum + f.sizeBytes, 0))}`
                  : 'No EPUBs'}
          </p>
        </div>
        <button className={buttonVariants.secondary} type="button" onClick={() => setOpen(true)}>
          View
        </button>
      </Surface>
      {open && <BookFilesDialog bookId={bookId} onClose={() => setOpen(false)} />}
    </>
  )
}

export function BookFilesDialog({
  bookId,
  snapshotId,
  onClose,
}: {
  bookId?: string
  snapshotId?: string
  onClose: () => void
}) {
  const client = useQueryClient()
  const query = useBookFiles(bookId, snapshotId)
  const [manage, setManage] = useState(false)
  const [trashOpen, setTrashOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [resume, setResume] = useState<FileJob>()
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [downloading, setDownloading] = useState<string>()
  const [deleting, setDeleting] = useState<BookFile>()
  const [editing, setEditing] = useState<string>()
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [visible, setVisible] = useState(50)
  const files = query.data ? ('files' in query.data ? query.data.files : query.data) : []
  const own = query.data && 'files' in query.data ? query.data : undefined
  const active = files.filter((f) => !f.deletedAtUtc)
  const trash = files.filter((f) => f.deletedAtUtc)
  const rows = trashOpen ? trash : active
  const limits = useQuery({
    queryKey: ['epub-limits'],
    queryFn: bookFilesApi.limits,
    enabled: manage,
  })
  const jobs = useQuery({
    queryKey: ['epub-jobs'],
    queryFn: bookFilesApi.jobs,
    enabled: Boolean(bookId),
    retry: false,
  })
  const resumable = jobs.data?.find(
    (j) =>
      j.bookId === bookId &&
      j.kind === 'BookImport' &&
      !['Completed', 'Failed', 'Cancelled'].includes(j.status),
  )
  function imported() {
    void client.invalidateQueries({ queryKey: ['book-files'] })
    void client.invalidateQueries({ queryKey: ['epub-jobs'] })
  }
  const mutation = useMutation({
    mutationFn: (operation: () => Promise<unknown>) => operation(),
    onSuccess: async () => {
      setError('')
      setEditing(undefined)
      setDeleting(undefined)
      await Promise.all([
        client.invalidateQueries({ queryKey: ['book-files'] }),
        client.invalidateQueries({ queryKey: ['public-books'] }),
      ])
    },
    onError: (e) => setError(fileError(e)),
  })
  function move(index: number, offset: number) {
    const ids = active.map((f) => f.id)
    ;[ids[index], ids[index + offset]] = [ids[index + offset], ids[index]]
    mutation.mutate(() => bookFilesApi.reorder(bookId!, ids))
  }
  function add() {
    setResume(resumable)
    setImportOpen(true)
  }
  async function downloadOne(file: BookFile) {
    setDownloading(file.id)
    setError('')
    try {
      startFileDownload((await bookFilesApi.downloads([file.id], snapshotId))[0])
    } catch (e) {
      setError(fileError(e))
    } finally {
      setDownloading(undefined)
    }
  }
  return (
    <>
      <FileModal
        title={manage ? 'Manage EPUBs' : 'EPUBs'}
        onClose={onClose}
        footer={
          <>
            {bookId && (
              <button
                className={buttonVariants.ghost}
                type="button"
                disabled={mutation.isPending}
                onClick={() => {
                  setManage(!manage)
                  setTrashOpen(false)
                  setEditing(undefined)
                  setVisible(50)
                  setError('')
                }}
              >
                {manage ? 'Done' : 'Manage'}
              </button>
            )}
            <button className={buttonVariants.secondary} type="button" onClick={onClose}>
              Close
            </button>
            {!manage && active.length > 0 && (
              <button
                className={buttonVariants.primary}
                type="button"
                onClick={() => setDownloadOpen(true)}
              >
                Download
              </button>
            )}
            {bookId && manage && (
              <button className={buttonVariants.primary} type="button" onClick={add}>
                {resumable ? 'Resume import' : 'Add EPUB / ZIP'}
              </button>
            )}
          </>
        }
      >
        {manage && (
          <div className="epub-manage-bar">
            <span className="file-hint">
              {own &&
                `${formatFileSize(own.usedStorageBytes)} / ${formatFileSize(own.maxStorageBytes)} storage (including trash)`}
            </span>
            <button
              className={buttonVariants.secondary}
              type="button"
              aria-pressed={trashOpen}
              onClick={() => {
                setTrashOpen(!trashOpen)
                setVisible(50)
                setEditing(undefined)
              }}
            >
              {trashOpen ? 'Active files' : `Trash (${trash.length})`}
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="file-error">
            {error}
          </p>
        )}
        {query.isPending ? (
          <p className="file-hint">Loading EPUBs…</p>
        ) : query.isError ? (
          <p role="alert" className="file-error">
            Could not load EPUBs.{' '}
            <button className={buttonVariants.secondary} onClick={() => void query.refetch()}>
              Retry
            </button>
          </p>
        ) : (
          <>
            {trashOpen && (
              <p className="file-hint">
                Restore within {limits.data?.retentionDays ?? 30} days. Restored EPUBs are private.
              </p>
            )}
            {rows.length === 0 && (
              <p className="file-empty">{trashOpen ? 'Trash is empty.' : 'No EPUBs.'}</p>
            )}
            <div className="epub-browser-list">
              {rows.slice(0, visible).map((file, index) => (
                <div className="epub-browser-row" key={file.id}>
                  <div className="min-w-0">
                    {editing === file.id ? (
                      <form
                        className="file-rename"
                        onSubmit={(e) => {
                          e.preventDefault()
                          mutation.mutate(() => bookFilesApi.rename(bookId!, file.id, title))
                        }}
                      >
                        <input
                          className={controlClass}
                          aria-label="File title"
                          maxLength={250}
                          value={title}
                          autoFocus
                          onChange={(e) => setTitle(e.target.value)}
                        />
                        <button
                          className={buttonVariants.primary}
                          disabled={mutation.isPending || !title.trim()}
                        >
                          Save
                        </button>
                        <button
                          className={buttonVariants.secondary}
                          type="button"
                          onClick={() => setEditing(undefined)}
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <strong className="block break-words">{file.title}</strong>
                    )}
                    <FileContents file={file} />
                    <span className="file-hint">
                      {formatFileSize(file.sizeBytes)}
                      {!manage && file.isShared && bookId ? ' · Shared' : ''}
                    </span>
                    {manage && <p className="file-hint break-words">{file.originalFileName}</p>}
                  </div>
                  {!manage && (
                    <button
                      className={buttonVariants.secondary}
                      type="button"
                      aria-label={`Download ${file.title}`}
                      disabled={Boolean(downloading)}
                      onClick={() => void downloadOne(file)}
                    >
                      <Download size={16} />
                      {downloading === file.id ? 'Starting…' : 'Download'}
                    </button>
                  )}
                  {manage && (
                    <div className="book-file-actions">
                      {trashOpen ? (
                        <button
                          className={buttonVariants.secondary}
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate(() => bookFilesApi.restore(bookId!, file.id))
                          }
                        >
                          <RotateCcw size={16} />
                          Restore
                        </button>
                      ) : (
                        <>
                          {own?.snapshotId && (
                            <label className="file-check">
                              <input
                                type="checkbox"
                                aria-label={`Share ${file.title}`}
                                checked={file.isShared}
                                disabled={mutation.isPending}
                                onChange={(e) => {
                                  const ids = e.target.checked
                                    ? [
                                        ...active.filter((f) => f.isShared).map((f) => f.id),
                                        file.id,
                                      ]
                                    : active
                                        .filter((f) => f.isShared && f.id !== file.id)
                                        .map((f) => f.id)
                                  mutation.mutate(() => bookFilesApi.share(bookId!, ids))
                                }}
                              />
                              Shared
                            </label>
                          )}
                          <button
                            className={buttonVariants.ghost}
                            disabled={mutation.isPending}
                            aria-label={`Rename ${file.title}`}
                            onClick={() => {
                              setEditing(file.id)
                              setTitle(file.title)
                            }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            className={buttonVariants.ghost}
                            disabled={mutation.isPending || index === 0}
                            aria-label={`Move ${file.title} up`}
                            onClick={() => move(index, -1)}
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            className={buttonVariants.ghost}
                            disabled={mutation.isPending || index === active.length - 1}
                            aria-label={`Move ${file.title} down`}
                            onClick={() => move(index, 1)}
                          >
                            <ArrowDown size={16} />
                          </button>
                          <button
                            className={buttonVariants.ghost}
                            disabled={mutation.isPending}
                            aria-label={`Remove ${file.title}`}
                            onClick={() => setDeleting(file)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {rows.length > visible && (
              <button
                className={buttonVariants.secondary}
                onClick={() => setVisible((v) => v + 50)}
              >
                Show more ({rows.length - visible} remaining)
              </button>
            )}
            {manage && !trashOpen && active.length > 0 && !own?.snapshotId && (
              <p className="file-hint">
                To share EPUBs, publish the book in{' '}
                <Link to="/manage" className="ui-inline-link">
                  Manage
                </Link>
                .
              </p>
            )}
          </>
        )}
      </FileModal>
      {importOpen && (
        <FileImportDialog
          bookId={bookId}
          initialJob={resume}
          onClose={() => setImportOpen(false)}
          onImported={imported}
        />
      )}
      {downloadOpen && (
        <FileDownloadDialog
          files={active}
          snapshotId={snapshotId}
          onClose={() => setDownloadOpen(false)}
        />
      )}
      {deleting && (
        <FileModal
          title="Move EPUB to trash?"
          onClose={() => setDeleting(undefined)}
          footer={
            <>
              <button
                className={buttonVariants.secondary}
                disabled={mutation.isPending}
                onClick={() => setDeleting(undefined)}
              >
                Cancel
              </button>
              <button
                className={buttonVariants.destructive}
                disabled={mutation.isPending}
                onClick={() => mutation.mutate(() => bookFilesApi.remove(bookId!, deleting.id))}
              >
                Move to trash
              </button>
            </>
          }
        >
          <p className="break-words">{deleting.title}</p>
          <p className="file-hint">
            Restore within {limits.data?.retentionDays ?? 30} days. Sharing stops immediately.
          </p>
          {error && (
            <p role="alert" className="file-error">
              {error}
            </p>
          )}
        </FileModal>
      )}
    </>
  )
}
