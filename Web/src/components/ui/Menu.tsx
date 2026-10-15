import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type MenuItem = {
  label: string
  description?: string | undefined
  onSelect: () => void
  disabled?: boolean | undefined
  danger?: boolean | undefined
}

export type MenuSection = { title?: string | undefined; items: MenuItem[] }

/**
 * Small dropdown menu: a trigger button and a list of actions.
 * Closes on Escape, on outside click and after choosing an item.
 */
export function Menu({
  label,
  triggerContent,
  triggerClassName,
  sections,
  align = 'end',
  widthClassName = 'w-64',
}: {
  /** Accessible name of the trigger. */
  label: string
  triggerContent: ReactNode
  triggerClassName: string
  sections: MenuSection[]
  align?: 'start' | 'end'
  widthClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return undefined
    function onPointerDown(event: PointerEvent) {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={triggerClassName}
        onClick={() => setOpen((current) => !current)}
      >
        {triggerContent}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          className={cn(
            'absolute top-full z-50 mt-2 flex flex-col overflow-hidden rounded-field border border-line-strong bg-raised p-1 shadow-popover',
            align === 'end' ? 'right-0' : 'left-0',
            widthClassName,
          )}
        >
          {sections.map((section, sectionIndex) => (
            <div
              key={section.title ?? sectionIndex}
              className={cn(sectionIndex > 0 && 'mt-1 border-t border-line pt-1')}
            >
              {section.title ? (
                <div className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wider text-ink-3 uppercase">
                  {section.title}
                </div>
              ) : null}
              {section.items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false)
                    item.onSelect()
                  }}
                  className={cn(
                    'flex w-full flex-col items-start rounded-control border-0 bg-transparent px-3 py-2 text-left text-sm disabled:opacity-50',
                    item.danger
                      ? 'text-danger-ink hover:bg-danger-soft'
                      : 'text-ink hover:bg-selected',
                  )}
                >
                  <span className="font-medium">{item.label}</span>
                  {item.description ? (
                    <span className="mt-0.5 text-xs text-ink-3">{item.description}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
