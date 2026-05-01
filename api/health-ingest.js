// api/health-ingest.js
import { kv } from '@vercel/kv'
import { getHealthData, setHealthData, getHRVBaseline, setHRVBaseline, isoDate } from '../src/lib/kv.js'
import { appendToBaseline } from '../src/lib/hrv.js'
import { scoreSleep, scoreMovement, scoreStrength } from '../src/lib/scoring.js'
import { isHAEFormat, translateHAE } from '../src/lib/hae.js'

const INGEST_SECRET = process.env.INGEST_SECRET

// Lightweight hash for idempotency key
async function hashKey(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const secret = req.headers.get('x-ingest-secret')
  if (secret !== INGEST_SECRET) return new Response('Unauthorized', { status: 401 })

  let rawBody
  try { rawBody = await req.text() } catch { return new Response('Bad body', { status: 400 }) }

  let body
  try { body = JSON.parse(rawBody) } catch { return new Response('Bad JSON', { status: 400 }) }

  // DEBUG: stash last raw payload + a tiny summary for inspection
  const wasHAE = isHAEFormat(body)
  await kv.set('debug:last-ingest', {
    received_at: new Date().toISOString(),
    bytes: rawBody.length,
    detected_format: wasHAE ? 'HAE' : 'native',
    sample_body: rawBody.slice(0, 4000),  // first 4KB
    metric_names: wasHAE
      ? (body.data?.metrics ?? []).map(m => m.name).slice(0, 50)
      : (body.metrics ?? []).map(m => m.type).slice(0, 50),
    workout_count: body.data?.workouts?.length ?? 0,
  }, { ex: 86400 })

  // Auto-detect Health Auto Export's native payload and translate it to our format
  if (wasHAE) body = translateHAE(body)

  const { metrics = [], exportedAt = new Date().toISOString() } = body

  let processed = 0, skipped = 0

  for (const metric of metrics) {
    const { type, date, value, data } = metric
    if (!type || !date) { skipped++; continue }

    // Idempotency check
    const idKey = `ingest:seen:${await hashKey(type + date + JSON.stringify(value ?? data) + exportedAt)}`
    if (await kv.get(idKey)) { skipped++; continue }
    await kv.set(idKey, 1, { ex: 7200 }) // 2h TTL

    // Map HAE metric type → KV pillar
    if (type === 'sleep' && data) {
      const { total_hours, efficiency, stages } = data
      const score = scoreSleep({ total_hours, efficiency, stages })
      await setHealthData(date, 'sleep', { ...data, score, source: 'auto' })

    } else if (type === 'hrv' && value != null) {
      const existing = await getHealthData(date, 'hrv') ?? {}
      await setHealthData(date, 'hrv', { ...existing, hrv_ms: value, source: 'auto' })

      // Update rolling baseline
      const baseline = await getHRVBaseline() ?? { samples: [], mean: null, n: 0 }
      const updated = appendToBaseline(baseline, { date, value })
      await setHRVBaseline(updated)

    } else if (type === 'resting_hr' && value != null) {
      const existing = await getHealthData(date, 'hrv') ?? {}
      await setHealthData(date, 'hrv', { ...existing, resting_hr: value })

    } else if (type === 'workout' && data) {
      const existing = await getHealthData(date, 'strength') ?? { workouts: [], weekly_count: 0, score: 0, sets: [] }
      const workouts = [...existing.workouts, data]
      const settings = await kv.get('settings') ?? { workout_target: 4 }
      const score = scoreStrength({ weekly_workouts: workouts.length, target: settings.workout_target })
      await setHealthData(date, 'strength', { ...existing, workouts, weekly_count: workouts.length, score })

    } else if (type === 'activity_rings' && data) {
      const existing = await getHealthData(date, 'movement') ?? {}
      const { move_pct, exercise_pct, stand_pct, steps } = data
      const score = scoreMovement({ move_pct, exercise_pct, stand_pct })
      await setHealthData(date, 'movement', { ...existing, move_pct, exercise_pct, stand_pct, steps, score })

    } else if (type === 'recovery_extra' && data) {
      // Walking HR avg + wrist temperature deviation — enrich the HRV record
      const existing = await getHealthData(date, 'hrv') ?? {}
      await setHealthData(date, 'hrv', { ...existing, ...data })

    } else if (type === 'fitness_extra' && data) {
      // VO2 Max — enrich the movement record (changes slowly)
      const existing = await getHealthData(date, 'movement') ?? {}
      await setHealthData(date, 'movement', { ...existing, ...data })

    } else if (type === 'daylight' && value != null) {
      await setHealthData(date, 'daylight', { minutes: value })

    } else if (type === 'mindful' && value != null) {
      await setHealthData(date, 'mindful', { minutes: value })
    }

    processed++
  }

  return new Response(JSON.stringify({ processed, skipped }), {
    headers: { 'content-type': 'application/json' },
  })
}
