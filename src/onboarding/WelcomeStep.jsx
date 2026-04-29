import { motion } from 'framer-motion'

export default function WelcomeStep({ onNext }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-screen bg-base px-6 text-center"
    >
      <div className="w-16 h-16 rounded-full bg-surface border-2 border-primary flex items-center justify-center mb-8"
           style={{ boxShadow: '0 0 32px rgba(16,185,129,0.3)' }}>
        <span className="text-2xl font-bold text-primary">R</span>
      </div>
      <div className="text-primary text-xs font-semibold tracking-widest uppercase mb-4">Recovery OS</div>
      <h1 className="text-3xl font-bold text-textPrimary mb-3">Your 60 days start now.</h1>
      <p className="text-textMuted text-sm mb-12 leading-relaxed max-w-xs">
        Minimum input. Real results. Sleep, strength, and energy rebuilt — one day at a time.
      </p>
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onNext}
        className="w-full max-w-xs bg-primary text-base font-semibold py-4 rounded-2xl"
      >
        Let's go
      </motion.button>
    </motion.div>
  )
}
