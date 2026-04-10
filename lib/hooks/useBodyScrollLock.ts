'use client'

import { useEffect } from 'react'

let lockCount = 0
let savedScrollY = 0

export function isBodyScrollLocked() {
  return lockCount > 0
}

/**
 * 锁定页面滚动的 Hook
 * 用于 Modal、BottomSheet 等需要阻止背景滚动的场景
 * 支持嵌套调用：仅首次锁定时应用样式，最后一次解锁时恢复
 *
 * @param isLocked - 是否锁定，默认 true
 */
export function useBodyScrollLock(isLocked: boolean = true) {
  useEffect(() => {
    if (!isLocked) return

    lockCount++
    if (lockCount === 1) {
      savedScrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${savedScrollY}px`
      document.body.style.width = '100%'
    }

    return () => {
      lockCount--
      if (lockCount === 0) {
        document.body.style.overflow = ''
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        window.scrollTo(0, savedScrollY)
      }
    }
  }, [isLocked])
}
