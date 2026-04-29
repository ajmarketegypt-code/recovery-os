import { useState } from 'react'
import { motion } from 'framer-motion'
import { getSettings, setSettings, getBaselines, setBaselines } from '../data/storage.js'

export default function Settings() {
  const [settings, updateSettings] = useState(getSettings)
  const [baselines, updateBaselines] = useState(getBaselines)
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSettings(settings)
    setBaselines(baselines)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const Field = ({ label, value, onChange, type = 'text' }) => (
    <div className="mb-5">
      <label className="text-textMuted text-xs uppercase tracking-widest mb-2 block">{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(type === 'number' ? parseInt(e.target.value) || 0 : e.target.value)}
        className="w-full bg-base border border-border rounded-xl px-4 py-3 text-textPrimary text-sm focus:border-primary outline-none transition-colors"
      />
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pt-safe pb-4">
      <h2 className="text-xl font-bold text-textPrimary mt-6 mb-6">Settings</h2>

      <div className="text-primary text-xs uppercase tracking-widest mb-4">Sleep Goals</div>
      <Field label="Bed time target" value={settings.bedTime} type="time"
        onChange={v => updateSettings(s => ({ ...s, bedTime: v }))} />
      <Field label="Wake time target" value={settings.wakeTime} type="time"
        onChange={v => updateSettings(s => ({ ...s, wakeTime: v }))} />
      <Field label="Daily reminder" value={settings.reminderTime} type="time"
        onChange={v => updateSettings(s => ({ ...s, reminderTime: v }))} />

      <div className="text-primary text-xs uppercase tracking-widest mb-4 mt-2">Day 1 Baselines</div>
      <Field label="Push-up max (reps)" value={baselines.pushUpMax} type="number"
        onChange={v => updateBaselines(b => ({ ...b, pushUpMax: v }))} />
      <Field label="Plank hold (seconds)" value={baselines.plankSec} type="number"
        onChange={v => updateBaselines(b => ({ ...b, plankSec: v }))} />
      <Field label="Treadmill starting point" value={baselines.treadmillNote}
        onChange={v => updateBaselines(b => ({ ...b, treadmillNote: v }))} />

      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={save}
        className={`w-full py-4 rounded-2xl font-semibold transition-colors ${
          saved ? 'bg-highlight text-base' : 'bg-primary text-base'
        }`}
      >
        {saved ? '✓ Saved' : 'Save'}
      </motion.button>
    </motion.div>
  )
}
