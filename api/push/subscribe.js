// Register a push subscription. Stored in a map keyed by endpoint URL so
// re-subscribing from a new browser/device doesn't orphan the old one
// (previous version was last-write-wins on a single key).
//
// POST  body = sub.toJSON()        → upsert
// DELETE body = { endpoint }       → unsubscribe one device
import { kv } from '../../src/lib/kv.js'

export const config = { runtime: 'edge' }

const KEY = 'push:subs'  // map of endpoint → subscription object

export default async function handler(req) {
  if (req.method === 'POST') {
    const sub = await req.json()
    if (!sub?.endpoint) return new Response('Bad subscription', { status: 400 })
    const map = (await kv.get(KEY)) ?? {}
    map[sub.endpoint] = { ...sub, subscribed_at: new Date().toISOString() }
    await kv.set(KEY, map)
    return new Response(JSON.stringify({ ok: true, devices: Object.keys(map).length }),
      { headers: { 'content-type': 'application/json' } })
  }

  if (req.method === 'DELETE') {
    const { endpoint } = await req.json().catch(() => ({}))
    if (!endpoint) return new Response('Bad request', { status: 400 })
    const map = (await kv.get(KEY)) ?? {}
    delete map[endpoint]
    await kv.set(KEY, map)
    return new Response(JSON.stringify({ ok: true, devices: Object.keys(map).length }),
      { headers: { 'content-type': 'application/json' } })
  }

  return new Response('Method Not Allowed', { status: 405 })
}
