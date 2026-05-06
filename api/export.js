// Full data export — download every byte of your health data as JSON.
// GET /api/export → application/json (downloads as health-export-YYYY-MM-DD.json)
//
// Insurance against KV loss / project switch / accidental wipe. Push
// subscription is OMITTED (not just redacted) so re-import via
// /api/health-ingest won't feed webpush a malformed sub.
import { kv } from '../src/lib/kv.js'
import { isoDate } from '../src/lib/kv.js'
import { scanAll, mgetChunked } from '../src/lib/kv-helpers.js'

export const config = { runtime: 'edge' }

const PATTERNS = ['health:*', 'brief:*', 'report:*', 'prayers:*', 'alerts:*', 'alert:*']
const SINGLETON_KEYS = ['settings', 'hrv:baseline']  // push:subscription deliberately excluded

export default async function handler() {
  const groups = await Promise.all(PATTERNS.map(scanAll))
  const allKeys = groups.flat()

  const [values, singletons] = await Promise.all([
    mgetChunked(allKeys),
    kv.mget(...SINGLETON_KEYS),
  ])

  const data = Object.fromEntries(allKeys.map((k, i) => [k, values[i]]))
  const meta = Object.fromEntries(SINGLETON_KEYS.map((k, i) => [k, singletons[i]]))

  const payload = {
    exported_at: new Date().toISOString(),
    schema_version: 1,
    note: 'push:subscription intentionally excluded — re-register on import',
    counts: { keys: allKeys.length, singletons: SINGLETON_KEYS.length },
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
