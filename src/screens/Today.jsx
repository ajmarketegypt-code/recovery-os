import { useState } from 'react'
import { motion } from 'framer-motion'
import { useProtocol } from '../hooks/useProtocol.js'
import SleepCard from '../components/cards/SleepCard.jsx'
import AnchorCard from '../components/cards/AnchorCard.jsx'
import { getDayLog, setDayLog } from '../data/storage.js'

export default function Today({ journey, onTabSelect }) {
  const { protocol, loading } = useProtocol(journey)
  const { today } = journey
  const [anchorDone, setAnchorDone] = useState(() => getDayLog(today).anchorDone)

  const toggleAnchor = () => {
    const next = !anchorDone
    setAnchorDone(next)
    setDayLog(today, { anchorDone: next })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-textMuted text-sm"
        >
          Building your protocol…
        </motion.div>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pt-safe pb-4">
      <h2 className="text-xl font-bold text-textPrimary mt-6 mb-1">Today's Protocol</h2>
      <p className="text-textMuted text-sm mb-6 leading-relaxed">{protocol.ai_note}</p>

      <SleepCard protocol={protocol} />
      <AnchorCard anchor={protocol.anchor} today={today} done={anchorDone} onToggle={toggleAnchor} />

      {protocol.workout && (
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => onTabSelect?.('workout')}
          className="bg-surface border border-border rounded-2xl p-4 cursor-pointer"
        >
          <div className="text-textMuted text-[11px] font-semibold tracking-widest uppercase mb-2">Today's Workout</div>
          <div className="text-textPrimary font-bold mb-1">{protocol.workout.name}</div>
          <div className="text-textMuted text-xs">{protocol.workout.duration_min} min · {protocol.workout.exercises.length} exercises → tap to start</div>
        </motion.div>
      )}

      {!protocol.workout && (
        <div className="bg-surface border border-border rounded-2xl p-4">
          <div className="text-textMuted text-[11px] font-semibold tracking-widest uppercase mb-2">Rest Day</div>
          <div className="text-textPrimary text-sm">Zone-2 treadmill walk — 20–30 min, conversational pace.</div>
        </div>
      )}
    </motion.div>
  )
}
