import { useState, useEffect, useCallback } from 'react'

// Cross-tab sync: each screen calls useHealth() independently, so a brief
// regeneration on Today wouldn't refresh History's copy. Mutations
// (refresh button, brief regen, weight log, check-in changes) dispatch
// this event; every mounted instance listens and refetches.
const HEALTH_CHANGED = 'health:data-changed'
const POLL_MS = 60_000
const DEBOUNCE_MS = 250

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

  // Parallel — these 3 endpoints are independent
  const fetchAllParallel = useCallback(
    () => Promise.all([fetchToday(), fetchBrief(), fetchWeekly()]),
    [fetchToday, fetchBrief, fetchWeekly]
  )

  const refresh = useCallback(async () => {
    await fetchAllParallel()
    notifyHealthChanged()
  }, [fetchAllParallel])

  useEffect(() => {
    if (!active) return

    fetchAllParallel()

    // Background tabs skip polling — no point burning network on a tab
    // the user can't see. Foreground returns trigger an immediate refetch.
    const tick = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        fetchAllParallel()
      }
    }
    const id = setInterval(tick, POLL_MS)

    // Debounce HEALTH_CHANGED so a burst (e.g. dismiss + log + refresh in
    // quick succession) coalesces into one fetch round per hook instance.
    let pending = null
    const onChange = () => {
      if (pending) clearTimeout(pending)
      pending = setTimeout(() => { pending = null; fetchAllParallel() }, DEBOUNCE_MS)
    }
    const onVisible = () => { if (document.visibilityState === 'visible') fetchAllParallel() }

    window.addEventListener(HEALTH_CHANGED, onChange)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      clearInterval(id)
      if (pending) clearTimeout(pending)
      window.removeEventListener(HEALTH_CHANGED, onChange)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [active, fetchAllParallel])

  return { data, brief, weekly, loading, error, refresh }
}
