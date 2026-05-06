// Client-side error reporter. POST { message, stack, url, userAgent, ts }
//
// Stored as a Redis list at errors:log (LPUSH + LTRIM keeps last 50,
// 30-day TTL). Avoids the read-modify-write blow-up that the previous
// kv.set-on-array approach had — each POST is now O(1) write instead
// of O(N) read + O(N) write.
//
// Defenses against /api/log-error abuse (no auth — single-user app,
// shipping a secret in client bundle is moot):
//   - Hard 4 KB body cap (silently truncate, don't 4xx)
//   - LTRIM bounds list growth at MAX_ENTRIES regardless of write rate
//   - 30-day TTL auto-cleans abandoned logs
import { kv } from '../src/lib/kv.js'

export const config = { runtime: 'edge' }

const KEY = 'errors:log'
const MAX_ENTRIES = 50
const MAX_BODY_BYTES = 4096
const TTL_30D = 60 * 60 * 24 * 30

export default async function handler(req) {
  if (req.method === 'GET') {
    const errors = (await kv.lrange(KEY, 0, MAX_ENTRIES - 1)) ?? []
    return new Response(JSON.stringify({ count: errors.length, errors }),
      { headers: { 'content-type': 'application/json' } })
  }
  if (req.method === 'DELETE') {
    await kv.del(KEY)
    return new Response(JSON.stringify({ ok: true }),
      { headers: { 'content-type': 'application/json' } })
  }
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  let raw
  try { raw = await req.text() } catch { return new Response('Bad body', { status: 400 }) }
  if (raw.length > MAX_BODY_BYTES) raw = raw.slice(0, MAX_BODY_BYTES)
  let body
  try { body = JSON.parse(raw) } catch { body = { message: raw } }

  const entry = {
    received_at: new Date().toISOString(),
    message: String(body.message ?? '').slice(0, 500),
    stack:   String(body.stack   ?? '').slice(0, 2000),
    url:     String(body.url     ?? '').slice(0, 300),
    ua:      String(body.userAgent ?? '').slice(0, 200),
    client_ts: body.ts ?? null,
  }

  // O(1) push + trim. List length stays bounded at MAX_ENTRIES.
  await kv.lpush(KEY, entry)
  await kv.ltrim(KEY, 0, MAX_ENTRIES - 1)
  await kv.expire(KEY, TTL_30D)

  return new Response(JSON.stringify({ ok: true }),
    { headers: { 'content-type': 'application/json' } })
}
