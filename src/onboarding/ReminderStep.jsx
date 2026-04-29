import { useState } from 'react'
import { motion } from 'framer-motion'
import { setSettings } from '../data/storage.js'

export default function ReminderStep({ onFinish }) {
  const [reminderTime, setReminderTime] = useState('08:00')

  const handleFinish = async () => {
    setSettings({ reminderTime })
    if ('Notification' in window) {
      await Notification.requestPermission()
    }
    onFinish()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex flex-col min-h-screen bg-base px-6 pt-16"
    >
      <div className="text-primary text-xs font-semibold tracking-widest uppercase mb-2">Step 3 of 3</div>
      <h2 className="text-2xl font-bold text-textPrimary mb-2">Set your reminder</h2>
      <p className="text-textMuted text-sm mb-10 leading-relaxed">
        We'll remind you to do your morning check-in. As a backup, open the iOS Clock app and set a daily reminder for the same time.
      </p>

      <label className="text-textMuted text-xs uppercase tracking-widest mb-2 block">Daily reminder time</label>
      <input
        type="time"
        value={reminderTime}
        onChange={e => setReminderTime(e.target.value)}
        className="bg-surface border border-border rounded-xl px-4 py-3 text-textPrimary text-lg mb-10 w-full"
      />

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={handleFinish}
        className="w-full bg-primary text-base font-semibold py-4 rounded-2xl"
      >
        Start my 60 days
      </motion.button>
    </motion.div>
  )
}
