// src/lib/hrv.js
const MAX_SAMPLES = 30
const LUTEAL_OFFSET_MS = 4

export function appendToBaseline(baseline, sample) {
  const samples = [...(baseline.samples ?? []), sample]
  if (samples.length > MAX_SAMPLES) samples.shift()
  const mean = samples.reduce((s, x) => s + x.value, 0) / samples.length
  return {
    samples,
    mean: Math.round(mean * 10) / 10,
    n: samples.length,
    lastComputed: new Date().toISOString(),
  }
}

export function computeBaselineStats(samples) {
  const n = samples.length
  if (n < 7) return { signal_available: false, regime: 'establishing', mean: null, n }
  const mean = samples.reduce((s, x) => s + x.value, 0) / n
  return {
    signal_available: true,
    regime: n >= 30 ? 'stable' : 'calibrating',
    mean: Math.round(mean * 10) / 10,
    n,
  }
}

export function getHRVSignal(hrv_ms, baseline) {
  if (!baseline?.mean) return 'yellow'
  const pct = (hrv_ms - baseline.mean) / baseline.mean
  if (pct > 0.10)  return 'green'
  if (pct < -0.10) return 'red'
  return 'yellow'
}

export function applyLutealCorrection(hrv_ms, isLuteal) {
  return isLuteal ? hrv_ms + LUTEAL_OFFSET_MS : hrv_ms
}

export function isLutealPhase({ last_period_start, cycle_length_days = 28 }) {
  if (!last_period_start) return false
  const start = new Date(last_period_start)
  const today = new Date()
  const dayOfCycle = Math.floor((today - start) / (1000 * 60 * 60 * 24)) % cycle_length_days
  return dayOfCycle >= 14
}
