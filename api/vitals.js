// All-vitals view — one fetch returns every metric with target + 7-day trend.
// GET /api/vitals
import { kv } from '@vercel/kv'
import { isoDate } from '../src/lib/kv.js'

export const config = { runtime: 'edge' }

const dateNDaysAgo = n => {
  const d = new Date(); d.setDate(d.getDate() - n)
  return isoDate(d)
}

// Average a numeric path across an array of records, ignoring nulls
function avgPath(records, path) {
  const vals = records.map(r => path.split('.').reduce((o,k) => o?.[k], r)).filter(v => v != null && Number.isFinite(v))
  if (!vals.length) return null
  return vals.reduce((a,b) => a+b, 0) / vals.length
}

// Trend vs 7-day avg: 'up' if >5% above, 'down' if >5% below, 'flat' otherwise
function trend(current, avg) {
  if (current == null || avg == null || avg === 0) return null
  const pct = (current - avg) / Math.abs(avg)
  if (pct > 0.05) return 'up'
  if (pct < -0.05) return 'down'
  return 'flat'
}

const round1 = v => v == null ? null : Math.round(v * 10) / 10

export default async function handler() {
  const today = isoDate()
  const week = Array.from({ length: 7 }, (_, i) => dateNDaysAgo(6 - i))
  const settings = (await kv.get('settings')) ?? {}

  // Fetch today + last 7 days for each pillar in parallel
  const [
    todaySleep, todayHrv, todayMovement, todayDaylight, todayMindful,
    weekSleep, weekHrv, weekMovement, weekDaylight, weekMindful,
  ] = await Promise.all([
    kv.get(`health:${today}:sleep`),
    kv.get(`health:${today}:hrv`),
    kv.get(`health:${today}:movement`),
    kv.get(`health:${today}:daylight`),
    kv.get(`health:${today}:mindful`),
    Promise.all(week.map(d => kv.get(`health:${d}:sleep`))),
    Promise.all(week.map(d => kv.get(`health:${d}:hrv`))),
    Promise.all(week.map(d => kv.get(`health:${d}:movement`))),
    Promise.all(week.map(d => kv.get(`health:${d}:daylight`))),
    Promise.all(week.map(d => kv.get(`health:${d}:mindful`))),
  ])

  const sleepAvg = avgPath(weekSleep, 'total_hours')
  const hrvAvg   = avgPath(weekHrv, 'hrv_ms')
  const rhrAvg   = avgPath(weekHrv, 'resting_hr')
  const whrAvg   = avgPath(weekHrv, 'walking_hr')
  const vo2Avg   = avgPath(weekMovement, 'vo2_max')
  const wristAvg = avgPath(weekHrv, 'wrist_temp_delta')
  const respAvg  = avgPath(weekSleep, 'respiratory_rate')
  const spo2Avg  = avgPath(weekSleep, 'spo2_avg')
  const stepsAvg = avgPath(weekMovement, 'steps')
  const moveAvg  = avgPath(weekMovement, 'move_pct')
  const dayAvg   = avgPath(weekDaylight, 'minutes')
  const mindAvg  = avgPath(weekMindful, 'minutes')

  const metrics = [
    { id:'sleep_hours', emoji:'💤', label:'Sleep',
      value: round1(todaySleep?.total_hours), unit:'h',
      target: settings.sleep_target_hours ?? 8,
      week_avg: round1(sleepAvg),
      trend: trend(todaySleep?.total_hours, sleepAvg),
      goodWhen: 'high' },

    { id:'hrv', emoji:'❤️', label:'HRV',
      value: round1(todayHrv?.hrv_ms), unit:'ms',
      target: settings.hrv_target_ms ?? 45,
      week_avg: round1(hrvAvg),
      trend: trend(todayHrv?.hrv_ms, hrvAvg),
      goodWhen: 'high' },

    { id:'rhr', emoji:'💗', label:'Resting HR',
      value: round1(todayHrv?.resting_hr), unit:'bpm',
      target: 60,
      week_avg: round1(rhrAvg),
      trend: trend(todayHrv?.resting_hr, rhrAvg),
      goodWhen: 'low' },

    { id:'walking_hr', emoji:'🚶', label:'Walking HR',
      value: round1(todayHrv?.walking_hr), unit:'bpm',
      week_avg: round1(whrAvg),
      trend: trend(todayHrv?.walking_hr, whrAvg),
      goodWhen: 'low' },

    { id:'vo2_max', emoji:'🫁', label:'VO₂ Max',
      value: round1(todayMovement?.vo2_max), unit:'',
      week_avg: round1(vo2Avg),
      trend: trend(todayMovement?.vo2_max, vo2Avg),
      goodWhen: 'high' },

    { id:'wrist_temp', emoji:'🌡️', label:'Wrist temp',
      value: todayHrv?.wrist_temp_delta != null
        ? (todayHrv.wrist_temp_delta > 0 ? '+' : '') + round1(todayHrv.wrist_temp_delta)
        : null,
      unit:'°C',
      week_avg: round1(wristAvg),
      trend: null,
      goodWhen: 'neutral' },

    { id:'resp_rate', emoji:'💨', label:'Resp rate',
      value: round1(todaySleep?.respiratory_rate), unit:'br/min',
      week_avg: round1(respAvg),
      trend: trend(todaySleep?.respiratory_rate, respAvg),
      goodWhen: 'neutral' },

    { id:'spo2', emoji:'🩸', label:'Blood O₂',
      value: round1(todaySleep?.spo2_avg), unit:'%',
      target: 95,
      week_avg: round1(spo2Avg),
      trend: trend(todaySleep?.spo2_avg, spo2Avg),
      goodWhen: 'high' },

    { id:'steps', emoji:'👣', label:'Steps',
      value: todayMovement?.steps,
      target: 10000,
      week_avg: stepsAvg ? Math.round(stepsAvg) : null,
      trend: trend(todayMovement?.steps, stepsAvg),
      goodWhen: 'high' },

    { id:'move_pct', emoji:'🔥', label:'Move ring',
      value: todayMovement?.move_pct, unit:'%',
      target: 100,
      week_avg: moveAvg ? Math.round(moveAvg) : null,
      trend: trend(todayMovement?.move_pct, moveAvg),
      goodWhen: 'high' },

    { id:'daylight', emoji:'☀️', label:'Daylight',
      value: todayDaylight?.minutes, unit:'min',
      target: settings.daylight_target_min ?? 30,
      week_avg: dayAvg ? Math.round(dayAvg) : null,
      trend: trend(todayDaylight?.minutes, dayAvg),
      goodWhen: 'high' },

    { id:'mindful', emoji:'🧘', label:'Mindful',
      value: todayMindful?.minutes ?? 0, unit:'min',
      week_avg: mindAvg != null ? Math.round(mindAvg) : 0,
      trend: trend(todayMindful?.minutes, mindAvg),
      goodWhen: 'high' },
  ]

  return new Response(JSON.stringify({ date: today, metrics }), {
    headers: { 'content-type': 'application/json' },
  })
}
