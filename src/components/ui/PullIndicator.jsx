// Visual feedback for pull-to-refresh.
// Lives at the very top, fades + slides in as you pull, spins while refreshing.
export default function PullIndicator({ pullY, refreshing, threshold = 60 }) {
  const visible = pullY > 0 || refreshing
  const ready = pullY >= threshold
  const progress = Math.min(1, pullY / threshold)

  return (
    <div
      className="fixed top-0 left-0 right-0 z-30 flex justify-center pointer-events-none"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translateY(${refreshing ? 16 : Math.min(pullY * 0.6, 40) - 24}px)`,
        transition: pullY === 0 && !refreshing ? 'opacity 0.2s, transform 0.2s' : 'none',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
      <div
        className="mt-2 w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
        {refreshing ? (
          <span className="block w-4 h-4 rounded-full border-2 animate-spin"
            style={{ borderColor: 'var(--color-accent)', borderTopColor: 'transparent' }} />
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={ready ? 'var(--color-accent)' : 'var(--color-muted)'} strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: `rotate(${ready ? 180 : progress * 180}deg)`, transition: 'transform 0.15s, stroke 0.15s' }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <polyline points="19 12 12 19 5 12" />
          </svg>
        )}
      </div>
    </div>
  )
}
