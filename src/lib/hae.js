// Translates Health Auto Export's native REST payload into the metrics[] format
// expected by /api/health-ingest. HAE sends one big object with grouped time-series;
// we flatten it into per-day records keyed by metric type.
//
// HAE format (rough):
//   { data: { metrics: [{name:'heart_rate_variability', data:[{date,qty}]}, ...],
//             workouts: [{name,start,end,duration,activeEnergyBurned,...}] }}
//
// Our format:
//   { metrics: [{type, date, value?, data?}, ...], exportedAt }

export function isHAEFormat(body) {
  return Array.isArray(body?.data?.metrics) || Array.isArray(body?.data?.workouts)
}

// Best-effort field reader — HAE uses qty / Avg / value / amount across versions
const num = obj => {
  if (typeof obj === 'number') return obj
  if (!obj) return null
  return obj.qty ?? obj.Avg ?? obj.avg ?? obj.value ?? obj.amount ?? null
}

const dateOnly = iso => (iso || '').slice(0, 10)

// Average a list of point values for a date (for metrics like resp rate, spo2)
function avgPoints(points) {
  const vals = points.map(num).filter(v => v != null)
  if (!vals.length) return null
  return vals.reduce((a,b) => a+b, 0) / vals.length
}

export function translateHAE(body, { exerciseGoal = 30, standGoal = 12, moveGoal = 500 } = {}) {
  const exportedAt = body.exportedAt || body.data?.exportedAt || new Date().toISOString()
  const byDate = {}  // date -> per-metric scratch
  const ensure = date => (byDate[date] ||= { rings: {}, sleep: {}, recovery: {}, fitness: {} })

  for (const metric of body.data?.metrics ?? []) {
    const name = (metric.name || '').toLowerCase()
    const points = metric.data ?? []

    // ---- Recovery / stress ----
    if (name === 'heart_rate_variability' || name === 'heart_rate_variability_sdnn') {
      for (const p of points) { const v = num(p); if (v != null) ensure(dateOnly(p.date)).hrv = v }
    } else if (name === 'resting_heart_rate') {
      for (const p of points) { const v = num(p); if (v != null) ensure(dateOnly(p.date)).resting_hr = v }
    } else if (name === 'walking_heart_rate_average') {
      for (const p of points) { const v = num(p); if (v != null) ensure(dateOnly(p.date)).recovery.walking_hr = Math.round(v) }
    } else if (name === 'apple_sleeping_wrist_temperature' || name === 'wrist_temperature') {
      // HAE typically sends as deviation from baseline (°C)
      for (const p of points) { const v = num(p); if (v != null) ensure(dateOnly(p.date)).recovery.wrist_temp_delta = +v.toFixed(2) }

    // ---- Sleep enrichment ----
    } else if (name === 'sleep_analysis') {
      for (const p of points) {
        const slot = ensure(dateOnly(p.date)).sleep
        if (p.asleep != null) slot.asleep = (slot.asleep || 0) + p.asleep
        if (p.deep   != null) slot.deep   = (slot.deep   || 0) + p.deep
        if (p.rem    != null) slot.rem    = (slot.rem    || 0) + p.rem
        if (p.core   != null) slot.core   = (slot.core   || 0) + p.core
        if (p.inBed  != null) slot.inBed  = (slot.inBed  || 0) + p.inBed
      }
    } else if (name === 'respiratory_rate') {
      // Group points per date and average
      const byDay = {}
      for (const p of points) (byDay[dateOnly(p.date)] ||= []).push(p)
      for (const [d, pts] of Object.entries(byDay)) {
        const avg = avgPoints(pts)
        if (avg != null) ensure(d).sleep.respiratory_rate = +avg.toFixed(1)
      }
    } else if (name === 'oxygen_saturation' || name === 'blood_oxygen_saturation') {
      const byDay = {}
      for (const p of points) (byDay[dateOnly(p.date)] ||= []).push(p)
      for (const [d, pts] of Object.entries(byDay)) {
        const avg = avgPoints(pts)
        if (avg != null) ensure(d).sleep.spo2_avg = +avg.toFixed(1)
      }

    // ---- Fitness ----
    } else if (name === 'vo2_max' || name === 'v02_max') {
      // VO2 Max changes slowly — take the latest reading of the day
      for (const p of points) { const v = num(p); if (v != null) ensure(dateOnly(p.date)).fitness.vo2_max = +v.toFixed(1) }

    // ---- Activity rings ----
    } else if (name === 'apple_exercise_time') {
      for (const p of points) { const v = num(p); if (v != null) ensure(dateOnly(p.date)).rings.exercise_pct = Math.round((v / exerciseGoal) * 100) }
    } else if (name === 'apple_stand_hour' || name === 'apple_stand_time') {
      for (const p of points) { const v = num(p); if (v != null) ensure(dateOnly(p.date)).rings.stand_pct = Math.round((v / standGoal) * 100) }
    } else if (name === 'active_energy') {
      for (const p of points) { const v = num(p); if (v != null) ensure(dateOnly(p.date)).rings.move_pct = Math.round((v / moveGoal) * 100) }
    } else if (name === 'step_count') {
      for (const p of points) { const v = num(p); if (v != null) ensure(dateOnly(p.date)).rings.steps = Math.round(v) }

    // ---- Lifestyle (own pillars) ----
    } else if (name === 'time_in_daylight') {
      for (const p of points) { const v = num(p); if (v != null) ensure(dateOnly(p.date)).daylight_min = Math.round(v) }
    } else if (name === 'mindful_minutes' || name === 'mindful_session' || name === 'mindfulness') {
      // HAE may send total minutes or list of session durations — sum them
      const byDay = {}
      for (const p of points) (byDay[dateOnly(p.date)] ||= 0) + (num(p) || 0)
      for (const p of points) { const v = num(p); if (v != null) byDay[dateOnly(p.date)] = (byDay[dateOnly(p.date)] || 0) + v }
      for (const [d, total] of Object.entries(byDay)) ensure(d).mindful_min = Math.round(total)
    }
    // Unknown metrics ignored
  }

  // Flatten to our metrics[] array
  const metrics = []
  for (const [date, slot] of Object.entries(byDate)) {
    if (slot.hrv != null) metrics.push({ type: 'hrv', date, value: slot.hrv })
    if (slot.resting_hr != null) metrics.push({ type: 'resting_hr', date, value: slot.resting_hr })

    // Recovery extras (walking HR, wrist temp) attach to hrv record
    if (slot.recovery.walking_hr != null || slot.recovery.wrist_temp_delta != null) {
      metrics.push({ type: 'recovery_extra', date, data: slot.recovery })
    }

    // Sleep with optional enrichment
    const s = slot.sleep
    const total_hours = s.asleep ?? ((s.deep || 0) + (s.rem || 0) + (s.core || 0))
    if (total_hours > 0 || s.respiratory_rate != null || s.spo2_avg != null) {
      const data = {}
      if (total_hours > 0) {
        data.total_hours = +total_hours.toFixed(2)
        data.efficiency = s.inBed ? Math.round((total_hours / s.inBed) * 100) : null
        data.stages = {
          deep:  +(s.deep  || 0).toFixed(2),
          rem:   +(s.rem   || 0).toFixed(2),
          light: +(s.core  || 0).toFixed(2),
        }
      }
      if (s.respiratory_rate != null) data.respiratory_rate = s.respiratory_rate
      if (s.spo2_avg != null) data.spo2_avg = s.spo2_avg
      metrics.push({ type: 'sleep', date, data })
    }

    // Fitness extras (VO2 Max) attach to movement record (separate from rings)
    if (slot.fitness.vo2_max != null) {
      metrics.push({ type: 'fitness_extra', date, data: slot.fitness })
    }

    // Activity rings
    const r = slot.rings
    if (r.move_pct != null || r.exercise_pct != null || r.stand_pct != null || r.steps != null) {
      metrics.push({
        type: 'activity_rings', date,
        data: {
          move_pct: r.move_pct ?? 0,
          exercise_pct: r.exercise_pct ?? 0,
          stand_pct: r.stand_pct ?? 0,
          steps: r.steps ?? 0,
        },
      })
    }

    if (slot.daylight_min != null) metrics.push({ type: 'daylight', date, value: slot.daylight_min })
    if (slot.mindful_min != null) metrics.push({ type: 'mindful', date, value: slot.mindful_min })
  }

  // Workouts
  for (const w of body.data?.workouts ?? []) {
    const date = dateOnly(w.start || w.date)
    if (!date) continue
    metrics.push({
      type: 'workout', date,
      data: {
        type: w.name || 'Workout',
        duration_min: w.duration ? Math.round(w.duration / 60) : null,
        calories: num(w.activeEnergyBurned) ?? num(w.calories) ?? null,
      },
    })
  }

  return { metrics, exportedAt }
}
