import { useState } from 'react'
import { motion } from 'framer-motion'
import { setSettings } from '../data/storage.js'

export default function SleepGoalStep({ onNext }) {
  const [bedTime, setBedTime] = useState('23:30')
  const [wakeTime, setWakeTime] = useState('07:00')

  const handleNext = () => {
    setSettings({ bedTime, wakeTime })
    onNext()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col min-h-screen bg-base px-6 pt-16"
    >
      <div className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">Step 1 of 3</div>
      <h2 className="text-2xl font-bold text-textPrimary mb-2">Set your sleep goal</h2>
      <p className="text-textMuted text-sm mb-10">We'll use these to build your daily protocol.</p>

      <label className="text-textMuted text-xs uppercase tracking-widest mb-2 block">Bed time target</label>
      <input
        type="time"
        value={bedTime}
        onChange={e => setBedTime(e.target.value)}
        className="bg-surface border border-border rounded-xl px-4 py-3 text-textPrimary text-lg mb-6 w-full"
      />

      <label className="text-textMuted text-xs uppercase tracking-widest mb-2 block">Wake time target</label>
      <input
        type="time"
        value={wakeTime}
        onChange={e => setWakeTime(e.target.value)}
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
