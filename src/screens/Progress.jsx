import { motion } from 'framer-motion'
import { getDayLog, getBaselines } from '../data/storage.js'

export default function Progress({ journey, onTabSelect }) {
  const { dayNumber, streak, today } = journey
  const baselines = getBaselines()

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const iso = d.toISOString().split('T')[0]
    const log = getDayLog(iso)
    return { iso, done: log.workoutDone, effort: log.effortRating }
  })

  const avgEffort = (() => {
    const rated = last7.filter(d => d.effort)
    if (!rated.length) return null
    return (rated.reduce((s, d) => s + d.effort, 0) / rated.length).toFixed(1)
  })()

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pt-safe pb-4">
      <h2 className="text-xl font-bold text-textPrimary mt-6 mb-6">Progress</h2>

      <div className="flex gap-3 mb-6">
        {[
          { value: streak, label: 'Day Streak' },
          { value: avgEffort ?? '—', label: 'Avg Effort' },
          { value: dayNumber, label: 'Day' },
        ].map(({ value, label }) => (
          <div key={label} className="flex-1 bg-surface border border-border rounded-2xl p-4 text-center">
            <div className="text-3xl font-bold text-primary">{value}</div>
            <div className="text-textMuted text-[10px] uppercase tracking-widest mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-2xl p-4 mb-6">
        <div className="text-textMuted text-[11px] uppercase tracking-widest mb-3">Last 7 Days</div>
        <div className="flex gap-2 justify-between">
          {last7.map(({ iso, done }) => (
            <div key={iso} className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-lg transition-colors ${done ? 'bg-primary' : 'bg-base border border-border'}`} />
              <span className="text-textMuted text-[9px]">
                {new Date(iso + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' }).charAt(0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {(baselines.pushUpMax || baselines.plankSec) && (
        <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
          <div className="text-textMuted text-[11px] uppercase tracking-widest mb-3">Day 1 Baselines</div>
          <div className="space-y-2">
            {baselines.pushUpMax > 0 && (
              <div className="flex justify-between">
                <span className="text-textMuted text-sm">Push-up max</span>
                <span className="text-textPrimary font-semibold">{baselines.pushUpMax} reps</span>
              </div>
            )}
            {baselines.plankSec > 0 && (
              <div className="flex justify-between">
                <span className="text-textMuted text-sm">Plank hold</span>
                <span className="text-textPrimary font-semibold">{baselines.plankSec}s</span>
              </div>
            )}
            {baselines.treadmillNote && (
              <div className="flex justify-between">
                <span className="text-textMuted text-sm">Treadmill</span>
                <span className="text-textPrimary font-semibold text-xs">{baselines.treadmillNote}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => onTabSelect?.('journal')}
        className="w-full py-3 rounded-xl border border-border text-textMuted text-sm"
      >
        Sleep Journal →
      </button>
    </motion.div>
  )
}
