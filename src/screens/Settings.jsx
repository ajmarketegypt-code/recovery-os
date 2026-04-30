import { useState, useEffect } from 'react'
const IS_JULIE = import.meta.env.VITE_USER_NAME === 'julie'

function Section({ title, children }) {
  return <div className="rounded-2xl p-4 space-y-3" style={{background:'var(--color-surface)'}}><p className="text-sm font-semibold" style={{color:'var(--color-muted)'}}>{title}</p>{children}</div>
}
function Row({ label, children }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-sm">{label}</span>{children}</div>
}
function SpendBar({ label, used, cap, color }) {
  const pct=Math.min(100,Math.round((used/cap)*100))
  return (
    <div>
      <div className="flex justify-between text-xs mb-1" style={{color:'var(--color-muted)'}}>
        <span>{label}</span><span style={{color:pct>80?'var(--color-warning)':'var(--color-text)'}}>${(used/100).toFixed(2)} / ${(cap/100).toFixed(2)}</span>
      </div>
      <div className="h-2 rounded-full" style={{background:'#30363d'}}>
        <div className="h-full rounded-full" style={{width:`${pct}%`,background:pct>80?'var(--color-warning)':color}} />
      </div>
    </div>
  )
}

export default function Settings() {
  const [s, setS] = useState(null)
  const save = async patch => {
    const updated = await fetch('/api/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(patch)}).then(r=>r.json())
    setS(updated)
  }
  useEffect(()=>{ fetch('/api/settings').then(r=>r.json()).then(setS) },[])
  if (!s) return <div className="flex items-center justify-center h-screen" style={{color:'var(--color-muted)'}}>Loading…</div>

  return (
    <div className="px-4 pt-12 pb-4 space-y-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold">Settings</h1>
      <Section title="Notifications">
        <Row label="Morning brief"><input type="time" value={s.notification_times.morning}
          onChange={e=>save({notification_times:{...s.notification_times,morning:e.target.value}})}
          className="bg-transparent text-sm outline-none" style={{color:'var(--color-text)'}} /></Row>
        <Row label="Evening reminder"><input type="time" value={s.notification_times.evening}
          onChange={e=>save({notification_times:{...s.notification_times,evening:e.target.value}})}
          className="bg-transparent text-sm outline-none" style={{color:'var(--color-text)'}} /></Row>
      </Section>
      <Section title="Training">
        <Row label="Weekly workout target">
          <div className="flex items-center gap-2">
            <button onClick={()=>save({workout_target:Math.max(1,s.workout_target-1)})} className="w-8 h-8 rounded-full flex items-center justify-center font-bold" style={{background:'#30363d'}}>-</button>
            <span className="w-6 text-center font-bold">{s.workout_target}</span>
            <button onClick={()=>save({workout_target:Math.min(7,s.workout_target+1)})} className="w-8 h-8 rounded-full flex items-center justify-center font-bold" style={{background:'#30363d'}}>+</button>
          </div>
        </Row>
      </Section>
      <Section title="AI Budget">
        <SpendBar label="Monthly AI spend" used={s.aiSpend} cap={300} color="var(--color-accent)" />
        <SpendBar label="Vision (meal photos)" used={s.visionBudget.used_cents} cap={s.visionBudget.cap_cents} color="#34d399" />
      </Section>
      <Section title="Units">
        <Row label="Weight unit">
          <div className="flex gap-1">
            {['kg','lbs'].map(u=>(
              <button key={u} onClick={()=>save({weight_unit:u})} className="px-3 py-1 rounded-lg text-sm font-medium"
                style={{background:s.weight_unit===u?'var(--color-accent)':'#30363d',color:s.weight_unit===u?'#0d1117':'var(--color-muted)'}}>
                {u}
              </button>
            ))}
          </div>
        </Row>
      </Section>
      {IS_JULIE && (
        <Section title="Cycle Tracking">
          <p className="text-xs" style={{color:'var(--color-muted)'}}>Corrects HRV interpretation during luteal phase (+4ms offset applied automatically).</p>
          <Row label="Last period start"><input type="date" value={s.last_period_start||''}
            onChange={e=>save({last_period_start:e.target.value})}
            className="bg-transparent text-sm outline-none" style={{color:'var(--color-text)'}} /></Row>
          <Row label="Cycle length">
            <div className="flex items-center gap-2">
              <button onClick={()=>save({cycle_length_days:Math.max(21,s.cycle_length_days-1)})} className="w-8 h-8 rounded-full flex items-center justify-center font-bold" style={{background:'#30363d'}}>-</button>
              <span className="w-8 text-center font-bold">{s.cycle_length_days}</span>
              <button onClick={()=>save({cycle_length_days:Math.min(35,s.cycle_length_days+1)})} className="w-8 h-8 rounded-full flex items-center justify-center font-bold" style={{background:'#30363d'}}>+</button>
            </div>
          </Row>
        </Section>
      )}
      {!IS_JULIE && (
        <Section title="Apple Watch Setup">
          <ol className="text-xs space-y-1 list-decimal list-inside" style={{color:'var(--color-muted)'}}>
            <li>Install Health Auto Export on iPhone</li>
            <li>Purchase Premium Annual ($6.99/yr)</li>
            <li>REST API URL: <code style={{color:'var(--color-text)'}}>{window.location.origin}/api/health-ingest</code></li>
            <li>Header: <code style={{color:'var(--color-text)'}}>X-Ingest-Secret</code> = your INGEST_SECRET value</li>
            <li>Schedule: Hourly + On workout completion</li>
          </ol>
        </Section>
      )}
    </div>
  )
}
