// Compact one-line brief shown at the top of non-Today tabs so the user
// always sees today's coaching state, no matter which tab they're on.
const COLOR_MAP = {
  'Train hard':       'var(--color-accent)',
  'Train as planned': 'var(--color-accent)',
  'Light only':       'var(--color-warning)',
  'Rest':             'var(--color-danger)',
}

export default function MiniBriefBanner({ brief }) {
  if (!brief?.headline || brief?.skipped) return null
  const rc = COLOR_MAP[brief.recommendation] || 'var(--color-warning)'
  return (
    <div className="card p-2.5 flex items-center justify-between gap-3"
      style={{ borderColor: rc + '44' }}>
      <p className="text-xs font-semibold leading-tight truncate flex-1">
        {brief.headline}
      </p>
      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap shrink-0"
        style={{ background: rc + '20', color: rc }}>
        {brief.recommendation}
      </span>
    </div>
  )
}
