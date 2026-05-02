// Full data export — download every byte of your health data as JSON.
// GET /api/export → application/json (downloads as health-export-YYYY-MM-DD.json)
//
// Insurance against KV loss / project switch / accidental wipe. Dump it
// monthly into Drive/iCloud and you can replay it back via /api/health-ingest
// if Upstash ever clears.
import { kv } from '@vercel/kv'
import { isoDate } from '../src/lib/kv.js'

export const config = { runtime: 'edge' }

const PATTERNS = ['health:*', 'brief:*', 'report:*', 'prayers:*', 'alerts:*', 'alert:*']
const SINGLETON_KEYS = ['settings', 'hrv:baseline', 'push:subscription']

// Iterate Upstash SCAN, batched 1000 at a time
async function scanAll(pattern) {
  const out = []
  let cursor = '0', iterations = 0
  do {
    const [next, keys] = await kv.scan(cursor, { match: pattern, count: 1000 })
    out.push(...keys)
    cursor = String(next)
    iterations++
  } while (cursor !== '0' && iterations < 100)  // safety cap
  return out
}

export default async function handler() {
  // Find all keys, then mget in chunks (Upstash mget caps around 100/call)
  const groups = await Promise.all(PATTERNS.map(scanAll))
  const allKeys = groups.flat()

  const data = {}
  const CHUNK = 100
  for (let i = 0; i < allKeys.length; i += CHUNK) {
    const slice = allKeys.slice(i, i + CHUNK)
    const values = await kv.mget(...slice)
    slice.forEach((k, idx) => { data[k] = values[idx] })
  }

  // Singleton keys (separate so the export is self-documenting)
  const singletons = await kv.mget(...SINGLETON_KEYS)
  const meta = {}
  SINGLETON_KEYS.forEach((k, i) => { meta[k] = singletons[i] })

  // Strip the push subscription endpoint URL — it's a credential of sorts
  if (meta['push:subscription']) {
    meta['push:subscription'] = { _redacted: true, kept_for_count_only: true }
  }

  const payload = {
    exported_at: new Date().toISOString(),
    schema_version: 1,
    counts: {
      keys: allKeys.length,
      singletons: SINGLETON_KEYS.length,
    },
    singletons: meta,
    data,
  }

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'content-type': 'application/json',
      'content-disposition': `attachment; filename="health-export-${isoDate()}.json"`,
    },
  })
}
