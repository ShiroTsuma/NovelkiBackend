export type StatusTone = 'reading' | 'finished' | 'hold' | 'plan' | 'dropped' | 'unknown'

const toneByStatus: Record<string, StatusTone> = {
  reading: 'reading',
  completed: 'finished',
  'on hold': 'hold',
  'plan to read': 'plan',
  dropped: 'dropped',
}

/** Maps a library status name (as stored in the backend) to its colour tone. */
export function getStatusTone(status: string | null | undefined): StatusTone {
  return toneByStatus[status?.trim().toLowerCase() ?? ''] ?? 'unknown'
}

/** Tailwind classes per tone: soft badge, foreground and dot colour. */
export const statusToneClasses: Record<StatusTone, { badge: string; dot: string; bar: string }> = {
  reading: {
    badge: 'bg-status-reading-soft text-status-reading-ink',
    dot: 'bg-status-reading',
    bar: 'bg-status-reading',
  },
  finished: {
    badge: 'bg-status-finished font-bold text-status-finished-on',
    dot: 'bg-status-finished-on',
    bar: 'bg-status-finished',
  },
  hold: {
    badge: 'bg-status-hold-soft text-status-hold-ink',
    dot: 'bg-status-hold',
    bar: 'bg-status-hold',
  },
  plan: {
    badge: 'bg-status-plan-soft text-status-plan-ink',
    dot: 'bg-status-plan',
    bar: 'bg-status-plan',
  },
  dropped: {
    badge: 'bg-status-dropped-soft text-status-dropped-ink',
    dot: 'bg-status-dropped',
    bar: 'bg-status-dropped',
  },
  unknown: {
    badge: 'border border-line-strong text-status-unknown-ink',
    dot: 'bg-status-unknown',
    bar: 'bg-status-unknown',
  },
}
