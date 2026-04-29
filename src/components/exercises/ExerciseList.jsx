import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ExerciseDemo from './ExerciseDemo.jsx'

export default function ExerciseList({ exercises }) {
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="space-y-3">
      {exercises.map((ex, i) => {
        const isOpen = expanded === i

        return (
          <div key={i} className="bg-surface border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-4 py-4 text-left"
            >
              <div>
                <div className="text-textPrimary font-semibold text-sm">{ex.name}</div>
                <div className="text-textMuted text-xs mt-0.5">{ex.reps} · {ex.tempo}</div>
              </div>
              <div className={`text-[10px] uppercase tracking-widest border rounded-lg px-2 py-1 transition-colors flex-shrink-0 ml-3 ${
                isOpen ? 'border-primary text-primary' : 'border-border text-textMuted'
              }`}>
                {isOpen ? 'hide' : 'how to'}
              </div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4">
                    <ExerciseDemo name={ex.name} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
