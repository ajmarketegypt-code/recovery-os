import Ring from './Ring.jsx'

// Maps pillar id → which weekly stat to surface as a small "X/Y" badge
function weeklyBadge(pillarId, weekly) {
  if (!weekly?.week) return null
  const w = weekly.week
  switch (pillarId) {
    case 'sleep':    return { hit: w.sleep_hits,     total: w.sleep_target_days }
    case 'strength': return { hit: w.workout_days,   total: w.workout_target }
    case 'movement': return { hit: w.move_ring_hits, total: 7 }
    default: return null
  }
}

export default function Pillar({ config, data, weekly, onTap }) {
  const score = data?.score ?? null
  const hasScore = score != null
  const glowing = hasScore && score >= 70
  const badge = weeklyBadge(config.id, weekly)
  const onTrack = badge && badge.hit >= badge.total
  return (
    <button onClick={() => onTap?.(config.id)}
      className="card relative flex flex-col items-center gap-1.5 p-3 active:scale-95 transition-transform">
      {badge && (
        <span className="absolute top-1.5 right-2 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full"
          style={{
            background: onTrack ? '#10b98122' : 'rgba(255,255,255,0.06)',
            color: onTrack ? 'var(--color-accent)' : 'var(--color-muted)',
          }}>
          {badge.hit}/{badge.total}
        </span>
      )}
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
