export const TABS = [
  { id:'today', label:'Today', emoji:'🏠' }, { id:'history', label:'History', emoji:'📈' },
  { id:'nutrition', label:'Nutrition', emoji:'🥗' }, { id:'settings', label:'Settings', emoji:'⚙️' },
]
export default function TabBar({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t border-[#30363d]"
         style={{ background:'var(--color-surface)', paddingBottom:'env(safe-area-inset-bottom)' }}>
      {TABS.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)}
          className="flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors"
          style={{ color: active===tab.id ? 'var(--color-accent)' : 'var(--color-muted)' }}>
          <span className="text-lg">{tab.emoji}</span>{tab.label}
        </button>
      ))}
    </nav>
  )
}
