import { useState, useEffect, useCallback } from 'react'

// Shared alert fetcher + dismiss handler. Used by Today/History/Nutrition
// so the 4 critical alerts surface across the whole app, not just one tab.
//
// Cross-tab sync: each screen mounts its own hook instance, so a dismiss
// on Today wouldn't update History's local state. We broadcast a window
// event on mutation; every instance listens and refetches.
const ALERTS_CHANGED = 'health:alerts-changed'

export function useAlerts(active = true) {
  const [alerts, setAlerts] = useState([])

  const fetchAlerts = useCallback(async () => {
    try {
      const r = await fetch('/api/alerts')
      if (r.ok) {
        const j = await r.json()
        setAlerts(j.alerts || [])
      }
    } catch (_) {}
  }, [])

  useEffect(() => {
    if (!active) return
    fetchAlerts()
    const onChange = () => fetchAlerts()
    window.addEventListener(ALERTS_CHANGED, onChange)
    return () => window.removeEventListener(ALERTS_CHANGED, onChange)
  }, [active, fetchAlerts])

  const dismiss = useCallback(async (type) => {
    setAlerts(a => a.filter(x => x.type !== type))  // optimistic
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, action: 'dismiss' }),
      })
      window.dispatchEvent(new CustomEvent(ALERTS_CHANGED))
    } catch (_) { fetchAlerts() }
  }, [fetchAlerts])

  return { alerts, dismiss, refetch: fetchAlerts }
}
