import { motion } from 'framer-motion'
import { setDayLog } from '../../data/storage.js'

export default function AnchorCard({ anchor, today, done, onToggle }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
      <div className="text-textMuted text-[11px] font-semibold tracking-widest uppercase mb-3">Today's Anchor</div>
      <p className="text-textPrimary text-sm mb-4">{anchor}</p>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onToggle}
        className={`w-full py-3 rounded-xl text-sm font-semibold border transition-colors ${
          done ? 'bg-primary border-primary text-base' : 'bg-base border-border text-textMuted'
        }`}
      >
        {done ? '✓ Done' : 'Mark done'}
      </motion.button>
    </div>
  )
}
