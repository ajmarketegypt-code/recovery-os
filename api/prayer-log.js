// Toggle a prayer's completion status for a given date.
// POST /api/prayer-log { prayer: 'Fajr'|'Dhuhr'|'Asr'|'Maghrib'|'Isha', date? }
// Idempotent toggle — calling twice un-marks it.
import { kv } from '@vercel/kv'
import { isoDate } from '../src/lib/kv.js'

export const config = { runtime: 'edge' }

const VALID = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })

  let body
  try { body = await req.json() } catch { return new Response('Bad JSON', { status: 400 }) }

  const { prayer, date = isoDate() } = body
  if (!VALID.includes(prayer)) {
    return new Response(JSON.stringify({ error: 'invalid_prayer', valid: VALID }),
      { status: 400, headers: { 'content-type': 'application/json' } })
  }

  const key = `health:${date}:prayers`
  const current = (await kv.get(key)) ?? []
  const next = current.includes(prayer)
    ? current.filter(p => p !== prayer)
    : [...current, prayer]

  await kv.set(key, next, { ex: 60 * 60 * 24 * 90 })

  return new Response(JSON.stringify({ ok: true, completed: next }),
    { headers: { 'content-type': 'application/json' } })
}
