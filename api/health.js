// System health heartbeat. Single endpoint to answer "is anything broken?"
// without manually reading 6 different KV keys.
//
// Returns: last successful HAE ingest, last morning cron run, last brief
// generated, last error logged, current AI spend, push subscription state.
//
// All four council members independently asked for this — no observability
// gap is more painful than "did the cron actually run today?"
//
// Auth: optional ?secret=<HEALTH_CHECK_SECRET> for remote monitoring
// (Uptime Robot, scheduled agent, etc). Without secret, returns minimal
// "ok/not_ok" only.
import { kv } from '../src/lib/kv.js'
import { isoDate, isoMonth, KEY_NAMESPACE, APP_TIMEZONE } from '../src/lib/kv.js'

export const config = { runtime: 'edge' }

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export default async function handler(req) {
  const url = new URL(req.url)
  const fullDetail = url.searchParams.get('secret') === process.env.HEALTH_CHECK_SECRET
  const now = Date.now()
  const today = isoDate()
  const month = isoMonth()

  const [
    lastIngest, briefToday, aiSpend, push, errorsLog, alerts, hrvBaseline,
  ] = await kv.mget(
    'debug:last-ingest',
    `brief:${today}`,
    `ai:spend:${month}`,
    'push:subscription',
    'errors:log',
    'alerts:active',
    'hrv:baseline',
  )

  const ingestAt = lastIngest?.received_at ? new Date(lastIngest.received_at).getTime() : null
  const ingestAgeHr = ingestAt ? Math.round((now - ingestAt) / HOUR) : null
  const briefAt = briefToday?.generated_at ? new Date(briefToday.generated_at).getTime() : null
  const errorCount = Array.isArray(errorsLog) ? errorsLog.length : 0
  const recentErrors = (Array.isArray(errorsLog) ? errorsLog : [])
    .filter(e => e?.received_at && (now - new Date(e.received_at).getTime()) < DAY).length

  const checks = {
    ingest_ok:      ingestAgeHr != null && ingestAgeHr < 24,
    brief_ok:       briefToday != null && (!!briefToday.headline || briefToday.skipped),
    push_ok:        !!push,
    cost_ok:        (aiSpend ?? 0) < 250,         // 83% of $3 cap
    errors_ok:      recentErrors < 5,
    baseline_ready: (hrvBaseline?.n ?? 0) >= 14,
  }

  const allOk = Object.values(checks).every(Boolean)

  if (!fullDetail) {
    return new Response(JSON.stringify({ ok: allOk, checks }),
      { headers: { 'content-type': 'application/json' } })
  }

  return new Response(JSON.stringify({
    ok: allOk,
    namespace: KEY_NAMESPACE,
    timezone: APP_TIMEZONE,
    today, month,
    checks,
    detail: {
      last_ingest_at: lastIngest?.received_at ?? null,
      last_ingest_age_hours: ingestAgeHr,
      last_ingest_bytes: lastIngest?.bytes ?? null,
      last_ingest_metrics: lastIngest?.metric_names?.length ?? 0,
      brief_today_generated_at: briefToday?.generated_at ?? null,
      brief_today_skipped_reason: briefToday?.skipped ? briefToday.reason : null,
      ai_spend_cents: aiSpend ?? 0,
      ai_cap_cents: 300,
      push_subscribed: !!push,
      errors_total: errorCount,
      errors_last_24h: recentErrors,
      active_alerts: Array.isArray(alerts) ? alerts.map(a => a.type) : [],
      hrv_baseline_n: hrvBaseline?.n ?? 0,
      hrv_baseline_mean: hrvBaseline?.mean ?? null,
    },
  }, null, 2), { headers: { 'content-type': 'application/json' } })
}
