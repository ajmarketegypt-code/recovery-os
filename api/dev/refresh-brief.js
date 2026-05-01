// Bust today's brief cache so the next /api/brief call regenerates fresh.
// POST /api/dev/refresh-brief
import { kv } from '@vercel/kv'
import { isoDate } from '../../src/lib/kv.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  await kv.del(`brief:${isoDate()}`)
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  })
}
