import { useState, useEffect, useCallback } from 'react'

// Shared alert fetcher + dismiss handler. Used by Today/History/Nutrition
// so the 4 critical alerts surface across the whole app, not just one tab.
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

  useEffect(() => { if (active) fetchAlerts() }, [active, fetchAlerts])

  const dismiss = useCallback(async (type) => {
    setAlerts(a => a.filter(x => x.type !== type))  // optimistic
    try {
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type, action: 'dismiss' }),
      })
    } catch (_) { fetchAlerts() }
  }, [fetchAlerts])

  return { alerts, dismiss, refetch: fetchAlerts }
}
