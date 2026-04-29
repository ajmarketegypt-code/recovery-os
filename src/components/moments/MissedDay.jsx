import { motion } from 'framer-motion'

export default function MissedDay({ onContinue }) {
  return (
    <div className="fixed inset-0 bg-base flex flex-col items-center justify-center px-6 text-center z-50">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xs"
      >
        <div className="text-5xl mb-6">⏸</div>
        <h2 className="text-2xl font-bold text-textPrimary mb-3">Missed a day.</h2>
        <p className="text-textMuted text-sm mb-10 leading-relaxed">
          It happens. Today still counts. Pick up from here and keep the momentum going.
        </p>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onContinue}
          className="w-full bg-surface border border-border text-textPrimary font-semibold py-4 rounded-2xl"
        >
          I'm back
        </motion.button>
      </motion.div>
    </div>
  )
}
