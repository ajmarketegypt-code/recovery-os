// Wipe all health data, briefs, reports, baseline. Settings stay.
// POST /api/dev/wipe
import { kv } from '@vercel/kv'
export const config = { runtime: 'edge' }

async function deleteByPattern(pattern) {
  let cursor = '0', count = 0, iterations = 0
  do {
    // count:1000 = ask Upstash for up to 1000 matches per scan call (default is ~10!)
    const [next, keys] = await kv.scan(cursor, { match: pattern, count: 1000 })
    if (keys.length) { await kv.del(...keys); count += keys.length }
    cursor = String(next)
    iterations++
  } while (cursor !== '0' && iterations < 50)  // safety cap
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
