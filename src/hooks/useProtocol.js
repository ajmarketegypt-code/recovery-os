import { useState, useEffect } from 'react'
import { getDayLog, setDayLog, getSettings } from '../data/storage.js'
import { fetchProtocol } from '../api/claude.js'
import { PROGRESSION_LADDERS } from '../data/phases.js'

export const useProtocol = (journey) => {
  const { today, phase, dayNumber } = journey
  const [protocol, setProtocol] = useState(() => getDayLog(today).protocol)
  const [loading, setLoading] = useState(!getDayLog(today).protocol)

  useEffect(() => {
    if (getDayLog(today).protocol) return

    const settings = getSettings()
    const dayOfWeek = new Date().getDay()
    const workoutDays3 = [1, 3, 5]
    const workoutDays4 = [1, 3, 5, 6]
    const isWorkoutDay = (phase.workoutsPerWeek >= 4 ? workoutDays4 : workoutDays3).includes(dayOfWeek)

    const availableExercises = Object.entries(PROGRESSION_LADDERS).flatMap(([, exercises]) =>
      exercises.filter(e => e.phase <= phase.number).map(e => e.name)
    )

    const recentDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (i + 1))
      return d.toISOString().split('T')[0]
    })

    fetchProtocol({
      phase: phase.number,
      dayNumber,
      bedTime: settings.bedTime,
      wakeTime: settings.wakeTime,
      isWorkoutDay,
      recentEnergy: recentDays.map(d => getDayLog(d).energy),
      recentSleepQuality: recentDays.map(d => getDayLog(d).sleepQuality),
      recentWorkouts: recentDays.map(d => getDayLog(d).workoutDone ? 'done' : 'skipped'),
      availableExercises,
    }).then(result => {
      setProtocol(result)
      setDayLog(today, { protocol: result })
      setLoading(false)
    })
  }, [today])

  return { protocol, loading }
}
