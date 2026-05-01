import { kv } from '@vercel/kv'
import { getHRVBaseline } from '../src/lib/kv.js'
import { getHRVSignal, applyLutealCorrection, isLutealPhase } from '../src/lib/hrv.js'
import { scoreHRV, scoreEnergy } from '../src/lib/scoring.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const pillar = searchParams.get('pillar') || 'sleep'
  const days = parseInt(searchParams.get('days') || '30')
  const today = new Date()
  const dates = Array.from({ length: days }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (days - 1 - i))
    return d.toISOString().slice(0, 10)
  })

  const needsBaseline = pillar === 'hrv' || pillar === 'energy'
  const needsCross = pillar === 'energy'

  const [records, baseline, settings, sleepRecs, movRecs, hrvRecs] = await Promise.all([
    Promise.all(dates.map(d => kv.get(`health:${d}:${pillar}`))),
    needsBaseline ? getHRVBaseline()      : null,
    needsBaseline ? kv.get('settings')    : null,
    needsCross    ? Promise.all(dates.map(d => kv.get(`health:${d}:sleep`)))    : null,
    needsCross    ? Promise.all(dates.map(d => kv.get(`health:${d}:movement`))) : null,
    needsCross    ? Promise.all(dates.map(d => kv.get(`health:${d}:hrv`)))      : null,
  ])

  const luteal = needsBaseline ? isLutealPhase({
    last_period_start: settings?.last_period_start,
    cycle_length_days: settings?.cycle_length_days ?? 28,
  }) : false

  const enriched = dates.map((date, i) => {
    const raw = records[i] ?? {}
    if (pillar === 'hrv' && raw.hrv_ms != null) {
      const adjusted = applyLutealCorrection(raw.hrv_ms, luteal)
      const signal = getHRVSignal(adjusted, baseline)
      return { date, ...raw, signal, score: scoreHRV(signal) }
    }
    if (pillar === 'energy') {
      const s = sleepRecs[i], m = movRecs[i], h = hrvRecs[i]
      if (s?.score != null && m?.score != null && h?.hrv_ms != null) {
        const adjusted = applyLutealCorrection(h.hrv_ms, luteal)
        const hrv_score = scoreHRV(getHRVSignal(adjusted, baseline))
        return { date, ...raw, score: scoreEnergy({ sleep_score: s.score, hrv_score, movement_score: m.score }) }
      }
    }
    return { date, ...raw }
  })

  return new Response(JSON.stringify(enriched), { headers: { 'content-type': 'application/json' } })
}
