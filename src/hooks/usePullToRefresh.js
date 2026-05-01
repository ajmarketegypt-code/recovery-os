import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 60   // pixels of damped pull required to trigger refresh
const MAX_PULL  = 120  // visual cap

export function usePullToRefresh(onRefresh, enabled = true) {
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const currentY = useRef(0)
  const dragging = useRef(false)
  const refreshingRef = useRef(false)

  useEffect(() => { refreshingRef.current = refreshing }, [refreshing])

  useEffect(() => {
    if (!enabled) {
      // Reset state when disabled (e.g., user switched tabs mid-pull)
      setPullY(0); startY.current = null; currentY.current = 0; dragging.current = false
      return
    }
    const atTop = () => (window.scrollY || document.documentElement.scrollTop || 0) <= 0

    const onStart = e => {
      if (refreshingRef.current) return
      if (!atTop()) return
      startY.current = e.touches[0].clientY
      currentY.current = 0
      dragging.current = true
    }

    const onMove = e => {
      if (!dragging.current || startY.current === null) return
      const raw = e.touches[0].clientY - startY.current
      if (raw <= 0) {
        currentY.current = 0
        setPullY(0)
        return
      }
      // Damped (rubber-band) pull
      const damped = Math.min(MAX_PULL, raw * 0.5)
      currentY.current = damped
      setPullY(damped)
    }

    const onEnd = async () => {
      if (!dragging.current) return
      dragging.current = false
      const final = currentY.current
      startY.current = null
      currentY.current = 0
      setPullY(0)
      if (final >= THRESHOLD && !refreshingRef.current) {
        setRefreshing(true)
        try { await onRefresh() } finally { setRefreshing(false) }
      }
    }

    // Listen on document, capture phase — works inside PWAs and standalone Safari
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove',  onMove,  { passive: true })
    document.addEventListener('touchend',   onEnd,   { passive: true })
    document.addEventListener('touchcancel', onEnd,  { passive: true })
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove',  onMove)
      document.removeEventListener('touchend',   onEnd)
      document.removeEventListener('touchcancel', onEnd)
    }
  }, [onRefresh, enabled])

  return { pullY, refreshing, threshold: THRESHOLD }
}
