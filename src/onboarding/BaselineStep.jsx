import { useState } from 'react'
import { motion } from 'framer-motion'
import { setBaselines } from '../data/storage.js'

export default function BaselineStep({ onNext }) {
  const [pushUpMax, setPushUpMax] = useState('')
  const [plankSec, setPlankSec] = useState('')
  const [treadmillNote, setTreadmillNote] = useState('')

  const handleNext = () => {
    setBaselines({
      pushUpMax: parseInt(pushUpMax) || 0,
      plankSec: parseInt(plankSec) || 0,
      treadmillNote: treadmillNote || '0% grade, slow walk',
    })
    onNext()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col min-h-screen bg-base px-6 pt-16"
    >
      <div className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">Step 2 of 3</div>
      <h2 className="text-2xl font-bold text-textPrimary mb-2">Log your baselines</h2>
      <p className="text-textMuted text-sm mb-10">Day 60 will compare against these. Be honest — no judgement.</p>

      <label className="text-textMuted text-xs uppercase tracking-widest mb-2 block">Max push-ups (consecutive)</label>
      <input
        type="number"
        placeholder="e.g. 8"
        value={pushUpMax}
        onChange={e => setPushUpMax(e.target.value)}
        className="bg-surface border border-border rounded-xl px-4 py-3 text-textPrimary text-lg mb-6 w-full"
      />

      <label className="text-textMuted text-xs uppercase tracking-widest mb-2 block">Plank hold (seconds)</label>
      <input
        type="number"
        placeholder="e.g. 30"
        value={plankSec}
        onChange={e => setPlankSec(e.target.value)}
        className="bg-surface border border-border rounded-xl px-4 py-3 text-textPrimary text-lg mb-6 w-full"
      />

      <label className="text-textMuted text-xs uppercase tracking-widest mb-2 block">Treadmill starting point</label>
      <input
        type="text"
        placeholder="e.g. 0% grade, 4 km/h"
        value={treadmillNote}
        onChange={e => setTreadmillNote(e.target.value)}
        className="bg-surface border border-border rounded-xl px-4 py-3 text-textPrimary text-lg mb-10 w-full"
      />

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={handleNext}
        className="w-full bg-primary text-base font-semibold py-4 rounded-2xl"
      >
        Next
      </motion.button>
    </motion.div>
  )
}
