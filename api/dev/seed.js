// Seed 30 days of plausible demo data so the app shows real-looking content.
// POST /api/dev/seed
import { setHealthData, setHRVBaseline, isoDate } from '../../src/lib/kv.js'
import { scoreSleep, scoreMovement, scoreStrength } from '../../src/lib/scoring.js'

export const config = { runtime: 'edge' }

const rand    = (min, max) => Math.random() * (max - min) + min
const randInt = (min, max) => Math.floor(rand(min, max + 1))
const pick    = arr => arr[Math.floor(Math.random() * arr.length)]

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })

  const days = 30
  const today = new Date()
  const writes = []
  const samples = []

  // Plan workouts: 3-4 per week, scattered
  const workoutDays = new Set()
  for (let week = 0; week < 5; week++) {
    const offsets = new Set()
    const target = randInt(3, 4)
    while (offsets.size < target) offsets.add(randInt(0, 6))
    offsets.forEach(o => workoutDays.add(week * 7 + o))
  }
  // Pre-count workouts per ISO week for proper weekly_count
  const weekCounts = {}
  for (const i of workoutDays) {
    const w = Math.floor(i / 7)
    weekCounts[w] = (weekCounts[w] || 0) + 1
  }

  for (let i = 0; i < days; i++) {
    const d = new Date(today); d.setDate(d.getDate() - (days - 1 - i))
    const date = isoDate(d)
    const dayIdx = days - 1 - i  // 0 = today, 29 = oldest

    // Sleep + enrichment (resp rate, SpO2)
    const total_hours = +rand(6.0, 8.4).toFixed(1)
    const efficiency = randInt(78, 95)
    const deep  = +(total_hours * rand(0.10, 0.18)).toFixed(2)
    const rem   = +(total_hours * rand(0.18, 0.25)).toFixed(2)
    const light = +(total_hours - deep - rem).toFixed(2)
    const stages = { deep, rem, light }
    const sleep = {
      total_hours, efficiency, stages, source: 'demo',
      respiratory_rate: +rand(13, 17).toFixed(1),
      spo2_avg: +rand(95.5, 98.5).toFixed(1),
    }
    sleep.score = scoreSleep(sleep)
    writes.push(setHealthData(date, 'sleep', sleep))

    // HRV + recovery extras (walking HR, wrist temp delta)
    const hrv_ms = randInt(38, 58)
    const resting_hr = randInt(52, 64)
    samples.push({ date, value: hrv_ms })
    writes.push(setHealthData(date, 'hrv', {
      hrv_ms, resting_hr, source: 'demo',
      walking_hr: randInt(85, 110),
      wrist_temp_delta: +rand(-0.4, 0.4).toFixed(2),
    }))

    // Movement + fitness (VO2 Max — changes slowly, ~constant per user)
    const move_pct = randInt(70, 110)
    const exercise_pct = randInt(80, 130)
    const stand_pct = randInt(85, 105)
    writes.push(setHealthData(date, 'movement', {
      move_pct, exercise_pct, stand_pct,
      steps: randInt(7000, 13000),
      vo2_max: +rand(42, 48).toFixed(1),
      score: scoreMovement({ move_pct, exercise_pct, stand_pct }),
    }))

    // Daylight + mindful (own pillars)
    writes.push(setHealthData(date, 'daylight', { minutes: randInt(20, 180) }))
    if (Math.random() > 0.5) {
      writes.push(setHealthData(date, 'mindful', { minutes: randInt(5, 25) }))
    }

    // Strength (only on workout days)
    const reverseIdx = days - 1 - i  // older = higher
    const weekIdx = Math.floor(reverseIdx / 7)
    if (workoutDays.has(reverseIdx)) {
      const weeklyCount = weekCounts[weekIdx] || 0
      writes.push(setHealthData(date, 'strength', {
        workouts: [{
          type: pick(['Strength','Cardio','HIIT','Yoga','Push','Pull','Legs']),
          duration_min: randInt(35, 75),
          calories: randInt(280, 580),
        }],
        weekly_count: weeklyCount,
        score: scoreStrength({ weekly_workouts: weeklyCount, target: 4 }),
      }))
    }

    // Nutrition (most days, not all)
    if (Math.random() > 0.25) {
      const meals = []
      const mealCount = randInt(2, 4)
      for (let m = 0; m < mealCount; m++) {
        meals.push({
          id: `m_${date}_${m}`,
          comment: pick(['Eggs and toast','Chicken salad','Pasta bowl','Salmon and rice','Smoothie','Steak','Greek yogurt','Burrito']),
          macros: {
            calories: randInt(350, 750),
            protein_g: randInt(20, 45),
            carbs_g: randInt(30, 80),
            fat_g: randInt(8, 25),
          },
          quality_score: randInt(6, 9),
        })
      }
      const totals = meals.reduce((acc, m) => ({
        calories: acc.calories + m.macros.calories,
        protein_g: acc.protein_g + m.macros.protein_g,
        carbs_g: acc.carbs_g + m.macros.carbs_g,
        fat_g: acc.fat_g + m.macros.fat_g,
      }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 })
      writes.push(setHealthData(date, 'nutrition', { meals, totals }))
    }

    // Subjective + weight occasionally
    if (Math.random() > 0.5) {
      writes.push(setHealthData(date, 'subjective', {
        mood: randInt(2, 4), felt_energy: randInt(2, 5),
      }))
    }
    if (Math.random() > 0.6) {
      writes.push(setHealthData(date, 'weight', { kg: +rand(72, 76).toFixed(1) }))
    }
  }

  // HRV baseline = last 14 days
  const recent = samples.slice(-14)
  const mean = recent.reduce((a, s) => a + s.value, 0) / recent.length
  writes.push(setHRVBaseline({ samples: recent, mean: +mean.toFixed(1), n: recent.length }))

  await Promise.all(writes)
  return new Response(JSON.stringify({ ok: true, days, message: `Seeded ${days} days of demo data` }),
    { headers: { 'content-type': 'application/json' } })
}
