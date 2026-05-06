// Wipe all health data, briefs, reports, baseline. Settings stay.
// POST /api/dev/wipe
import { kv } from '../../src/lib/kv.js'
import { deleteByPattern } from '../../src/lib/kv-helpers.js'

export const config = { runtime: 'edge' }

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
