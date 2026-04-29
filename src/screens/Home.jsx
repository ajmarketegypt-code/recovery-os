import { useState } from 'react'
import { motion } from 'framer-motion'
import EnergyCheckIn from '../components/cards/EnergyCheckIn.jsx'
import { getDayLog, setDayLog } from '../data/storage.js'

export default function Home({ journey }) {
  const { dayNumber, phase, streak, today } = journey
  const [energy, setEnergy] = useState(() => getDayLog(today).energy)

  const handleEnergySelect = (val) => {
    setEnergy(val)
    setDayLog(today, { energy: val })
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-5 pt-safe pb-4"
    >
      <div className="text-primary text-[11px] font-semibold tracking-widest uppercase mt-6 mb-1">
        Phase {phase.number} · {phase.name.toUpperCase()}
      </div>
      <h1 className="text-[26px] font-bold text-textPrimary mb-1">{greeting}, Ahmed</h1>
      <div className="text-textMuted text-sm mb-6">🔥 {streak}-day streak</div>

      <EnergyCheckIn value={energy} onChange={handleEnergySelect} />

      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex justify-between mb-2">
          <span className="text-textMuted text-[10px] uppercase tracking-widest">60-Day Journey</span>
          <span className="text-primary text-[10px] font-semibold">{Math.round((dayNumber / 60) * 100)}%</span>
        </div>
        <div className="bg-base rounded-full h-1 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(dayNumber / 60) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-primary to-highlight rounded-full"
          />
        </div>
        <div className="text-textMuted text-[10px] mt-2">Day {dayNumber} of 60</div>
      </div>
    </motion.div>
  )
}
