// Shared prayer-time fetcher. Used by both the public /api/prayers endpoint
// and the prayer-reminder cron — collapses an internal HTTP round-trip and
// removes copy-pasted defaults / cache-key shape.
import { kv } from '@vercel/kv'

export const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

export const PRAYER_DEFAULTS = {
  lat: 30.0444,    // Cairo
  lng: 31.2357,
  method: 5,       // Egyptian General Authority
  tz: 'Africa/Cairo',
}

const cacheKey = (date, lat, lng, method) =>
  `prayers:times:${date}:${lat},${lng},${method}`

// Resolve location from settings with defaults.
export function prayerLocation(settings = {}) {
  return {
    lat:    settings.prayer_lat    ?? PRAYER_DEFAULTS.lat,
    lng:    settings.prayer_lng    ?? PRAYER_DEFAULTS.lng,
    method: settings.prayer_method ?? PRAYER_DEFAULTS.method,
    tz:     settings.prayer_tz     ?? PRAYER_DEFAULTS.tz,
  }
}

// Returns { Fajr:'05:24', Dhuhr:'12:50', ... } or throws on Aladhan failure.
// Cached 2 days.
export async function getPrayerTimes(date, settings = {}) {
  const { lat, lng, method } = prayerLocation(settings)
  const key = cacheKey(date, lat, lng, method)

  const cached = await kv.get(key)
  if (cached) return cached

  const [y, m, d] = date.split('-')
  const aladhanDate = `${d}-${m}-${y}`  // Aladhan format: DD-MM-YYYY
  const r = await fetch(
    `https://api.aladhan.com/v1/timings/${aladhanDate}?latitude=${lat}&longitude=${lng}&method=${method}`
  )
  const j = await r.json()
  const t = j?.data?.timings
  if (!t) throw new Error('Aladhan returned no timings')

  const times = Object.fromEntries(PRAYERS.map(p => [p, t[p]]))
  await kv.set(key, times, { ex: 60 * 60 * 24 * 2 })
  return times
}
