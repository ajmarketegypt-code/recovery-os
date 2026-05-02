// Shared KV scan + bulk-fetch helpers. Both /api/export and /api/dev/wipe
// were hand-rolling these; one bug-fix used to need two edits.
import { kv } from '@vercel/kv'

const SCAN_COUNT = 1000
const MAX_ITERATIONS = 100

// Iterate Upstash SCAN until cursor returns to 0. Returns all matching keys.
export async function scanAll(pattern) {
  const out = []
  let cursor = '0', iterations = 0
  do {
    const [next, keys] = await kv.scan(cursor, { match: pattern, count: SCAN_COUNT })
    out.push(...keys)
    cursor = String(next)
    iterations++
  } while (cursor !== '0' && iterations < MAX_ITERATIONS)
  return out
}

// Delete every key matching pattern. Returns count.
export async function deleteByPattern(pattern) {
  const keys = await scanAll(pattern)
  if (!keys.length) return 0
  // Upstash DEL is variadic; chunk to avoid request-size limits
  const CHUNK = 200
  for (let i = 0; i < keys.length; i += CHUNK) {
    await kv.del(...keys.slice(i, i + CHUNK))
  }
  return keys.length
}

// mget but chunked (Upstash caps around 100 keys per call) and concurrent.
export async function mgetChunked(keys, chunkSize = 100) {
  if (!keys.length) return []
  const chunks = []
  for (let i = 0; i < keys.length; i += chunkSize) {
    chunks.push(keys.slice(i, i + chunkSize))
  }
  const results = await Promise.all(chunks.map(c => kv.mget(...c)))
  return results.flat()
}
