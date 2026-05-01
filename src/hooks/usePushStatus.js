import { useState, useEffect, useCallback } from 'react'

const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlB64ToUint8(b64) {
  const padding = '='.repeat((4 - b64.length % 4) % 4)
  const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  return new Uint8Array([...atob(base64)].map(c => c.charCodeAt(0)))
}

// Push notification status + enable flow.
// status: 'unsupported' | 'denied' | 'default' | 'subscribed'
export function usePushStatus() {
  const [status, setStatus] = useState('checking')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return setStatus('unsupported')
    }
    if (Notification.permission === 'denied') return setStatus('denied')
    if (Notification.permission === 'default') return setStatus('default')

    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      setStatus(sub ? 'subscribed' : 'default')
    } catch {
      setStatus('default')
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const enable = useCallback(async () => {
    setBusy(true); setError(null)
    try {
      if (!('Notification' in window)) throw new Error('Browser does not support notifications')
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') throw new Error('Permission denied — enable in Safari → Settings → Notifications')

      const reg = await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8(VAPID_KEY),
        })
      }
      const r = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      if (!r.ok) throw new Error(`Subscribe failed: HTTP ${r.status}`)
      setStatus('subscribed')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }, [])

  return { status, busy, error, enable, refresh }
}
