// Returns the last raw payload received by /api/health-ingest.
// GET /api/dev/last-ingest
import { kv } from '@vercel/kv'
export const config = { runtime: 'edge' }
export default async function handler() {
  const data = await kv.get('debug:last-ingest')
  return new Response(JSON.stringify(data ?? { message: 'No payload received yet' }, null, 2),
    { headers: { 'content-type': 'application/json' } })
}
