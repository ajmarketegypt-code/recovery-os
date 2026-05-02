// Weekly aggregates + streaks for the Today screen.
// Cheap KV reads (last 90 days max), no AI calls. Hit on app foreground.
import { kv } from '@vercel/kv'
import { isoDate } from '../src/lib/kv.js'

export const config = { runtime: 'edge' }

const dateNDaysAgo = n => {
  const d = new Date(); d.setDate(d.getDate() - n)
  return isoDate(d)
}
const last7Days = () => Array.from({ length: 7 }, (_, i) => dateNDaysAgo(6 - i))
const last90Days = () => Array.from({ length: 90 }, (_, i) => dateNDaysAgo(89 - i))

// Count consecutive days (ending today, walking backwards) where predicate(record) is true
function countStreak(records, dates, predicate) {
  let streak = 0
  for (let i = records.length - 1; i >= 0; i--) {
    if (predicate(records[i])) streak++
    else break
  }
  return streak
}

export default async function handler() {
  const settings = (await kv.get('settings')) ?? {}
  const sleepTarget   = settings.sleep_target_hours ?? 8
  const workoutTarget = settings.workout_target ?? 4
  const hrvTarget     = settings.hrv_target_ms ?? 45
  const daylightTarget = settings.daylight_target_min ?? 30

  const week = last7Days()
  const month = last90Days()

  // Single mget per pillar — collapses ~156 sequential round-trips into 9.
  const weekKeys = (p) => week.map(d => `health:${d}:${p}`)
  const monthKeys = (p) => month.map(d => `health:${d}:${p}`)
  const [
    sleepWeek, strengthWeek, movementWeek, daylightWeek, hrvWeek,
    sleepMonth, strengthMonth, hrvMonth, weightMonth,
  ] = await Promise.all([
    kv.mget(...weekKeys('sleep')),
    kv.mget(...weekKeys('strength')),
    kv.mget(...weekKeys('movement')),
    kv.mget(...weekKeys('daylight')),
    kv.mget(...weekKeys('hrv')),
    kv.mget(...monthKeys('sleep')),
    kv.mget(...monthKeys('strength')),
    kv.mget(...monthKeys('hrv')),
    kv.mget(...monthKeys('weight')),
  ])

  // Weekly progress (X / target)
  const sleepHits = sleepWeek.filter(s => (s?.total_hours ?? 0) >= sleepTarget).length
  const workoutDays = strengthWeek.filter(s => (s?.workouts?.length ?? 0) > 0).length
  const moveRingHits = movementWeek.filter(m => (m?.move_pct ?? 0) >= 100).length
  const daylightHits = daylightWeek.filter(d => (d?.minutes ?? 0) >= daylightTarget).length

  // Averages
  const sleepValues = sleepWeek.map(s => s?.total_hours).filter(v => v != null)
  const sleepAvg = sleepValues.length ? +(sleepValues.reduce((a,b) => a+b, 0) / sleepValues.length).toFixed(1) : null

  const hrvValues = hrvWeek.map(h => h?.hrv_ms).filter(v => v != null)
  const hrvAvg = hrvValues.length ? +(hrvValues.reduce((a,b) => a+b, 0) / hrvValues.length).toFixed(1) : null

  // Streaks (90-day window)
  const sleepStreak = countStreak(sleepMonth, month, s => (s?.total_hours ?? 0) >= sleepTarget)
  const workoutStreakDays = countStreak(strengthMonth, month, s => (s?.workouts?.length ?? 0) > 0)
  const hrvStreak = countStreak(hrvMonth, month, h => (h?.hrv_ms ?? 0) >= hrvTarget)

  // Workout streak in WEEKS (consecutive ISO weeks where workout count >= target)
  let workoutWeekStreak = 0
  for (let w = 0; w < 12; w++) {
    const start = w * 7, end = start + 7
    const weekSlice = strengthMonth.slice(strengthMonth.length - end, strengthMonth.length - start)
    const count = weekSlice.filter(s => (s?.workouts?.length ?? 0) > 0).length
    if (count >= workoutTarget) workoutWeekStreak++
    else break
  }

  // Weight rolling averages + weekly delta (recomp signal)
  const weightSeries = weightMonth
    .map((w, i) => ({ date: month[i], kg: w?.kg }))
    .filter(p => p.kg != null)
  const last7 = weightSeries.slice(-7).map(p => p.kg)
  const prev7 = weightSeries.slice(-14, -7).map(p => p.kg)
  const avg = arr => arr.length ? +(arr.reduce((a,b) => a+b, 0) / arr.length).toFixed(1) : null
  const today_kg = weightSeries.length ? weightSeries[weightSeries.length - 1].kg : null
  const avg7 = avg(last7), avgPrev = avg(prev7)
  const week_delta_kg = (avg7 != null && avgPrev != null) ? +(avg7 - avgPrev).toFixed(2) : null

  // Recomp pace classification (user is on body recomposition: target stable bodyweight)
  let pace = null
  if (week_delta_kg != null) {
    const d = week_delta_kg
    if (Math.abs(d) <= 0.2) pace = { label: 'Recomp pace', tone: 'good',
      hint: 'Bodyweight stable — perfect for recomp if strength is climbing' }
    else if (d > 0.2 && d <= 0.5) pace = { label: 'Slight surplus', tone: 'warning',
      hint: 'Gaining a bit fast for recomp. Cut ~150 kcal/day.' }
    else if (d > 0.5) pace = { label: 'Bulk pace', tone: 'danger',
      hint: 'Adding weight too fast. Watch for fat gain.' }
    else if (d < -0.2 && d >= -0.5) pace = { label: 'Slow cut', tone: 'good',
      hint: 'Fine for fat loss while protecting muscle' }
    else pace = { label: 'Cutting fast', tone: 'danger',
      hint: 'Losing too quickly — you\'ll lose muscle. Eat more.' }
  }

  return new Response(JSON.stringify({
    targets: {
      sleep_hours: sleepTarget,
      hrv_ms: hrvTarget,
      daylight_min: daylightTarget,
      workouts_per_week: workoutTarget,
      protein_g: settings.protein_target_g ?? 140,
    },
    week: {
      sleep_hits: sleepHits, sleep_target_days: 7,
      workout_days: workoutDays, workout_target: workoutTarget,
      move_ring_hits: moveRingHits,
      daylight_hits: daylightHits,
      sleep_avg_hours: sleepAvg,
      hrv_avg_ms: hrvAvg,
    },
    streaks: {
      sleep_days: sleepStreak,
      workout_days: workoutStreakDays,
      workout_weeks: workoutWeekStreak,
      hrv_days: hrvStreak,
    },
    weight: {
      today_kg,
      avg7d: avg7,
      week_delta_kg,
      pace,
      series: weightSeries.slice(-30),  // for the mini-chart
    },
  }), { headers: { 'content-type': 'application/json' } })
}
