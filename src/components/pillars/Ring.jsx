import { motion } from 'framer-motion'

export default function Ring({ score, color, size = 80, strokeWidth = 8 }) {
  const r = (size - strokeWidth) / 2, cx = size / 2
  const circumference = 2 * Math.PI * r
  const pct = score == null ? 0 : Math.min(100, Math.max(0, score))
  const offset = circumference * (1 - pct / 100)
  return (
    <svg width={size} height={size} className="block -rotate-90">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#30363d" strokeWidth={strokeWidth} />
      <motion.circle cx={cx} cy={cx} r={r} fill="none"
        stroke={score == null ? '#30363d' : color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
        transition={{ type: 'spring', stiffness: 80, damping: 20, delay: 0.1 }} />
    </svg>
  )
}
