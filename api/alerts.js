// In-app alert surface. Morning cron writes fired alerts here so they
// can be displayed as banners even if push notifications fail.
//
// On GET we also synthesize a live "wear_watch" alert when HRV has gone
// stale since the last cron run — this is the only intra-day alert that
// doesn't need cron fanout (no push, just in-app banner).
//
// GET  /api/alerts → { alerts: [{ type, title, body, fired_at }] }
// POST /api/alerts { type, action: 'dismiss' } → removes one
import { kv } from '../src/lib/kv.js'
import { isoDate } from '../src/lib/kv.js'
import { wearWatchAlert, ingestStaleAlert } from '../src/lib/alerts.js'

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

// Returns the in-KV alert list with live wear_watch / ingest_stale merged
// in (or removed if conditions cleared). Doesn't persist — just affects
// the read. Same-day dismissal tombstone suppresses each independently.
async function liveAlerts() {
  const stored = (await kv.get(KEY)) ?? []
  const today = isoDate()

  const [hrv, lastIngest, wearTomb, ingestTomb] = await Promise.all([
    recentHRV(),
    kv.get('debug:last-ingest'),
    kv.get(`alert:dismissed:${today}:wear_watch`),
    kv.get(`alert:dismissed:${today}:ingest_stale`),
  ])

  const synth = []
  const wear = wearWatchAlert(hrv)
  if (wear && !wearTomb) synth.push({ ...wear, fired_at: new Date().toISOString() })
  const ingest = ingestStaleAlert(lastIngest)
  if (ingest && !ingestTomb) synth.push({ ...ingest, fired_at: new Date().toISOString() })

  const synthTypes = new Set(['wear_watch', 'wear_watch_long', 'ingest_stale'])
  const withoutSynth = stored.filter(a => !synthTypes.has(a.type))
  return [...synth, ...withoutSynth]
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
      if (type === 'wear_watch' || type === 'wear_watch_long' || type === 'ingest_stale') {
        await kv.set(`alert:dismissed:${isoDate()}:${type}`, 1, { ex: 60 * 60 * 36 })
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
