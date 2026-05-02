// Client-side error reporter. POST { message, stack, url, userAgent, ts }
// Stored in a capped KV list at errors:log (last 50, 30-day TTL).
// No auth — this is single-user app, errors are non-sensitive.
import { kv } from '@vercel/kv'

export const config = { runtime: 'edge' }

const KEY = 'errors:log'
const MAX_ENTRIES = 50
const TTL_30D = 60 * 60 * 24 * 30

export default async function handler(req) {
  if (req.method === 'GET') {
    const log = (await kv.get(KEY)) ?? []
    return new Response(JSON.stringify({ count: log.length, errors: log }),
      { headers: { 'content-type': 'application/json' } })
  }
  if (req.method === 'DELETE') {
    await kv.del(KEY)
    return new Response(JSON.stringify({ ok: true }),
      { headers: { 'content-type': 'application/json' } })
  }
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  let body
  try { body = await req.json() } catch { return new Response('Bad JSON', { status: 400 }) }

  // Trim to keep KV value small (huge stack traces can balloon storage)
  const entry = {
    received_at: new Date().toISOString(),
    message: String(body.message ?? '').slice(0, 500),
    stack:   String(body.stack   ?? '').slice(0, 2000),
    url:     String(body.url     ?? '').slice(0, 300),
    ua:      String(body.userAgent ?? '').slice(0, 200),
    client_ts: body.ts ?? null,
  }

  const existing = (await kv.get(KEY)) ?? []
  const next = [entry, ...existing].slice(0, MAX_ENTRIES)
  await kv.set(KEY, next, { ex: TTL_30D })

  return new Response(JSON.stringify({ ok: true, count: next.length }),
    { headers: { 'content-type': 'application/json' } })
}
