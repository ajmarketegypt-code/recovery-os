import { useEffect, useRef, useState, useCallback } from 'react'

export function usePullToRefresh(onRefresh) {
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)

  const onTouchStart = useCallback(e => {
    if (window.scrollY === 0) startY.current = e.touches[0].clientY
  }, [])

  const onTouchEnd = useCallback(async e => {
    if (startY.current === null) return
    const delta = e.changedTouches[0].clientY - startY.current
    startY.current = null
    if (delta > 70 && !refreshing) {
      setRefreshing(true)
      try { await onRefresh() } finally { setRefreshing(false) }
    }
  }, [onRefresh, refreshing])

  useEffect(() => {
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [onTouchStart, onTouchEnd])

  return refreshing
}
