// In-app alert surface. Morning cron writes fired alerts here so they
// can be displayed as banners even if push notifications fail.
//
// On GET we also synthesize a live "wear_watch" alert when HRV has gone
// stale since the last cron run — this is the only intra-day alert that
// doesn't need cron fanout (no push, just in-app banner).
//
// GET  /api/alerts → { alerts: [{ type, title, body, fired_at }] }
// POST /api/alerts { type, action: 'dismiss' } → removes one
import { kv } from '@vercel/kv'
import { isoDate } from '../src/lib/kv.js'
import { wearWatchAlert } from '../src/lib/alerts.js'

export const config = { runtime: 'edge' }
const KEY = 'alerts:active'
const TTL = 60 * 60 * 24 * 30  // 30 days

const dateNDaysAgo = n => {
  const d = new Date(); d.setDate(d.getDate() - n)
  return isoDate(d)
}

async function recentHRV(days = 8) {
  const dates = Array.from({ length: days }, (_, i) => dateNDaysAgo(days - 1 - i))
  return kv.mget(...dates.map(d => `health:${d}:hrv`))
}

// Returns the in-KV alert list with a live wear_watch alert merged in
// (or removed if HRV came back). Doesn't persist — just affects the read.
async function liveAlerts() {
  const stored = (await kv.get(KEY)) ?? []
  const hrv = await recentHRV()
  const wear = wearWatchAlert(hrv)

  const withoutStaleWear = stored.filter(a => a.type !== 'wear_watch')
  if (!wear) return withoutStaleWear  // condition cleared
  // If user already dismissed today, suppress (dismiss writes a tombstone)
  const dismissedToday = await kv.get(`alert:dismissed:${isoDate()}:wear_watch`)
  if (dismissedToday) return withoutStaleWear
  return [{ ...wear, fired_at: new Date().toISOString() }, ...withoutStaleWear]
}

export default async function handler(req) {
  if (req.method === 'GET') {
    const list = await liveAlerts()
    return new Response(JSON.stringify({ alerts: list }), {
      headers: { 'content-type': 'application/json' },
    })
  }

  if (req.method === 'POST') {
    let body
    try { body = await req.json() } catch { return new Response('Bad JSON', { status: 400 }) }
    const { type, action } = body
    if (action === 'dismiss' && type) {
      // Persist a same-day tombstone for synthesized alerts so they don't
      // pop right back. 36h TTL covers TZ weirdness across midnight.
      if (type === 'wear_watch') {
        await kv.set(`alert:dismissed:${isoDate()}:wear_watch`, 1, { ex: 60 * 60 * 36 })
      }
      const list = (await kv.get(KEY)) ?? []
      const next = list.filter(a => a.type !== type)
      await kv.set(KEY, next, { ex: TTL })
      return new Response(JSON.stringify({ ok: true, remaining: next.length }), {
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ error: 'invalid' }), { status: 400, headers: { 'content-type': 'application/json' } })
  }

  return new Response('Method Not Allowed', { status: 405 })
}
