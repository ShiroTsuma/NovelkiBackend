import { useEffect } from 'react'

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
