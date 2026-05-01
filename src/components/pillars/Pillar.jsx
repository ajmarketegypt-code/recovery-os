import Ring from './Ring.jsx'

export default function Pillar({ config, data, onTap }) {
  const score = data?.score ?? null
  const hasScore = score != null
  const glowing = hasScore && score >= 70
  return (
    <button onClick={() => onTap?.(config.id)}
      className="card flex flex-col items-center gap-1.5 p-3 active:scale-95 transition-transform">
      <div className="relative" style={glowing ? { filter:`drop-shadow(0 0 10px ${config.color}60)` } : {}}>
        <Ring score={score} color={config.color} size={72} strokeWidth={6} />
        <span className="absolute inset-0 flex items-center justify-center text-lg pointer-events-none">{config.emoji}</span>
      </div>
      <span className="text-base font-bold tabular-nums leading-none"
            style={{ color: hasScore ? 'var(--color-text)' : 'var(--color-muted)' }}>{hasScore ? score : '—'}</span>
      <span style={{ fontSize:'11px', color:'var(--color-muted)', letterSpacing:'0.03em' }}>{config.label}</span>
    </button>
  )
}
