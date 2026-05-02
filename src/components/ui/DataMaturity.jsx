// Surfaces "your data is still ramping up" so the user understands why
// scores look weird in the first 2 weeks. Without this, an "HRV: red"
// reading on day 3 feels broken instead of expected.
//
// Renders nothing once everything is mature.
export default function DataMaturity({ data, weekly }) {
  const items = []

  // HRV baseline — needs 14 days of readings to be trustworthy
  const baseline = data?.hrv?.baseline
  if (baseline?.regime === 'establishing') {
    const n = baseline.n ?? 0
    items.push({
      label: 'HRV baseline',
      progress: `${n}/14 days`,
      pct: Math.min(100, (n / 14) * 100),
      hint: n < 3 ? 'Wear the Watch to sleep — readings come from overnight'
        : 'Each night adds one. Recovery signals get accurate at 14.',
    })
  }

  // Weight series — needs ≥3 weigh-ins to compute pace
  const weighIns = weekly?.weight?.series?.length ?? 0
  if (weighIns < 3) {
    items.push({
      label: 'Recomp tracking',
      progress: `${weighIns}/3 weigh-ins`,
      pct: Math.min(100, (weighIns / 3) * 100),
      hint: 'Weigh yourself 3-4× this week so we can show fat-vs-muscle pace.',
    })
  }

  if (items.length === 0) return null

  return (
    <div className="card p-3 space-y-2.5">
      <p className="text-[10px] uppercase tracking-widest font-semibold"
        style={{ color: 'var(--color-muted)' }}>
        Your data is ramping up
      </p>
      {items.map((it, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-baseline justify-between text-xs">
            <span style={{ color: 'var(--color-text)' }}>{it.label}</span>
            <span className="tabular-nums font-semibold"
              style={{ color: 'var(--color-muted)' }}>{it.progress}</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all"
              style={{ width: `${it.pct}%`, background: 'var(--color-accent)' }} />
          </div>
          <p className="text-[10px] leading-snug"
            style={{ color: 'var(--color-muted)' }}>{it.hint}</p>
        </div>
      ))}
    </div>
  )
}
