import { motion } from 'framer-motion'
import { getBaselines } from '../../data/storage.js'

const Particle = ({ x, color, delay }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-sm pointer-events-none"
    style={{ left: `${x}%`, top: '-8px', backgroundColor: color }}
    animate={{ y: '110vh', rotate: 720, opacity: [1, 1, 0] }}
    transition={{ duration: 2.5 + Math.random(), delay, ease: 'easeIn' }}
  />
)

export default function Day60Finale({ protocol, onClose }) {
  const baselines = getBaselines()
  const particles = Array.from({ length: 32 }, (_, i) => ({
    x: Math.random() * 100,
    color: i % 2 === 0 ? '#10b981' : '#34d399',
    delay: Math.random() * 0.8,
  }))

  return (
    <div className="fixed inset-0 bg-base flex flex-col items-center justify-center px-6 text-center z-50 overflow-hidden">
      {particles.map((p, i) => <Particle key={i} {...p} />)}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 w-full max-w-xs"
      >
        <div className="text-primary text-xs uppercase tracking-widest mb-2">Day 60</div>
        <h1 className="text-4xl font-bold text-textPrimary mb-3">You did it.</h1>
        <p className="text-textMuted text-sm mb-8 leading-relaxed">
          {protocol?.ai_note ?? 'You rebuilt the engine. This is what 60 days of consistency looks like.'}
        </p>

        {(baselines.pushUpMax || baselines.plankSec) && (
          <div className="bg-surface border border-border rounded-2xl p-5 mb-8 text-left">
            <div className="text-textMuted text-xs uppercase tracking-widest mb-4">Day 1 Baselines</div>
            {baselines.pushUpMax > 0 && (
              <div className="flex justify-between mb-2">
                <span className="text-textMuted text-sm">Push-up baseline</span>
                <span className="text-primary font-bold">{baselines.pushUpMax} reps</span>
              </div>
            )}
            {baselines.plankSec > 0 && (
              <div className="flex justify-between mb-2">
                <span className="text-textMuted text-sm">Plank baseline</span>
                <span className="text-primary font-bold">{baselines.plankSec}s</span>
              </div>
            )}
            {baselines.treadmillNote && (
              <div className="flex justify-between">
                <span className="text-textMuted text-sm">Treadmill</span>
                <span className="text-primary font-bold text-xs">{baselines.treadmillNote}</span>
              </div>
            )}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onClose}
          className="w-full bg-primary text-base font-semibold py-4 rounded-2xl"
        >
          Start day 61
        </motion.button>
      </motion.div>
    </div>
  )
}
