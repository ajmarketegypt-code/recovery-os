import { useState, useEffect, useCallback } from 'react'
export function useHealth() {
  const [data, setData] = useState(null)
  const [brief, setBrief] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fetchAll = useCallback(async () => {
    try {
      const [t, b] = await Promise.all([fetch('/api/today'), fetch('/api/brief')])
      const [td, bd] = await Promise.all([t.json(), b.json()])
      setData(td); setBrief(bd)
    } catch(e) { setError(e.message) } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchAll(); const id=setInterval(fetchAll,60_000); return ()=>clearInterval(id) }, [fetchAll])
  return { data, brief, loading, error, refresh:fetchAll }
}
