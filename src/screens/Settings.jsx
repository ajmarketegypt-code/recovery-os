import { useState, useEffect } from 'react'
import { usePushStatus } from '../hooks/usePushStatus.js'
const IS_JULIE = import.meta.env.VITE_USER_NAME === 'julie'

function DevButton({ label, onClick, busy, tone='surface' }) {
  const styles = {
    surface: { background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' },
    accent:  { background: 'var(--color-accent)',  color: 'var(--color-bg)',   border: '1px solid var(--color-accent)' },
    danger:  { background: '#ef444415',            color: 'var(--color-danger)', border: '1px solid #ef444444' },
  }[tone]
  return (
    <button onClick={onClick} disabled={busy}
      className="px-3 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
      style={styles}>
      {busy ? '…' : label}
    </button>
  )
}

function Section({ title, children }) {
  return (
    <div className="card p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-widest" style={{color:'var(--color-muted)'}}>{title}</p>
      {children}
    </div>
  )
}
function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm">{label}</span>
      {children}
    </div>
  )
}
function SpendBar({ label, used, cap, color }) {
  const pct = Math.min(100, Math.round((used/cap)*100))
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5" style={{color:'var(--color-muted)'}}>
        <span>{label}</span>
        <span style={{color:pct>80?'var(--color-warning)':'var(--color-text)'}}>
          ${(used/100).toFixed(2)} / ${(cap/100).toFixed(2)}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{background:'rgba(255,255,255,0.08)'}}>
        <div className="h-full rounded-full transition-all" style={{width:`${pct}%`,background:pct>80?'var(--color-warning)':color}} />
      </div>
    </div>
  )
}

function Stepper({ value, min, max, step = 1, unit, onChange }) {
  const round = v => +(Math.round(v / step) * step).toFixed(2)
  return (
    <div className="flex items-center gap-3">
      <button onClick={()=>onChange(Math.max(min, round(value - step)))}
        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg"
        style={{background:'var(--color-surface)',border:'1px solid var(--color-border)'}}>−</button>
      <span className="min-w-[3rem] text-center font-bold tabular-nums">
        {value}{unit && <span className="text-xs font-normal ml-0.5" style={{color:'var(--color-muted)'}}>{unit}</span>}
      </span>
      <button onClick={()=>onChange(Math.min(max, round(value + step)))}
        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg"
        style={{background:'var(--color-surface)',border:'1px solid var(--color-border)'}}>+</button>
    </div>
  )
}

export default function Settings() {
  const [s, setS] = useState(null)
  const [busy, setBusy] = useState(null)
  const [devMsg, setDevMsg] = useState(null)
  const push = usePushStatus()
  const save = async patch => {
    const updated = await fetch('/api/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(patch)}).then(r=>r.json())
    setS(updated)
  }
  const callDev = async (path, action) => {
    setBusy(action); setDevMsg(null)
    try {
      const r = await fetch(path, { method: 'POST' })
      const j = await r.json().catch(()=>({}))
      setDevMsg(j.message || (j.ok ? `Done (${action})` : (j.reason || 'Failed')))
    } catch (e) { setDevMsg('Network error: ' + e.message) }
    finally { setBusy(null); setTimeout(()=>setDevMsg(null), 4000) }
  }
  useEffect(()=>{ fetch('/api/settings').then(r=>r.json()).then(setS) },[])
  if (!s) return <div className="flex items-center justify-center h-screen" style={{color:'var(--color-muted)'}}>Loading…</div>

  return (
    <div className="px-4 pt-14 pb-4 space-y-5 max-w-md mx-auto">
      <div className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{color:'var(--color-accent)'}}>Preferences</p>
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
      </div>

      <Section title="Notifications">
        {/* Push subscription state + enable button */}
        <Row label="Push notifications">
          {push.status === 'checking' && (
            <span className="text-xs" style={{color:'var(--color-muted)'}}>Checking…</span>
          )}
          {push.status === 'unsupported' && (
            <span className="text-xs" style={{color:'var(--color-muted)'}}>Not supported on this device</span>
          )}
          {push.status === 'subscribed' && (
            <span className="text-xs font-semibold" style={{color:'var(--color-accent)'}}>Enabled ✓</span>
          )}
          {push.status === 'denied' && (
            <span className="text-xs font-semibold" style={{color:'var(--color-danger)'}}>Blocked — enable in iPhone Settings</span>
          )}
          {push.status === 'default' && (
            <button onClick={push.enable} disabled={push.busy}
              className="text-xs px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50"
              style={{background:'var(--color-accent)',color:'var(--color-bg)'}}>
              {push.busy ? '…' : 'Enable'}
            </button>
          )}
        </Row>
        {push.error && (
          <p className="text-xs" style={{color:'var(--color-danger)'}}>{push.error}</p>
        )}
        <Row label="Morning brief">
          <input type="time" value={s.notification_times.morning}
            onChange={e=>save({notification_times:{...s.notification_times,morning:e.target.value}})}
            className="bg-transparent text-sm outline-none" style={{color:'var(--color-text)'}} />
        </Row>
        <Row label="Evening reminder">
          <input type="time" value={s.notification_times.evening}
            onChange={e=>save({notification_times:{...s.notification_times,evening:e.target.value}})}
            className="bg-transparent text-sm outline-none" style={{color:'var(--color-text)'}} />
        </Row>
      </Section>

      <Section title="Targets">
        <Row label="Sleep">
          <Stepper value={s.sleep_target_hours ?? 8} min={5} max={10} step={0.5} unit="h"
            onChange={v=>save({sleep_target_hours:v})} />
        </Row>
        <Row label="HRV">
          <Stepper value={s.hrv_target_ms ?? 45} min={20} max={100} step={1} unit="ms"
            onChange={v=>save({hrv_target_ms:v})} />
        </Row>
        <Row label="Workouts / week">
          <Stepper value={s.workout_target} min={1} max={7} onChange={v=>save({workout_target:v})} />
        </Row>
        <Row label="Daylight / day">
          <Stepper value={s.daylight_target_min ?? 30} min={5} max={120} step={5} unit="min"
            onChange={v=>save({daylight_target_min:v})} />
        </Row>
        <Row label="Protein / day">
          <Stepper value={s.protein_target_g ?? 140} min={60} max={250} step={5} unit="g"
            onChange={v=>save({protein_target_g:v})} />
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
              <button key={u} onClick={()=>save({weight_unit:u})}
                className="px-3 py-1 rounded-lg text-sm font-medium"
                style={{
                  background: s.weight_unit===u ? 'var(--color-accent)' : 'var(--color-surface)',
                  color: s.weight_unit===u ? 'var(--color-bg)' : 'var(--color-muted)',
                  border: `1px solid ${s.weight_unit===u ? 'var(--color-accent)' : 'var(--color-border)'}`
                }}>{u}</button>
            ))}
          </div>
        </Row>
      </Section>

      {IS_JULIE && (
        <Section title="Cycle Tracking">
          <p className="text-xs leading-relaxed" style={{color:'var(--color-muted)'}}>
            Corrects HRV interpretation during luteal phase (+4ms offset applied automatically).
          </p>
          <Row label="Last period start">
            <input type="date" value={s.last_period_start||''}
              onChange={e=>save({last_period_start:e.target.value})}
              className="bg-transparent text-sm outline-none" style={{color:'var(--color-text)'}} />
          </Row>
          <Row label="Cycle length">
            <Stepper value={s.cycle_length_days} min={21} max={35} onChange={v=>save({cycle_length_days:v})} />
          </Row>
        </Section>
      )}

      <Section title="Developer">
        <p className="text-xs leading-relaxed" style={{color:'var(--color-muted)'}}>
          Useful for testing without a connected Apple Watch.
        </p>
        <div className="flex flex-wrap gap-2">
          <DevButton label="Load demo data" tone="accent" busy={busy==='seed'}
            onClick={()=>callDev('/api/dev/seed', 'seed')} />
          <DevButton label="Test push" busy={busy==='push'}
            onClick={()=>callDev('/api/dev/test-push', 'push')} />
          <DevButton label="Generate report" busy={busy==='report'}
            onClick={()=>callDev('/api/dev/generate-report', 'report')} />
          <DevButton label="Run morning cron" busy={busy==='cron'}
            onClick={()=>callDev('/api/dev/trigger-cron', 'cron')} />
          <DevButton label="Wipe all data" tone="danger" busy={busy==='wipe'}
            onClick={()=>{ if (confirm('Delete all health data? Settings will stay.')) callDev('/api/dev/wipe', 'wipe') }} />
        </div>
        {devMsg && <p className="text-xs" style={{color:'var(--color-accent)'}}>{devMsg}</p>}
      </Section>

      {!IS_JULIE && (
        <Section title="Apple Watch Setup">
          <ol className="text-xs space-y-1.5 list-decimal list-inside leading-relaxed" style={{color:'var(--color-muted)'}}>
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
