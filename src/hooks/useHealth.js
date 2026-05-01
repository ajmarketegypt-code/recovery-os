import { useState, useEffect, useCallback } from 'react'

// Cross-tab sync: each screen calls useHealth() independently, so a brief
// regeneration on Today wouldn't refresh History's copy. Mutations
// (refresh button, brief regen, weight log, check-in changes) dispatch
// this event; every mounted instance listens and refetches.
const HEALTH_CHANGED = 'health:data-changed'

export function notifyHealthChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HEALTH_CHANGED))
  }
}

export function useHealth(active = true) {
  const [data, setData] = useState(null)
  const [brief, setBrief] = useState(null)
  const [weekly, setWeekly] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchToday = useCallback(async () => {
    try {
      const r = await fetch('/api/today')
      setData(await r.json())
    } catch(e) { setError(e.message) } finally { setLoading(false) }
  }, [])

  const fetchBrief = useCallback(async () => {
    try {
      const r = await fetch('/api/brief')
      if (r.ok) setBrief(await r.json())
    } catch(_) {}
  }, [])

  const fetchWeekly = useCallback(async () => {
    try {
      const r = await fetch('/api/weekly')
      if (r.ok) setWeekly(await r.json())
    } catch(_) {}
  }, [])

  const fetchAll = useCallback(() => {
    fetchToday(); fetchBrief(); fetchWeekly()
    notifyHealthChanged()
  }, [fetchToday, fetchBrief, fetchWeekly])

  // Polling is gated on `active` — don't fire fetches or trigger re-renders
  // for a tab the user isn't looking at. (One-shot fetch on first activation.)
  useEffect(() => {
    if (!active) return
    fetchToday(); fetchBrief(); fetchWeekly()
    const id = setInterval(() => { fetchToday(); fetchBrief(); fetchWeekly() }, 60_000)
    const onChange = () => { fetchToday(); fetchBrief(); fetchWeekly() }
    window.addEventListener(HEALTH_CHANGED, onChange)
    return () => {
      clearInterval(id)
      window.removeEventListener(HEALTH_CHANGED, onChange)
    }
  }, [active, fetchToday, fetchBrief, fetchWeekly])

  return { data, brief, weekly, loading, error, refresh: fetchAll }
}
