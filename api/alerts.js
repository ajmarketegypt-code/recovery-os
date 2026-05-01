// In-app alert surface. Morning cron writes fired alerts here so they
// can be displayed as banners even if push notifications fail.
// GET /api/alerts → { alerts: [{ type, title, body, fired_at }] }
// POST /api/alerts { type, action: 'dismiss' } → removes one
import { kv } from '@vercel/kv'

export const config = { runtime: 'edge' }
const KEY = 'alerts:active'
const TTL = 60 * 60 * 24 * 30  // 30 days

export default async function handler(req) {
  if (req.method === 'GET') {
    const list = (await kv.get(KEY)) ?? []
    return new Response(JSON.stringify({ alerts: list }), {
      headers: { 'content-type': 'application/json' },
    })
  }

  if (req.method === 'POST') {
    let body
    try { body = await req.json() } catch { return new Response('Bad JSON', { status: 400 }) }
    const { type, action } = body
    if (action === 'dismiss' && type) {
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
