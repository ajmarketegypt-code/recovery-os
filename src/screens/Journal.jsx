import { useState } from 'react'
import { motion } from 'framer-motion'
import { getDayLog, setDayLog } from '../data/storage.js'

const QUALITY_LABELS = {
  1: "Rough night. Claude will adjust tomorrow's prescription.",
  2: "Getting there. Keep the sleep anchor going.",
  3: "Decent. Building the habit pays off.",
  4: "Strong recovery. Momentum is building.",
  5: "Excellent. This is what the protocol is designed for.",
}

export default function Journal({ journey }) {
  const { today } = journey
  const [quality, setQuality] = useState(() => getDayLog(today).sleepQuality)

  const selectQuality = (val) => {
    setQuality(val)
    setDayLog(today, { sleepQuality: val })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pt-safe pb-4">
      <h2 className="text-xl font-bold text-textPrimary mt-6 mb-2">Sleep Journal</h2>
      <p className="text-textMuted text-sm mb-8">How did you sleep last night?</p>

      <div className="text-textMuted text-xs uppercase tracking-widest mb-3">Sleep quality</div>
      <div className="flex gap-2 mb-8">
        {[1, 2, 3, 4, 5].map(n => (
          <motion.button
            key={n}
            whileTap={{ scale: 0.88 }}
            onClick={() => selectQuality(n)}
            className={`flex-1 py-4 rounded-xl font-bold border transition-colors ${
              quality === n ? 'bg-primary border-primary text-base' : 'bg-surface border-border text-textMuted'
            }`}
          >
            {n}
          </motion.button>
        ))}
      </div>

      {quality && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface border border-border rounded-2xl p-4 text-center"
        >
          <div className="text-textMuted text-sm leading-relaxed">{QUALITY_LABELS[quality]}</div>
        </motion.div>
      )}
    </motion.div>
  )
}
