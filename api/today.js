import { kv } from '@vercel/kv'
import { getHRVBaseline, isoDate } from '../src/lib/kv.js'
import { getHRVSignal, computeBaselineStats, applyLutealCorrection, isLutealPhase } from '../src/lib/hrv.js'
import { scoreHRV, scoreEnergy } from '../src/lib/scoring.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  const date = new URL(req.url).searchParams.get('date') || isoDate()
  const pillars = ['sleep','hrv','strength','movement','energy','nutrition','tags','subjective','weight']

  const [results, baseline, settings] = await Promise.all([
    Promise.all(pillars.map(p => kv.get(`health:${date}:${p}`))),
    getHRVBaseline(),
    kv.get('settings'),
  ])

  const raw = Object.fromEntries(pillars.map((p,i) => [p, results[i]]))

  // Enrich HRV: compute signal and score at read time
  if (raw.hrv?.hrv_ms != null) {
    const samples = baseline?.samples ?? []
    const stats = computeBaselineStats(samples)
    const luteal = isLutealPhase({
      last_period_start: settings?.last_period_start,
      cycle_length_days: settings?.cycle_length_days ?? 28,
    })
    const adjusted = applyLutealCorrection(raw.hrv.hrv_ms, luteal)
    const signal = getHRVSignal(adjusted, baseline)
    raw.hrv = { ...raw.hrv, signal, score: scoreHRV(signal), baseline: stats, luteal_adjusted: luteal }
  }

  // Compute energy score from sleep + hrv + movement
  const sleep_score = raw.sleep?.score ?? null
  const hrv_score = raw.hrv?.score ?? null
  const movement_score = raw.movement?.score ?? null
  if (sleep_score != null && hrv_score != null && movement_score != null) {
    raw.energy = { ...(raw.energy ?? {}), score: scoreEnergy({ sleep_score, hrv_score, movement_score }) }
  }

  // Compute nutrition score from meal quality scores
  if (raw.nutrition?.meals?.length > 0) {
    const qs = raw.nutrition.meals.map(m => m.quality_score).filter(q => q != null)
    if (qs.length > 0) {
      raw.nutrition = { ...raw.nutrition, score: Math.round(qs.reduce((a,b) => a+b, 0) / qs.length) }
    }
  }

  return new Response(JSON.stringify({ date, ...raw }), {
    headers: { 'content-type': 'application/json' },
  })
}
