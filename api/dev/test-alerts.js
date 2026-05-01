// Run alert detection without sending pushes — for debugging.
// GET /api/dev/test-alerts → { candidates, suppressed, would_fire }
import { kv } from '@vercel/kv'
import { isoDate, getHRVBaseline, getBrief } from '../../src/lib/kv.js'
import { detectAlerts, hrvDropAlert, sleepDebtAlert, rhrElevatedAlert, briefFlipAlert, SUPPRESS_DAYS_VALUE } from '../../src/lib/alerts.js'

export const config = { runtime: 'edge' }

const HISTORY_DAYS = 14

function dateNDaysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n)
  return isoDate(d)
}

export default async function handler() {
  const dates = Array.from({ length: HISTORY_DAYS }, (_, i) => dateNDaysAgo(HISTORY_DAYS - 1 - i))
  const [hrvHistory, sleepHistory, baseline, briefToday, briefYesterday] = await Promise.all([
    Promise.all(dates.map(d => kv.get(`health:${d}:hrv`))),
    Promise.all(dates.map(d => kv.get(`health:${d}:sleep`))),
    getHRVBaseline(),
    getBrief(isoDate()),
    getBrief(dateNDaysAgo(1)),
  ])

  // Run each detector individually for debug visibility
  const detail = {
    hrv_drop:    hrvDropAlert(hrvHistory, baseline),
    sleep_debt:  sleepDebtAlert(sleepHistory),
    rhr_elevated: rhrElevatedAlert(hrvHistory),
    brief_flip:  briefFlipAlert(briefToday, briefYesterday),
  }

  const suppressDays = Array.from({ length: SUPPRESS_DAYS_VALUE }, (_, i) => dateNDaysAgo(i))
  const firedKeys = await Promise.all(suppressDays.map(d => kv.get(`alert:fired:${d}`)))
  const suppressed = new Set()
  for (const arr of firedKeys) {
    if (Array.isArray(arr)) arr.forEach(t => suppressed.add(t))
  }

  const wouldFire = detectAlerts({
    hrvHistory, sleepHistory, baseline, briefToday, briefYesterday,
  }, suppressed)

  return new Response(JSON.stringify({
    detail,
    suppressed: [...suppressed],
    would_fire: wouldFire.map(a => a.type),
    debug: {
      hrv_days_with_data: hrvHistory.filter(h => h?.hrv_ms != null).length,
      sleep_days_with_data: sleepHistory.filter(s => s?.total_hours != null).length,
      baseline_n: baseline?.n ?? 0,
      brief_yesterday_rec: briefYesterday?.recommendation ?? null,
      brief_today_rec: briefToday?.recommendation ?? null,
    },
  }, null, 2), { headers: { 'content-type': 'application/json' } })
}
