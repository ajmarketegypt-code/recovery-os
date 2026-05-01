// Wipe all health data, briefs, reports, baseline. Settings stay.
// POST /api/dev/wipe
import { kv } from '@vercel/kv'
export const config = { runtime: 'edge' }

async function deleteByPattern(pattern) {
  let cursor = 0, count = 0
  do {
    const [next, keys] = await kv.scan(cursor, { match: pattern, count: 100 })
    if (keys.length) { await kv.del(...keys); count += keys.length }
    cursor = parseInt(next)
  } while (cursor !== 0)
  return count
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })

  let total = 0
  for (const pattern of ['health:*', 'brief:*', 'report:*']) {
    total += await deleteByPattern(pattern)
  }
  await kv.del('hrv:baseline'); total++

  return new Response(JSON.stringify({ ok: true, deleted: total }),
    { headers: { 'content-type': 'application/json' } })
}
