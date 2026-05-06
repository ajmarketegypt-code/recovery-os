// One-shot migration: copy pre-namespace KV keys into the current
// USER_NAMESPACE. Idempotent — safe to run multiple times. Run once
// after adding the namespace wrapper, then leave alone.
//
// POST /api/dev/migrate-keys?secret=<INGEST_SECRET>&dry=1   (preview)
// POST /api/dev/migrate-keys?secret=<INGEST_SECRET>          (do it)
// POST /api/dev/migrate-keys?secret=<INGEST_SECRET>&delete=1 (also delete originals)
import { kv as rawKv } from '@vercel/kv'
import { KEY_NAMESPACE } from '../../src/lib/kv.js'

export const config = { runtime: 'edge' }

const PATTERNS = ['health:*', 'brief:*', 'report:*', 'prayers:*', 'alerts:*', 'alert:*',
                  'ai:spend:*', 'vision:budget:*', 'ingest:seen:*']
const SINGLETONS = ['settings', 'hrv:baseline', 'push:subscription',
                    'alerts:active', 'debug:last-ingest', 'errors:log']

async function scanRaw(pattern) {
  const out = []
  let cursor = '0', i = 0
  do {
    const [next, keys] = await rawKv.scan(cursor, { match: pattern, count: 1000 })
    out.push(...keys)
    cursor = String(next); i++
  } while (cursor !== '0' && i < 100)
  return out
}

const isAlreadyPrefixed = (k) => k.startsWith(`${KEY_NAMESPACE}:`)

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })
  const url = new URL(req.url)
  if (url.searchParams.get('secret') !== process.env.INGEST_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }
  const dryRun = url.searchParams.get('dry') === '1'
  const deleteOriginals = url.searchParams.get('delete') === '1'

  // Find all pre-namespace keys (those NOT already starting with NS:)
  const allKeys = []
  for (const p of PATTERNS) {
    const found = await scanRaw(p)
    allKeys.push(...found.filter(k => !isAlreadyPrefixed(k)))
  }
  for (const s of SINGLETONS) {
    const v = await rawKv.get(s)
    if (v != null) allKeys.push(s)
  }

  if (dryRun) {
    return new Response(JSON.stringify({
      dry_run: true, namespace: KEY_NAMESPACE,
      would_migrate: allKeys.length,
      sample: allKeys.slice(0, 20),
      delete_after: deleteOriginals,
    }, null, 2), { headers: { 'content-type': 'application/json' } })
  }

  let migrated = 0, deleted = 0, skipped = 0
  for (const oldKey of allKeys) {
    const newKey = `${KEY_NAMESPACE}:${oldKey}`
    // Don't clobber data already at the new key (might be newer)
    const existsAtNew = await rawKv.get(newKey)
    if (existsAtNew != null) { skipped++; continue }

    const value = await rawKv.get(oldKey)
    if (value == null) { skipped++; continue }
    await rawKv.set(newKey, value)
    migrated++
    if (deleteOriginals) { await rawKv.del(oldKey); deleted++ }
  }

  return new Response(JSON.stringify({
    ok: true, namespace: KEY_NAMESPACE,
    found: allKeys.length, migrated, deleted, skipped,
  }, null, 2), { headers: { 'content-type': 'application/json' } })
}
