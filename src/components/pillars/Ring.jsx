export default function Ring({ score, color, size = 80, strokeWidth = 8 }) {
  const r = (size - strokeWidth) / 2, cx = size / 2
  const circumference = 2 * Math.PI * r
  const pct = score == null ? 0 : Math.min(100, Math.max(0, score))
  const offset = circumference * (1 - pct / 100)
  return (
    <svg width={size} height={size} className="block -rotate-90">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} />
      <circle cx={cx} cy={cx} r={r} fill="none"
        stroke={score == null ? 'rgba(255,255,255,0.08)' : color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
    </svg>
  )
}
