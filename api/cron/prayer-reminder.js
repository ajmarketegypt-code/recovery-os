// Prayer-time push reminder. Runs every 5 minutes.
//
// Logic: read today's 5 prayer times. For each prayer in (now, now+10min]
// that we haven't pushed today, send one and mark fired.
//
// Idempotency key: prayer:reminded:{date}:{name} with 36-hour TTL.
// Window (10 min) is intentionally wider than cron interval (5 min) so a
// single skipped run doesn't drop a reminder; dedup key handles double-fire.
import { kv } from '@vercel/kv'
import { isoDate } from '../../src/lib/kv.js'
import { PRAYERS, getPrayerTimes, prayerLocation } from '../../src/lib/prayers.js'

export const config = { runtime: 'edge' }

const LEAD_MIN = 10

// How many ms ahead of UTC an IANA timezone is at a given instant. Robust
// across V8 versions (no shortOffset format dependency).
function tzOffsetMs(epochMs, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
  const p = Object.fromEntries(dtf.formatToParts(new Date(epochMs)).map(x => [x.type, x.value]))
  const hour = +p.hour === 24 ? 0 : +p.hour
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, hour, +p.minute, +p.second)
  return asUTC - epochMs
}

// Parse "05:24" + "YYYY-MM-DD" + IANA tz → UTC ms when that wall-clock fires.
// Iterates twice for DST-edge correctness (offset at the guess vs at the true instant).
function localTimeToUTC(date, hhmm, tz) {
  const [h, m] = hhmm.split(':').map(Number)
  const [Y, Mo, D] = date.split('-').map(Number)
  const guess = Date.UTC(Y, Mo - 1, D, h, m, 0)
  const corrected = guess - tzOffsetMs(guess, tz)
  return guess - tzOffsetMs(corrected, tz)
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

  const today = isoDate()
  const { tz } = prayerLocation(settings)

  let times
  try { times = await getPrayerTimes(today, settings) }
  catch { return new Response(JSON.stringify({ ok: false, reason: 'no_times' }),
    { headers: { 'content-type': 'application/json' } }) }

  const now = Date.now()

  // Find upcoming prayers in window first — bail before any dedup reads if none
  const upcoming = []
  for (const name of PRAYERS) {
    const hhmm = times[name]; if (!hhmm) continue
    const fireAt = localTimeToUTC(today, hhmm, tz)
    const leadMs = fireAt - now
    if (leadMs > 0 && leadMs <= LEAD_MIN * 60_000) upcoming.push({ name, hhmm, leadMs })
  }
  if (upcoming.length === 0) {
    return new Response(JSON.stringify({ ok: true, fired: [], checked_at: new Date().toISOString() }),
      { headers: { 'content-type': 'application/json' } })
  }

  // Single mget for all dedup keys instead of one kv.get per prayer
  const dedupKeys = upcoming.map(u => `prayer:reminded:${today}:${u.name}`)
  const dedupVals = await kv.mget(...dedupKeys)

  const origin = new URL(req.url).origin
  const fired = []

  for (let i = 0; i < upcoming.length; i++) {
    if (dedupVals[i]) continue
    const { name, hhmm, leadMs } = upcoming[i]
    const minsAway = Math.max(1, Math.round(leadMs / 60_000))
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
      await kv.set(dedupKeys[i], 1, { ex: 60 * 60 * 36 })
      fired.push({ name, hhmm, mins_away: minsAway })
    } catch (_) { /* per-prayer errors don't block siblings */ }
  }

  return new Response(JSON.stringify({ ok: true, fired, checked_at: new Date().toISOString() }),
    { headers: { 'content-type': 'application/json' } })
}
