// Daily prayer times + completion tracking.
// GET /api/prayers?date=YYYY-MM-DD → { times, completed, location }
//
// Times come from Aladhan API (free, no key) and are cached for 2 days.
// Completion is stored per-day in KV at health:${date}:prayers as a
// string array of completed prayer names.
import { kv } from '@vercel/kv'
import { isoDate } from '../src/lib/kv.js'

export const config = { runtime: 'edge' }

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

export default async function handler(req) {
  const url = new URL(req.url)
  const date = url.searchParams.get('date') || isoDate()

  const settings = (await kv.get('settings')) ?? {}
  const lat    = settings.prayer_lat    ?? 30.0444  // Cairo default
  const lng    = settings.prayer_lng    ?? 31.2357
  const method = settings.prayer_method ?? 5         // Egyptian General Authority

  // Cache prayer times for the day (they don't recompute)
  const cacheKey = `prayers:times:${date}:${lat},${lng},${method}`
  let times = await kv.get(cacheKey)

  if (!times) {
    try {
      const [y, m, d] = date.split('-')
      const aladhanDate = `${d}-${m}-${y}`  // Aladhan format: DD-MM-YYYY
      const r = await fetch(
        `https://api.aladhan.com/v1/timings/${aladhanDate}?latitude=${lat}&longitude=${lng}&method=${method}`
      )
      const j = await r.json()
      const t = j?.data?.timings
      if (!t) {
        return new Response(JSON.stringify({ error: 'aladhan_failed', detail: j }),
          { status: 502, headers: { 'content-type': 'application/json' } })
      }
      times = Object.fromEntries(PRAYERS.map(p => [p, t[p]]))
      await kv.set(cacheKey, times, { ex: 60 * 60 * 24 * 2 })
    } catch (err) {
      return new Response(JSON.stringify({ error: 'fetch_failed', message: err.message }),
        { status: 500, headers: { 'content-type': 'application/json' } })
    }
  }

  const completed = (await kv.get(`health:${date}:prayers`)) ?? []

  return new Response(JSON.stringify({
    date, times, completed,
    location: { lat, lng, method },
  }), { headers: { 'content-type': 'application/json' } })
}
