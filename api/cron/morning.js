import { kv } from '../../src/lib/kv.js'
import { isoDate, getHRVBaseline, getBrief } from '../../src/lib/kv.js'
import { detectAlerts, SUPPRESS_DAYS_VALUE } from '../../src/lib/alerts.js'

export const config = { runtime: 'edge' }

const HISTORY_DAYS = 14

function dateNDaysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return isoDate(d)
}

export default async function handler(req) {
  const s = req.headers.get('x-vercel-cron-secret') ?? req.headers.get('authorization')?.replace('Bearer ', '')
  if (s !== process.env.CRON_SECRET) return new Response('Unauthorized', { status: 401 })

  const origin = new URL(req.url).origin
  const today = isoDate()

  // Generate / fetch today's brief (existing behavior)
  const brief = await fetch(`${origin}/api/brief`).then(r => r.json())
  if (brief?.headline && !brief?.skipped) {
    await fetch(`${origin}/api/push/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET },
      body: JSON.stringify({ title: 'Health', body: brief.headline, url: '/' }),
    })
  }

  // === Critical alert checks ===
  const dates = Array.from({ length: HISTORY_DAYS }, (_, i) => dateNDaysAgo(HISTORY_DAYS - 1 - i))
  const [hrvHistory, sleepHistory, baseline, briefYesterday, lastIngest] = await Promise.all([
    Promise.all(dates.map(d => kv.get(`health:${d}:hrv`))),
    Promise.all(dates.map(d => kv.get(`health:${d}:sleep`))),
    getHRVBaseline(),
    getBrief(dateNDaysAgo(1)),
    kv.get('debug:last-ingest'),
  ])

  // Collect which alert types have been fired within suppression window
  const suppressDays = Array.from({ length: SUPPRESS_DAYS_VALUE }, (_, i) => dateNDaysAgo(i))
  const firedKeys = await Promise.all(suppressDays.map(d => kv.get(`alert:fired:${d}`)))
  const firedRecently = new Set()
  for (const arr of firedKeys) {
    if (Array.isArray(arr)) arr.forEach(t => firedRecently.add(t))
  }

  const alerts = detectAlerts({
    hrvHistory, sleepHistory, baseline,
    briefToday: brief, briefYesterday, lastIngest,
  }, firedRecently)

  // Fire each alert as its own push, then mark fired for today
  if (alerts.length > 0) {
    const todaysFired = (await kv.get(`alert:fired:${today}`)) ?? []

    // Update active in-app list — replace any existing of same type with newer
    const activeList = (await kv.get('alerts:active')) ?? []
    const keptTypes = new Set(alerts.map(a => a.type))
    const filtered = activeList.filter(a => !keptTypes.has(a.type))
    const stamped = alerts.map(a => ({ ...a, fired_at: new Date().toISOString() }))
    const nextActive = [...filtered, ...stamped].slice(-10)  // cap

    for (const a of alerts) {
      try {
        await fetch(`${origin}/api/push/send`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET },
          body: JSON.stringify({ title: '⚠️ ' + a.title, body: a.body, url: a.url || '/' }),
        })
        todaysFired.push(a.type)
      } catch (_) {}
    }

    await kv.set(`alert:fired:${today}`, todaysFired, { ex: 60 * 60 * 24 * (SUPPRESS_DAYS_VALUE + 1) })
    await kv.set('alerts:active', nextActive, { ex: 60 * 60 * 24 * 30 })
  }

  return new Response(JSON.stringify({
    ok: true,
    brief_pushed: !!brief?.headline && !brief?.skipped,
    alerts_fired: alerts.map(a => a.type),
    alerts_suppressed: [...firedRecently],
  }), { headers: { 'content-type': 'application/json' } })
}
