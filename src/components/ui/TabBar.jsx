const ICONS = {
  today: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1z"/>
      <path d="M9 21v-8h6v8"/>
    </svg>
  ),
  history: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  nutrition: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 3z"/>
    </svg>
  ),
  settings: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
      <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
      <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/>
      <line x1="17" y1="16" x2="23" y2="16"/>
    </svg>
  ),
}

export const TABS = [
  { id:'today', label:'Today' },
  { id:'history', label:'History' },
  { id:'nutrition', label:'Nutrition' },
  { id:'settings', label:'Settings' },
]

export default function TabBar({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex"
         style={{ background:'var(--color-surface)', borderTop:'1px solid var(--color-border)', paddingBottom:'env(safe-area-inset-bottom)' }}>
      {TABS.map(tab => {
        const isActive = active === tab.id
        return (
          <button key={tab.id} onClick={() => onChange(tab.id)}
            className="relative flex-1 flex flex-col items-center pt-2 pb-3 gap-1 transition-colors"
            style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-muted)' }}>
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-px rounded-full"
                    style={{ background:'var(--color-accent)', opacity: 0.8 }} />
            )}
            {ICONS[tab.id]}
            <span style={{ fontSize:'10px', fontWeight: isActive ? 600 : 400, letterSpacing:'0.02em' }}>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
