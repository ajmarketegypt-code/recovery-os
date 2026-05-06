// Daily prayer times + completion tracking.
// GET /api/prayers?date=YYYY-MM-DD → { times, completed, location }
import { kv } from '../src/lib/kv.js'
import { isoDate } from '../src/lib/kv.js'
import { getPrayerTimes, prayerLocation } from '../src/lib/prayers.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  const date = new URL(req.url).searchParams.get('date') || isoDate()
  const settings = (await kv.get('settings')) ?? {}

  let times
  try {
    times = await getPrayerTimes(date, settings)
  } catch (err) {
    return new Response(JSON.stringify({ error: 'fetch_failed', message: err.message }),
      { status: 502, headers: { 'content-type': 'application/json' } })
  }

  const completed = (await kv.get(`health:${date}:prayers`)) ?? []
  const location = prayerLocation(settings)

  return new Response(JSON.stringify({ date, times, completed, location }),
    { headers: { 'content-type': 'application/json' } })
}
