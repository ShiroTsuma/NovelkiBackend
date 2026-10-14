import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useBodyScrollLock } from '@/components/app/useBodyScrollLock'
import { cn } from '@/lib/utils'
import { Button } from './Button'

export type DialogProps = {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** Tailwind max-width class for the panel. */
  widthClassName?: string
  /** Set false while an operation must not be interrupted. */
  dismissible?: boolean
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  widthClassName = 'max-w-[960px]',
  dismissible = true,
}: DialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  useBodyScrollLock(open)

  useEffect(() => {
    if (!open) return undefined
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null
    panelRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && dismissible) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused?.focus()
    }
  }, [open, dismissible, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-overlay px-4 py-10">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'flex w-full flex-col overflow-hidden rounded-dialog border border-line-strong bg-surface text-ink shadow-overlay outline-none',
          widthClassName,
        )}
      >
        <div className="flex items-start gap-4 px-6 pt-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="m-0 font-display text-2xl font-bold">
              {title}
            </h2>
            {description ? (
              <div id={descriptionId} className="mt-1 text-ink-2">
                {description}
              </div>
            ) : null}
          </div>
          {dismissible ? (
            <Button variant="ghost" size="iconSm" aria-label="Close" onClick={onClose}>
              <X aria-hidden="true" className="size-[18px]" />
            </Button>
          ) : null}
        </div>
        {children}
        {footer ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-line bg-sunk px-6 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
