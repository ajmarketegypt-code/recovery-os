import { useState, useEffect } from 'react'

// Lightweight brief fetcher for non-Today tabs that want to render
// the persistent banner. The brief is cached server-side per day
// so multiple consumers sharing the same response is cheap.
export function useBrief(active = true) {
  const [brief, setBrief] = useState(null)
  useEffect(() => {
    if (!active) return
    let cancelled = false
    fetch('/api/brief')
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (!cancelled) setBrief(j) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [active])
  return brief
}
