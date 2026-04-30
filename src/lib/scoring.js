// src/lib/scoring.js
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export const linearScale = (v, fromMin, fromMax) =>
  clamp(((v - fromMin) / (fromMax - fromMin)) * 100, 0, 100)

export function scoreSleep({ total_hours, efficiency, stages }) {
  const durationScore   = linearScale(total_hours, 4, 8)
  const efficiencyScore = linearScale(efficiency ?? 0, 60, 90)
  const deepPct = stages && total_hours > 0
    ? (stages.deep / total_hours) * 100
    : 0
  const deepScore = linearScale(deepPct, 5, 20)
  return Math.round(durationScore * 0.4 + efficiencyScore * 0.3 + deepScore * 0.3)
}

export function scoreMovement({ move_pct, exercise_pct, stand_pct }) {
  return Math.round(
    clamp(move_pct ?? 0, 0, 100) * 0.5 +
    clamp(exercise_pct ?? 0, 0, 100) * 0.3 +
    clamp(stand_pct ?? 0, 0, 100) * 0.2
  )
}

export function scoreStrength({ weekly_workouts, target }) {
  return Math.min(100, Math.round((weekly_workouts / target) * 100))
}

export function scoreEnergy({ sleep_score, hrv_score, movement_score }) {
  return Math.round(
    sleep_score * 0.35 + hrv_score * 0.35 + movement_score * 0.30
  )
}

export function scoreHRV(signal) {
  if (signal === 'green')  return 90
  if (signal === 'yellow') return 65
  if (signal === 'red')    return 30
  return 50
}
