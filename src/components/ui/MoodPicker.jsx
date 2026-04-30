const MOODS = [{value:1,emoji:'😞'},{value:2,emoji:'😐'},{value:3,emoji:'🙂'},{value:4,emoji:'😄'}]
export default function MoodPicker({ mood, feltEnergy, onMoodChange, onEnergyChange }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs mb-2" style={{color:'var(--color-muted)'}}>How are you feeling?</p>
        <div className="flex gap-2">
          {MOODS.map(m => (
            <button key={m.value} onClick={()=>onMoodChange(m.value)}
              className="flex-1 flex flex-col items-center py-2 rounded-xl text-xl"
              style={{background:mood===m.value?'#10b98122':'var(--color-surface)',
                      border:`1px solid ${mood===m.value?'var(--color-accent)':'#30363d'}`}}>
              {m.emoji}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs mb-2" style={{color:'var(--color-muted)'}}>Felt energy (1–5)</p>
        <div className="flex gap-2">
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={()=>onEnergyChange(n)}
              className="flex-1 py-2 rounded-xl text-sm font-bold"
              style={{background:feltEnergy===n?'var(--color-accent)':'var(--color-surface)',
                      color:feltEnergy===n?'#0d1117':'var(--color-muted)',
                      border:`1px solid ${feltEnergy===n?'var(--color-accent)':'#30363d'}`}}>
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
