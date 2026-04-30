import { motion } from 'framer-motion'
import Ring from './Ring.jsx'

export default function Pillar({ config, data, onTap }) {
  const score = data?.score ?? null
  return (
    <motion.button onClick={() => onTap?.(config.id)} whileTap={{ scale: 0.93 }}
      className="flex flex-col items-center gap-1 p-2 rounded-2xl"
      style={{ background: 'var(--color-surface)' }}>
      <div className="relative">
        <Ring score={score} color={config.color} size={76} strokeWidth={7} />
        <span className="absolute inset-0 flex items-center justify-center text-xl rotate-90 pointer-events-none">{config.emoji}</span>
      </div>
      <span className="text-sm font-semibold" style={{ color: score == null ? 'var(--color-muted)' : 'var(--color-text)' }}>{score ?? '—'}</span>
      <span className="text-xs" style={{ color: 'var(--color-muted)' }}>{config.label}</span>
    </motion.button>
  )
}
