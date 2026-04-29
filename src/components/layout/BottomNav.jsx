const tabs = [
  { id: 'home', label: 'Home', icon: '⊙' },
  { id: 'today', label: 'Today', icon: '◈' },
  { id: 'workout', label: 'Workout', icon: '▲' },
  { id: 'progress', label: 'Progress', icon: '◉' },
  { id: 'settings', label: 'Settings', icon: '◎' },
]

export default function BottomNav({ active, onSelect }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex pb-safe">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className={`flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors ${
            active === tab.id ? 'text-primary' : 'text-textMuted'
          }`}
        >
          <span className="text-lg leading-none">{tab.icon}</span>
          <span className="text-[10px] font-medium tracking-wide">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
