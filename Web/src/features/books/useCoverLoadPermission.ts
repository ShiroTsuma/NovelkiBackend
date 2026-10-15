import { useEffect, useState } from 'react'

const COVER_LAZY_LOAD_MARGIN = '600px 0px'

/** Delays loading a cover until its element is close to the viewport. */
export function useCoverLoadPermission(lazy: boolean) {
  const [target, setTarget] = useState<HTMLElement | null>(null)
  const [intersected, setIntersected] = useState(false)
  const observerUnavailable = typeof IntersectionObserver === 'undefined'
  const permitted = !lazy || intersected || observerUnavailable

  useEffect(() => {
    if (permitted || !target) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return
        }

        setIntersected(true)
        observer.disconnect()
      },
      { rootMargin: COVER_LAZY_LOAD_MARGIN },
    )
    observer.observe(target)

    return () => observer.disconnect()
  }, [permitted, target])

  return { permitted, setTarget }
}
