// Prayer-time push reminder. Runs every 5 minutes.
//
// Logic: read today's 5 prayer times (Aladhan via /api/prayers cache).
// For each prayer, if it fires in (now, now+leadMin] and we haven't already
// pushed a reminder for it today, send one and mark it fired.
//
// Idempotency key: prayer:reminded:{date}:{name} with 36-hour TTL.
import { kv } from '@vercel/kv'
import { isoDate } from '../../src/lib/kv.js'

export const config = { runtime: 'edge' }

const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
const LEAD_MIN = 10  // notify when prayer is ≤10 min away

// Compute how many ms ahead of UTC an IANA timezone is at a given instant.
// Robust across V8 versions (doesn't depend on shortOffset format strings).
function tzOffsetMs(epochMs, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  const p = Object.fromEntries(dtf.formatToParts(new Date(epochMs)).map(x => [x.type, x.value]))
  const hour = +p.hour === 24 ? 0 : +p.hour  // some engines emit "24"
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, hour, +p.minute, +p.second)
  return asUTC - epochMs  // positive for east of UTC (e.g. +3h for Cairo summer)
}

// Parse "05:24" + "YYYY-MM-DD" + IANA tz → UTC ms when that wall-clock fires.
function localTimeToUTC(date, hhmm, tz) {
  const [h, m] = hhmm.split(':').map(Number)
  const [Y, Mo, D] = date.split('-').map(Number)
  // Treat the wall clock as if it were UTC, then subtract the tz's offset
  const guess = Date.UTC(Y, Mo - 1, D, h, m, 0)
  return guess - tzOffsetMs(guess, tz)
}

export default async function handler(req) {
  const auth = req.headers.get('x-vercel-cron-secret')
    ?? req.headers.get('authorization')?.replace('Bearer ', '')
  if (auth !== process.env.CRON_SECRET) return new Response('Unauthorized', { status: 401 })

  const settings = (await kv.get('settings')) ?? {}
  if (settings.prayer_reminders_enabled === false) {
    return new Response(JSON.stringify({ ok: true, skipped: 'disabled' }),
      { headers: { 'content-type': 'application/json' } })
  }

  const tz = settings.prayer_tz ?? 'Africa/Cairo'
  const today = isoDate()

  // Reuse the cached times (or trigger Aladhan fetch via the same logic)
  const lat    = settings.prayer_lat    ?? 30.0444
  const lng    = settings.prayer_lng    ?? 31.2357
  const method = settings.prayer_method ?? 5
  const cacheKey = `prayers:times:${today}:${lat},${lng},${method}`
  let times = await kv.get(cacheKey)
  if (!times) {
    // Cold cache — fetch from our own /api/prayers (it'll cache + return)
    const origin = new URL(req.url).origin
    const r = await fetch(`${origin}/api/prayers?date=${today}`).then(r => r.json()).catch(() => null)
    times = r?.times
    if (!times) return new Response(JSON.stringify({ ok: false, reason: 'no_times' }),
      { headers: { 'content-type': 'application/json' } })
  }

  const now = Date.now()
  const fired = []

  for (const name of PRAYERS) {
    const hhmm = times[name]; if (!hhmm) continue

    const fireAt = localTimeToUTC(today, hhmm, tz)
    const leadMs = (fireAt - now)
    // Only notify in the (0, LEAD_MIN] window so we don't double up if cron
    // runs slightly off-cadence
    if (leadMs <= 0 || leadMs > LEAD_MIN * 60_000) continue

    const dedupKey = `prayer:reminded:${today}:${name}`
    if (await kv.get(dedupKey)) continue

    const minsAway = Math.max(1, Math.round(leadMs / 60_000))
    const origin = new URL(req.url).origin
    try {
      await fetch(`${origin}/api/push/send`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET },
        body: JSON.stringify({
          title: `🕌 ${name} in ${minsAway} min`,
          body: `Prayer at ${hhmm}`,
          url: '/',
        }),
      })
      // 36h TTL covers timezone weirdness across midnight
      await kv.set(dedupKey, 1, { ex: 60 * 60 * 36 })
      fired.push({ name, hhmm, mins_away: minsAway })
    } catch (_) { /* swallow per-prayer errors so one bad fetch doesn't block others */ }
  }

  return new Response(JSON.stringify({ ok: true, fired, checked_at: new Date().toISOString() }),
    { headers: { 'content-type': 'application/json' } })
}
