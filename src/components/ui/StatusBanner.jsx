// Tiny floating banner at the top of the screen for transient state.
// Used for offline + fetch errors. Auto-positions below safe-area inset.
export default function StatusBanner({ message, tone = 'warning' }) {
  if (!message) return null
  const colors = {
    warning: { bg: '#f59e0b22', border: '#f59e0b66', text: 'var(--color-warning)' },
    danger:  { bg: '#ef444422', border: '#ef444466', text: 'var(--color-danger)' },
    info:    { bg: '#10b98122', border: '#10b98166', text: 'var(--color-accent)' },
  }[tone]
  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-40 px-4"
      style={{ top: 'calc(env(safe-area-inset-top) + 8px)' }}>
      <div className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2"
        style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text, backdropFilter: 'blur(8px)' }}>
        {message}
      </div>
    </div>
  )
}
