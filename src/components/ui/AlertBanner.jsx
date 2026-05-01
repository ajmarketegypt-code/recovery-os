// In-app surface for the 4 critical health alerts.
// Renders above the Daily Brief on Today so they're impossible to miss.
// Tap × to dismiss; alerts auto-suppress for 7 days from morning cron anyway.
export default function AlertBanner({ alert, onDismiss }) {
  return (
    <div className="card p-3 flex items-start gap-2.5"
      style={{ borderColor: '#ef444466' }}>
      <span className="text-base leading-tight">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--color-danger)' }}>
          {alert.title}
        </p>
        <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--color-text)' }}>
          {alert.body}
        </p>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDismiss(alert.type) }}
        className="w-6 h-6 -mt-0.5 -mr-0.5 rounded-full flex items-center justify-center text-xs shrink-0 active:scale-90 transition-transform"
        style={{ background: 'var(--color-bg)', color: 'var(--color-muted)' }}>
        ✕
      </button>
    </div>
  )
}
