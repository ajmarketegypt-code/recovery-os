// Best-effort client-side error reporter. Posts uncaught errors to
// /api/log-error so we can see iPhone-only crashes without USB debugging.
//
// Uses sendBeacon when available (survives page unload, doesn't block);
// falls back to fire-and-forget fetch with keepalive.

const ENDPOINT = '/api/log-error'

// Throttle: same-message errors within 5s are dropped to avoid spamming KV
// when a render loop throws on every frame.
const recent = new Map()
const COOLDOWN_MS = 5000

export function reportError(payload) {
  try {
    const key = (payload?.message || '') + '|' + (payload?.stack || '').slice(0, 80)
    const now = Date.now()
    const last = recent.get(key)
    if (last && now - last < COOLDOWN_MS) return
    recent.set(key, now)
    // Prune occasionally
    if (recent.size > 50) {
      for (const [k, ts] of recent) if (now - ts > COOLDOWN_MS * 4) recent.delete(k)
    }

    const body = JSON.stringify({
      message:   payload?.message ?? 'unknown',
      stack:     payload?.stack ?? '',
      url:       location.href,
      userAgent: navigator.userAgent,
      ts:        now,
    })

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(ENDPOINT, blob)
    } else {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body, keepalive: true,
      }).catch(() => {})
    }
  } catch (_) { /* never let the reporter itself throw */ }
}

// Install global window listeners. Idempotent.
let installed = false
export function installErrorReporter() {
  if (installed || typeof window === 'undefined') return
  installed = true

  window.addEventListener('error', e => {
    reportError({
      message: e.message || (e.error?.message ?? 'window.error'),
      stack:   e.error?.stack ?? '',
    })
  })

  window.addEventListener('unhandledrejection', e => {
    const r = e.reason
    reportError({
      message: 'unhandledrejection: ' + (r?.message ?? String(r)),
      stack:   r?.stack ?? '',
    })
  })
}
