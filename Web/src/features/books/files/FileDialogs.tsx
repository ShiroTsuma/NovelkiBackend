import './files.css'
import { X } from 'lucide-react'
import { useEffect, useEffectEvent, useId, useRef, type ReactNode } from 'react'
import type { FileJob } from '@/api/bookFiles'
import { buttonVariants } from '@/components/app/designTokens'
import { DialogPanel } from '@/components/app/DesignSystem'
import { useBodyScrollLock } from '@/components/app/useBodyScrollLock'
import { isJobWorking } from './fileJobs'

export function FileModal({
  title,
  children,
  footer,
  onClose,
}: {
  title: string
  children: ReactNode
  footer?: ReactNode
  onClose: () => void
}) {
  const titleId = useId()
  const panel = useRef<HTMLElement>(null)
  const close = useEffectEvent(onClose)
  useBodyScrollLock(true)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const node = panel.current
    if (!node) return
    node.focus()
    const keydown = (event: KeyboardEvent) => {
      if (Array.from(document.querySelectorAll('[role="dialog"]')).at(-1) !== node) return
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
        return
      }
      if (event.key !== 'Tab') return
      const targets = Array.from(
        node.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0)
      const first = targets[0]
      const last = targets.at(-1)
      if (!first) {
        event.preventDefault()
        node.focus()
      } else if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === node)
      ) {
        event.preventDefault()
        last?.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === node)
      ) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      document.removeEventListener('keydown', keydown)
      previous?.focus()
    }
  }, [])
  return (
    <div className="file-modal-backdrop">
      <DialogPanel
        className="file-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panel}
      >
        <div className="file-modal__header">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          <button
            type="button"
            className={buttonVariants.ghost}
            aria-label="Close file dialog"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <div className="file-modal__body">{children}</div>
        {footer && <div className="file-modal__footer">{footer}</div>}
      </DialogPanel>
    </div>
  )
}

export function FileJobProgress({ job }: { job: FileJob }) {
  const label =
    (
      {
        Queued: 'Waiting to process',
        Processing: job.kind.endsWith('Export') ? 'Creating EPUB archive' : 'Checking EPUB files',
        CommitQueued: 'Waiting to save',
        Committing: 'Saving EPUB files',
        Ready: job.kind.endsWith('Export') ? 'Archive ready' : 'Review before importing',
        Completed: 'Import complete',
        Failed: 'Operation failed',
        Cancelled: 'Operation cancelled',
      } as Record<string, string>
    )[job.status] ?? job.status
  return (
    <div className="file-job-progress" aria-live="polite">
      <div className="flex flex-wrap justify-between gap-2">
        <strong>{label}</strong>
        <span>
          {job.processedFiles} / {job.totalFiles || '…'} files
        </span>
      </div>
      {isJobWorking(job) && (
        <progress
          aria-label={label}
          max={Math.max(job.totalFiles, job.processedFiles, 1)}
          value={job.processedFiles}
        />
      )}
      {job.error && (
        <p role="alert" className="file-error">
          {job.error}
        </p>
      )}
      {(job.status === 'Completed' || (job.status === 'Failed' && job.importedCount > 0)) && (
        <p>
          {job.importedCount} imported · {job.skippedCount} identical files skipped. Imported EPUBs
          are private.
        </p>
      )}
    </div>
  )
}
