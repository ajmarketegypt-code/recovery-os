import { motion } from 'framer-motion'

export default function PhaseUnlock({ phase, onContinue }) {
  return (
    <div className="fixed inset-0 bg-base flex flex-col items-center justify-center px-6 text-center z-50">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="w-32 h-32 rounded-full border-4 border-primary flex items-center justify-center mb-8"
        style={{ boxShadow: '0 0 60px rgba(16,185,129,0.4)' }}
      >
        <span className="text-5xl font-bold text-primary">{phase.number}</span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="w-full max-w-xs"
      >
        <div className="text-primary text-xs uppercase tracking-widest mb-2">Phase {phase.number} Unlocked</div>
        <h2 className="text-3xl font-bold text-textPrimary mb-3">{phase.name}</h2>
        <p className="text-textMuted text-sm mb-10">{phase.description}</p>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onContinue}
          className="w-full bg-primary text-base font-semibold py-4 rounded-2xl"
        >
          Let's go
        </motion.button>
      </motion.div>
    </div>
  )
}
