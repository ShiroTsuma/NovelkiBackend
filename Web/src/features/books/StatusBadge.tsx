import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStatusTone, statusToneClasses } from './bookStatus'

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = getStatusTone(status)
  const classes = statusToneClasses[tone]
  return (
    <span
      aria-label={`Book status: ${status}`}
      data-tone={tone}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-medium',
        classes.badge,
        className,
      )}
    >
      {tone === 'finished' ? (
        <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
      ) : (
        <span aria-hidden="true" className={cn('size-1.5 rounded-full', classes.dot)} />
      )}
      {status}
    </span>
  )
}
