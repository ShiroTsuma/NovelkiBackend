import { useEffect, type HTMLAttributes, type ReactNode, type Ref } from 'react'
import { cn } from '@/lib/utils'

export const buttonVariants = {
  primary: 'ui-button ui-button--primary',
  secondary: 'ui-button ui-button--secondary',
  destructive: 'ui-button ui-button--destructive',
  ghost: 'ui-button ui-button--ghost',
} as const

export const controlClass = 'ui-control'

let scrollLockCount = 0
let savedBodyOverflow = ''
let savedRootOverflow = ''
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    if (scrollLockCount++ === 0) {
      savedBodyOverflow = document.body.style.overflow
      savedRootOverflow = document.documentElement.style.overflow
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    }
    return () => {
      if (--scrollLockCount === 0) {
        document.body.style.overflow = savedBodyOverflow
        document.documentElement.style.overflow = savedRootOverflow
      }
    }
  }, [active])
}

export function Surface({
  as = 'section',
  className,
  tone = 'default',
  ...props
}: HTMLAttributes<HTMLElement> & {
  as?: 'article' | 'div' | 'section'
  tone?: 'default' | 'muted' | 'elevated' | 'danger' | 'success' | 'warning'
}) {
  const Component = as

  return <Component className={cn('ui-surface', `ui-surface--${tone}`, className)} {...props} />
}

export function PageHeader({
  actions,
  description,
  eyebrow = 'Library workspace',
  title,
}: {
  actions?: ReactNode
  description: string
  eyebrow?: string
  title: string
}) {
  return (
    <div className="ui-page-header">
      <div className="min-w-0">
        <div className="ui-eyebrow">{eyebrow}</div>
        <h1 className="ui-display-title">{title}</h1>
        <p className="ui-page-description">{description}</p>
      </div>
      {actions ? <div className="ui-page-actions">{actions}</div> : null}
    </div>
  )
}

export function Badge({
  children,
  className,
  tone = 'neutral',
}: {
  children: ReactNode
  className?: string
  tone?: 'accent' | 'neutral' | 'success' | 'warning' | 'danger'
}) {
  return <span className={cn('ui-badge', `ui-badge--${tone}`, className)}>{children}</span>
}

export function DialogPanel({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { ref?: Ref<HTMLElement> }) {
  return (
    <section className={cn('ui-dialog-panel', className)} {...props}>
      {children}
    </section>
  )
}
