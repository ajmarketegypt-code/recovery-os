import { useState } from 'react'
import { motion } from 'framer-motion'
import { useProtocol } from '../hooks/useProtocol.js'
import ExerciseList from '../components/exercises/ExerciseList.jsx'
import { getDayLog, setDayLog } from '../data/storage.js'

export default function Workout({ journey }) {
  const { protocol, loading } = useProtocol(journey)
  const { today } = journey
  const [done, setDone] = useState(() => getDayLog(today).workoutDone)
  const [effort, setEffort] = useState(() => getDayLog(today).effortRating)

  const markDone = (effortVal) => {
    setDone(true)
    setEffort(effortVal)
    setDayLog(today, { workoutDone: true, effortRating: effortVal })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-textMuted text-sm">Loading workout…</div>
      </div>
    )
  }

  if (!protocol?.workout) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="text-5xl mb-4">🚶</div>
        <h2 className="text-xl font-bold text-textPrimary mb-2">Rest Day</h2>
        <p className="text-textMuted text-sm leading-relaxed">
          Zone-2 treadmill walk — 20–30 min, conversational pace. Recovery is the work.
        </p>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pt-safe pb-4">
      <h2 className="text-xl font-bold text-textPrimary mt-6 mb-1">{protocol.workout.name}</h2>
      <div className="text-textMuted text-sm mb-6">{protocol.workout.duration_min} min · tap any exercise for cues</div>

      <ExerciseList exercises={protocol.workout.exercises} />

      <div className="mt-6">
        {!done ? (
          <>
            <p className="text-textMuted text-sm text-center mb-3">How hard did you push?</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <motion.button
                  key={n}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => markDone(n)}
                  className="flex-1 py-4 rounded-xl bg-surface border border-border text-textMuted font-bold hover:border-primary transition-colors"
                >
                  {n}
                </motion.button>
              ))}
            </div>
          </>
        ) : (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-surface border border-primary rounded-2xl p-5 text-center"
            style={{ boxShadow: '0 0 24px rgba(16,185,129,0.15)' }}
          >
            <div className="text-3xl mb-2">✓</div>
            <div className="text-textPrimary font-bold mb-1">Workout logged</div>
            <div className="text-textMuted text-sm">Effort: {effort}/5</div>
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
