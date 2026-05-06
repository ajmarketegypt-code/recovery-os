// Shared KV scan + bulk-fetch helpers for /api/export and /api/dev/wipe.
//
// Uses the RAW kv (not the namespace-wrapped one) because scan returns
// fully-qualified key names that already include the namespace prefix,
// and re-prefixing them via the wrapper would double-prefix on mget/del.
// We add the namespace to the SCAN pattern manually so callers can pass
// the unprefixed pattern they conceptually want ("health:*") without
// caring which user namespace the deploy is in.
import { kv as rawKv } from '@vercel/kv'
import { KEY_NAMESPACE } from './kv.js'

const SCAN_COUNT = 1000
const MAX_ITERATIONS = 100

const fullPattern = (p) => `${KEY_NAMESPACE}:${p}`

// Returns all keys matching the (unprefixed) pattern, fully-qualified.
export async function scanAll(unprefixedPattern) {
  const pattern = fullPattern(unprefixedPattern)
  const out = []
  let cursor = '0', iterations = 0
  do {
    const [next, keys] = await rawKv.scan(cursor, { match: pattern, count: SCAN_COUNT })
    out.push(...keys)
    cursor = String(next)
    iterations++
  } while (cursor !== '0' && iterations < MAX_ITERATIONS)
  return out
}

// Delete every key matching pattern. Returns count.
export async function deleteByPattern(unprefixedPattern) {
  const keys = await scanAll(unprefixedPattern)
  if (!keys.length) return 0
  const CHUNK = 200
  for (let i = 0; i < keys.length; i += CHUNK) {
    await rawKv.del(...keys.slice(i, i + CHUNK))
  }
  return keys.length
}

// mget on already-fully-qualified keys (typically the output of scanAll).
// Chunked for Upstash's per-call cap; chunks run concurrently.
export async function mgetChunked(fullyQualifiedKeys, chunkSize = 100) {
  if (!fullyQualifiedKeys.length) return []
  const chunks = []
  for (let i = 0; i < fullyQualifiedKeys.length; i += chunkSize) {
    chunks.push(fullyQualifiedKeys.slice(i, i + chunkSize))
  }
  const results = await Promise.all(chunks.map(c => rawKv.mget(...c)))
  return results.flat()
}
