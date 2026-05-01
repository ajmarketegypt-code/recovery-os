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

// Best-effort field reader (HAE has used both `qty` and `Avg`/`Max`/`Min` over versions)
const num = obj => {
  if (typeof obj === 'number') return obj
  if (!obj) return null
  return obj.qty ?? obj.Avg ?? obj.value ?? obj.amount ?? null
}

const dateOnly = iso => (iso || '').slice(0, 10)

export function translateHAE(body, { exerciseGoal = 30, standGoal = 12, moveGoal = 500 } = {}) {
  const exportedAt = body.exportedAt || body.data?.exportedAt || new Date().toISOString()
  const byDate = {}  // date -> per-metric scratch
  const ensure = date => (byDate[date] ||= { rings: {}, sleep: {} })

  for (const metric of body.data?.metrics ?? []) {
    const name = (metric.name || '').toLowerCase()
    const points = metric.data ?? []

    if (name === 'heart_rate_variability' || name === 'heart_rate_variability_sdnn') {
      for (const p of points) {
        const v = num(p); if (v == null) continue
        const slot = ensure(dateOnly(p.date))
        // Take the latest reading of the day
        slot.hrv = v
      }
    } else if (name === 'resting_heart_rate') {
      for (const p of points) {
        const v = num(p); if (v == null) continue
        ensure(dateOnly(p.date)).resting_hr = v
      }
    } else if (name === 'sleep_analysis') {
      for (const p of points) {
        const slot = ensure(dateOnly(p.date)).sleep
        // HAE keys (varies): asleep, deep, rem, core, awake, inBed
        if (p.asleep != null) slot.asleep = (slot.asleep || 0) + p.asleep
        if (p.deep   != null) slot.deep   = (slot.deep   || 0) + p.deep
        if (p.rem    != null) slot.rem    = (slot.rem    || 0) + p.rem
        if (p.core   != null) slot.core   = (slot.core   || 0) + p.core
        if (p.inBed  != null) slot.inBed  = (slot.inBed  || 0) + p.inBed
      }
    } else if (name === 'apple_exercise_time') {
      for (const p of points) {
        const v = num(p); if (v == null) continue
        ensure(dateOnly(p.date)).rings.exercise_pct = Math.round((v / exerciseGoal) * 100)
      }
    } else if (name === 'apple_stand_hour' || name === 'apple_stand_time') {
      for (const p of points) {
        const v = num(p); if (v == null) continue
        ensure(dateOnly(p.date)).rings.stand_pct = Math.round((v / standGoal) * 100)
      }
    } else if (name === 'active_energy') {
      for (const p of points) {
        const v = num(p); if (v == null) continue
        ensure(dateOnly(p.date)).rings.move_pct = Math.round((v / moveGoal) * 100)
      }
    } else if (name === 'step_count') {
      for (const p of points) {
        const v = num(p); if (v == null) continue
        ensure(dateOnly(p.date)).rings.steps = Math.round(v)
      }
    }
    // Ignore everything else (HAE sends a lot of metrics we don't use yet)
  }

  // Flatten into our metrics[] array
  const metrics = []
  for (const [date, slot] of Object.entries(byDate)) {
    if (slot.hrv != null) metrics.push({ type: 'hrv', date, value: slot.hrv })
    if (slot.resting_hr != null) metrics.push({ type: 'resting_hr', date, value: slot.resting_hr })

    const s = slot.sleep
    const total_hours = s.asleep ?? ((s.deep || 0) + (s.rem || 0) + (s.core || 0))
    if (total_hours > 0) {
      metrics.push({
        type: 'sleep', date,
        data: {
          total_hours: +total_hours.toFixed(2),
          efficiency: s.inBed ? Math.round((total_hours / s.inBed) * 100) : null,
          stages: {
            deep:  +(s.deep  || 0).toFixed(2),
            rem:   +(s.rem   || 0).toFixed(2),
            light: +(s.core  || 0).toFixed(2),
          },
        },
      })
    }

    const r = slot.rings
    if (r.move_pct != null || r.exercise_pct != null || r.stand_pct != null) {
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
