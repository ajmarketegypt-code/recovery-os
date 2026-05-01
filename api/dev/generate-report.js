// Force-regenerate this week's report so the Weekly insight card on
// History populates without waiting for Sunday's cron. Wipes the cache
// then calls /api/report?force=1 with the cron secret server-side.
import { kv } from '@vercel/kv'
import { isoWeek } from '../../src/lib/kv.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })

  await kv.del(`report:${isoWeek()}`)

  const origin = new URL(req.url).origin
  const r = await fetch(`${origin}/api/report?force=1`, {
    headers: { 'x-cron-secret': process.env.CRON_SECRET },
  })
  const text = await r.text()

  return new Response(JSON.stringify({
    ok: r.ok,
    status: r.status,
    body: (() => { try { return JSON.parse(text) } catch { return text } })(),
  }), { headers: { 'content-type': 'application/json' } })
}
