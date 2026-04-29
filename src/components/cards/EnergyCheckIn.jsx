import { motion } from 'framer-motion'

export default function EnergyCheckIn({ value, onChange }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 mb-4">
      <div className="text-textMuted text-[11px] font-semibold tracking-widest uppercase mb-3">Morning Check-In</div>
      <p className="text-textPrimary text-sm mb-4">How's your energy today?</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(n => (
          <motion.button
            key={n}
            onClick={() => onChange(n)}
            whileTap={{ scale: 0.88 }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-colors ${
              value === n
                ? 'bg-primary border-primary text-base'
                : 'bg-base border-border text-textMuted'
            }`}
          >
            {n}
          </motion.button>
        ))}
      </div>
    </div>
  )
}
