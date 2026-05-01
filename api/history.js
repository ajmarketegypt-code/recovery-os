import { kv } from '@vercel/kv'
import { getHRVBaseline } from '../src/lib/kv.js'
import { enrichHRV, computeEnergy, lutealFlag } from '../src/lib/enrich.js'

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

  const luteal = needsBaseline ? lutealFlag(settings) : false

  const enriched = dates.map((date, i) => {
    const raw = records[i] ?? {}
    if (pillar === 'hrv') {
      return { date, ...enrichHRV(raw, baseline, luteal) }
    }
    if (pillar === 'energy') {
      const score = computeEnergy({
        sleep: sleepRecs[i], hrv: hrvRecs[i], movement: movRecs[i], baseline, luteal,
      })
      return score != null ? { date, ...raw, score } : { date, ...raw }
    }
    return { date, ...raw }
  })

  return new Response(JSON.stringify(enriched), { headers: { 'content-type': 'application/json' } })
}
