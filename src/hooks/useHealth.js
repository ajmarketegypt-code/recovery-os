import { useState, useEffect, useCallback } from 'react'
export function useHealth() {
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

  const fetchAll = useCallback(() => { fetchToday(); fetchBrief(); fetchWeekly() },
    [fetchToday, fetchBrief, fetchWeekly])

  useEffect(() => {
    fetchToday(); fetchBrief(); fetchWeekly()
    const id = setInterval(fetchAll, 60_000)
    return () => clearInterval(id)
  }, [fetchToday, fetchBrief, fetchWeekly, fetchAll])

  return { data, brief, weekly, loading, error, refresh: fetchAll }
}
