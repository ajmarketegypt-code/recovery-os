// Single source of truth for read-time pillar enrichment.
// Both /api/today and /api/history call these so a given date's score
// can never disagree between the two endpoints.
import { applyLutealCorrection, isLutealPhase, getHRVSignal } from './hrv.js'
import { scoreHRV, scoreEnergy } from './scoring.js'

export function lutealFlag(settings) {
  return isLutealPhase({
    last_period_start: settings?.last_period_start,
    cycle_length_days: settings?.cycle_length_days ?? 28,
  })
}

export function enrichHRV(raw, baseline, luteal) {
  if (!raw || raw.hrv_ms == null) return raw
  const adjusted = applyLutealCorrection(raw.hrv_ms, luteal)
  const signal = getHRVSignal(adjusted, baseline)
  return { ...raw, signal, score: scoreHRV(signal) }
}

export function computeEnergy({ sleep, hrv, movement, baseline, luteal }) {
  if (sleep?.score == null || movement?.score == null || hrv?.hrv_ms == null) return null
  const adjusted = applyLutealCorrection(hrv.hrv_ms, luteal)
  const hrv_score = scoreHRV(getHRVSignal(adjusted, baseline))
  return scoreEnergy({
    sleep_score: sleep.score,
    hrv_score,
    movement_score: movement.score,
  })
}
