import { getCallLog, incrementCallLog } from '../data/storage.js'

const DAILY_CALL_LIMIT = 25

export const validateProtocol = (data) => {
  if (!data || typeof data !== 'object') return false
  if (!data.sleep_target || !data.wake_target) return false
  if (typeof data.anchor !== 'string') return false
  if (typeof data.ai_note !== 'string') return false
  if (data.medical_flag === true) return false
  if (data.workout !== null && data.workout !== undefined) {
    if (!data.workout.name || !Array.isArray(data.workout.exercises)) return false
  }
  return true
}

export const buildFallbackProtocol = ({ phase, isWorkoutDay, bedTime, wakeTime }) => {
  const workouts = {
    1: {
      name: 'Phase 1 Foundation', duration_min: 15,
      exercises: [
        { name: 'Glute Bridge', reps: '12', tempo: '3-1-3', cue: 'Drive hips to ceiling, squeeze at top' },
        { name: 'Push-up', reps: '8', tempo: '3-1-3', cue: 'Elbows at 45°, slow the descent' },
        { name: 'Dead Bug', reps: '8 each side', tempo: 'slow', cue: 'Lower back pressed flat' },
        { name: 'Bodyweight Squat', reps: '12', tempo: '3-1-3', cue: 'Chest up, knees track toes' },
      ],
    },
    2: {
      name: 'Phase 2 Build', duration_min: 25,
      exercises: [
        { name: 'Bulgarian Split Squat', reps: '8 each', tempo: '3-1-3', cue: 'Drive through front heel' },
        { name: 'Diamond Push-up', reps: '8', tempo: '3-1-3', cue: 'Elbows track back' },
        { name: 'Inverted Row', reps: '10', tempo: '2-1-2', cue: 'Pull shoulder blades together' },
        { name: 'Hollow Body Hold', reps: '30 sec', tempo: 'hold', cue: 'Lower back on floor' },
      ],
    },
    3: {
      name: 'Phase 3 Groove', duration_min: 30,
      exercises: [
        { name: 'Pistol Squat', reps: '5 each', tempo: '3-1-3', cue: 'Arms forward, sit deep' },
        { name: 'Archer Push-up', reps: '6 each', tempo: '3-1-3', cue: 'Load one arm, hips square' },
        { name: 'Inverted Row', reps: 'max', tempo: 'controlled', cue: 'Every rep counts' },
        { name: 'L-Sit', reps: '3x10 sec', tempo: 'hold', cue: 'Depress shoulders fully' },
      ],
    },
  }

  return {
    sleep_target: bedTime,
    wake_target: wakeTime,
    workout: isWorkoutDay ? (workouts[phase] ?? workouts[1]) : null,
    anchor: 'No caffeine after 2pm',
    ai_note: 'Consistency beats intensity. Show up today.',
    medical_flag: false,
  }
}

export const fetchProtocol = async (context) => {
  const today = new Date().toISOString().split('T')[0]

  if (getCallLog(today) >= DAILY_CALL_LIMIT) {
    return buildFallbackProtocol(context)
  }

  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
    })

    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const text = await res.text()
    const data = JSON.parse(text)

    if (!validateProtocol(data)) throw new Error('Invalid protocol schema')

    incrementCallLog(today)
    return data
  } catch {
    return buildFallbackProtocol(context)
  }
}
