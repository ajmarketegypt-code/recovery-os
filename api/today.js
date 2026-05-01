import { kv } from '@vercel/kv'
import { getHRVBaseline, isoDate } from '../src/lib/kv.js'
import { computeBaselineStats } from '../src/lib/hrv.js'
import { enrichHRV, computeEnergy, lutealFlag } from '../src/lib/enrich.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  const date = new URL(req.url).searchParams.get('date') || isoDate()
  const pillars = ['sleep','hrv','strength','movement','energy','nutrition','tags','subjective','weight','daylight','mindful']

  const [results, baseline, settings] = await Promise.all([
    Promise.all(pillars.map(p => kv.get(`health:${date}:${p}`))),
    getHRVBaseline(),
    kv.get('settings'),
  ])

  const raw = Object.fromEntries(pillars.map((p,i) => [p, results[i]]))
  const luteal = lutealFlag(settings)

  // HRV enrichment (signal + score from baseline)
  if (raw.hrv?.hrv_ms != null) {
    raw.hrv = {
      ...enrichHRV(raw.hrv, baseline, luteal),
      baseline: computeBaselineStats(baseline?.samples ?? []),
      luteal_adjusted: luteal,
    }
  }

  // Energy = composite of sleep + hrv + movement
  const energyScore = computeEnergy({
    sleep: raw.sleep, hrv: raw.hrv, movement: raw.movement, baseline, luteal,
  })
  if (energyScore != null) {
    raw.energy = { ...(raw.energy ?? {}), score: energyScore }
  }

  // Nutrition score from meal quality averages
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
