// Critical health alerts — only ever 4 rules, not a stream.
// Each detector returns either null (no alert) or { type, title, body, url? }.
// The morning cron runs all detectors and fires pushes via the suppression
// gate (one fire per alert type per 7 days) so the user isn't spammed
// when a condition persists.

const ROLLING_DAYS = 14   // baseline lookback
const RECENT_DAYS  = 2    // how many recent days a condition must hold
const SUPPRESS_DAYS = 7   // don't refire same alert type within this window

// 1) HRV down >20% from baseline for 2 days
export function hrvDropAlert(hrvHistory, baseline) {
  const baselineMean = baseline?.mean
  if (!baselineMean || baselineMean < 5) return null
  const recent = hrvHistory.slice(-RECENT_DAYS)
    .map(r => r?.hrv_ms).filter(v => v != null)
  if (recent.length < RECENT_DAYS) return null
  const threshold = baselineMean * 0.8
  if (!recent.every(v => v < threshold)) return null
  const dropPct = Math.round(((baselineMean - recent[recent.length-1]) / baselineMean) * 100)
  return {
    type: 'hrv_drop',
    title: 'Possible illness signal',
    body: `HRV down ${dropPct}% for 2 days. Pull back training and watch for symptoms.`,
    url: '/',
  }
}

// 2) Sleep <6h two nights running
export function sleepDebtAlert(sleepHistory) {
  const recent = sleepHistory.slice(-RECENT_DAYS)
    .map(s => s?.total_hours).filter(v => v != null)
  if (recent.length < RECENT_DAYS) return null
  if (!recent.every(h => h < 6)) return null
  const total = recent.reduce((a,b) => a+b, 0).toFixed(1)
  return {
    type: 'sleep_debt',
    title: 'Sleep debt building',
    body: `Only ${total}h sleep across 2 nights. Prioritize 8h tonight or take a recovery day.`,
    url: '/',
  }
}

// 3) Resting HR up >5bpm vs baseline (3-day avg vs 11-day avg)
export function rhrElevatedAlert(hrvHistory) {
  const all = hrvHistory.map(h => h?.resting_hr).filter(v => v != null)
  if (all.length < ROLLING_DAYS - 1) return null
  const recent = all.slice(-3)
  if (recent.length < 3) return null
  const baseline = all.slice(-ROLLING_DAYS, -3)
  if (baseline.length < 5) return null
  const baseAvg = baseline.reduce((a,b) => a+b, 0) / baseline.length
  const recentAvg = recent.reduce((a,b) => a+b, 0) / recent.length
  const delta = recentAvg - baseAvg
  if (delta < 5) return null
  return {
    type: 'rhr_elevated',
    title: 'Resting heart rate elevated',
    body: `RHR up ${Math.round(delta)}bpm vs baseline. Stress, illness brewing, or overtraining?`,
    url: '/',
  }
}

// 4) Today's brief recommendation flipped to Rest from anything else
export function briefFlipAlert(briefToday, briefYesterday) {
  if (briefToday?.skipped || !briefToday?.recommendation) return null
  if (briefToday.recommendation !== 'Rest') return null
  if (!briefYesterday?.recommendation) return null
  if (briefYesterday.recommendation === 'Rest') return null  // already resting
  return {
    type: 'brief_flip_rest',
    title: 'Recovery state changed',
    body: `Yesterday recommended '${briefYesterday.recommendation}', today says Rest. Trust your body.`,
    url: '/',
  }
}

// Combine all detectors. Returns the alerts that should fire after suppression.
// `firedRecently` is a Set of alert type names fired within SUPPRESS_DAYS.
export function detectAlerts({ hrvHistory, sleepHistory, baseline, briefToday, briefYesterday }, firedRecently = new Set()) {
  const candidates = [
    hrvDropAlert(hrvHistory, baseline),
    sleepDebtAlert(sleepHistory),
    rhrElevatedAlert(hrvHistory),
    briefFlipAlert(briefToday, briefYesterday),
  ].filter(Boolean)
  return candidates.filter(a => !firedRecently.has(a.type))
}

export const SUPPRESS_DAYS_VALUE = SUPPRESS_DAYS
