import { useEffect, useState } from 'react'
import Sparkline from '../ui/Sparkline.jsx'
import { PILLAR_CONFIGS } from './pillarConfigs.js'

function MetricTile({ label, value, unit, hint }) {
  return (
    <div className="rounded-xl p-3" style={{background:'var(--color-bg)',border:'1px solid var(--color-border)'}}>
      <p className="text-[10px] uppercase tracking-wider" style={{color:'var(--color-muted)'}}>{label}</p>
      <p className="text-base font-bold mt-0.5">
        {value}{unit && <span className="text-xs font-normal ml-1" style={{color:'var(--color-muted)'}}>{unit}</span>}
      </p>
      {hint && <p className="text-[10px] mt-0.5" style={{color:'var(--color-muted)'}}>{hint}</p>}
    </div>
  )
}

function SetsLogger({ date, onSave }) {
  const [sets, setSets] = useState([{exercise:'',sets:3,reps:10,weight_kg:0}])
  const save = async () => {
    await fetch('/api/today-log',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'sets',date,data:{sets}})})
    onSave()
  }
  return (
    <div className="space-y-2 mt-3">
      {sets.map((row,i) => (
        <div key={i} className="flex gap-1">
          <input placeholder="Exercise" value={row.exercise} onChange={e=>setSets(s=>s.map((r,j)=>j===i?{...r,exercise:e.target.value}:r))}
            className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
            style={{background:'var(--color-bg)',color:'var(--color-text)',border:'1px solid var(--color-border)'}} />
          {['sets','reps','weight_kg'].map(field=>(
            <input key={field} type="number" placeholder={field==='weight_kg'?'kg':field} value={row[field]}
              onChange={e=>setSets(s=>s.map((r,j)=>j===i?{...r,[field]:parseFloat(e.target.value)}:r))}
              className="w-14 px-2 py-1.5 rounded-lg text-xs outline-none text-center"
              style={{background:'var(--color-bg)',color:'var(--color-text)',border:'1px solid var(--color-border)'}} />
          ))}
        </div>
      ))}
      <div className="flex gap-2">
        <button onClick={()=>setSets(s=>[...s,{exercise:'',sets:3,reps:10,weight_kg:0}])}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{background:'var(--color-surface)',color:'var(--color-muted)',border:'1px solid var(--color-border)'}}>+ Add set</button>
        <button onClick={save} className="text-xs px-3 py-1.5 rounded-lg font-semibold"
          style={{background:'var(--color-accent)',color:'var(--color-bg)'}}>Save</button>
      </div>
    </div>
  )
}

export default function PillarDetail({ pillarId, data, onClose }) {
  const [history, setHistory] = useState([])
  const [showSets, setShowSets] = useState(false)
  const [closing, setClosing] = useState(false)
  const cfg = PILLAR_CONFIGS.find(c=>c.id===pillarId)
  const today = new Date().toISOString().slice(0,10)

  useEffect(()=>{ if(pillarId) fetch(`/api/history?pillar=${pillarId}`).then(r=>r.json()).then(setHistory) },[pillarId])
  useEffect(()=>{ setClosing(false) },[pillarId])

  const handleClose = () => {
    setClosing(true)
    setTimeout(onClose, 250)
  }

  if (!pillarId) return null

  return (
    <>
      <div className={`fixed inset-0 z-40 transition-opacity duration-200 ${closing?'opacity-0':'opacity-100'}`}
        style={{background:'rgba(0,0,0,0.7)'}} onClick={handleClose} />
      <div className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto sheet ${closing?'sheet-out':''}`}
        style={{background:'var(--color-surface)',borderTop:'1px solid var(--color-border)'}}>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full" style={{background:'var(--color-border)'}} />
        <div className="flex items-center justify-between pt-2">
          <h2 className="text-lg font-bold">{cfg?.emoji} {cfg?.label}</h2>
          <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
            style={{background:'var(--color-bg)',color:'var(--color-muted)'}}>✕</button>
        </div>
        <div className="text-center py-2">
          <p className="text-5xl font-bold" style={{color:cfg?.color}}>{data?.score??'—'}</p>
          <p className="text-sm mt-1" style={{color:'var(--color-muted)'}}>Today</p>
        </div>
        {pillarId==='hrv' && data?.signal && (
          <>
            <div className="rounded-xl p-3" style={{background:data.signal==='green'?'#10b98122':data.signal==='red'?'#ef444422':'#f59e0b22',border:`1px solid ${data.signal==='green'?'var(--color-accent)':data.signal==='red'?'var(--color-danger)':'var(--color-warning)'}`}}>
              <p className="text-sm font-medium">{data.signal==='green'?'Ready to train hard':data.signal==='red'?'Push light today':'Train as planned'}{data.luteal_adjusted&&<span className="text-xs ml-1" style={{color:'var(--color-muted)'}}>(Luteal)</span>}</p>
              <p className="text-xs mt-1" style={{color:'var(--color-muted)'}}>HRV: {data.hrv_ms}ms · Baseline: {data.baseline?.mean}ms</p>
            </div>
            {/* Recovery extras grid */}
            <div className="grid grid-cols-2 gap-2">
              {data.resting_hr != null && <MetricTile label="Resting HR" value={data.resting_hr} unit="bpm" />}
              {data.walking_hr != null && <MetricTile label="Walking HR" value={data.walking_hr} unit="bpm" />}
              {data.wrist_temp_delta != null && (
                <MetricTile label="Wrist temp" value={(data.wrist_temp_delta>0?'+':'')+data.wrist_temp_delta} unit="°C"
                  hint={Math.abs(data.wrist_temp_delta) > 0.3 ? 'Above baseline' : 'Normal'} />
              )}
            </div>
          </>
        )}
        {pillarId==='sleep' && (data?.stages || data?.respiratory_rate != null) && (
          <>
            {data.stages && (
              <div className="space-y-2">
                {Object.entries(data.stages).map(([stage,hours])=>(
                  <div key={stage}>
                    <div className="flex justify-between text-xs mb-1" style={{color:'var(--color-muted)'}}><span className="capitalize">{stage}</span><span>{hours?.toFixed(1)}h</span></div>
                    <div className="h-1.5 rounded-full" style={{background:'rgba(255,255,255,0.08)'}}>
                      <div className="h-full rounded-full" style={{width:`${Math.min(100,(hours/(data.total_hours||8))*100)}%`,background:stage==='deep'?'#818cf8':stage==='rem'?'#f87171':'#10b981'}} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Sleep enrichment */}
            {(data.respiratory_rate != null || data.spo2_avg != null) && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {data.respiratory_rate != null && <MetricTile label="Resp rate" value={data.respiratory_rate} unit="br/min" />}
                {data.spo2_avg != null && <MetricTile label="Blood O₂" value={data.spo2_avg} unit="%"
                  hint={data.spo2_avg < 95 ? 'Below normal' : 'Healthy'} />}
              </div>
            )}
          </>
        )}
        {pillarId==='movement' && (data?.steps != null || data?.vo2_max != null) && (
          <div className="grid grid-cols-2 gap-2">
            {data.steps != null && <MetricTile label="Steps" value={data.steps.toLocaleString()} />}
            {data.vo2_max != null && <MetricTile label="VO₂ Max" value={data.vo2_max} unit="ml/kg/min"
              hint={data.vo2_max >= 45 ? 'Excellent' : data.vo2_max >= 35 ? 'Good' : 'Fair'} />}
          </div>
        )}
        {pillarId==='strength' && (
          <div className="space-y-2">
            {(data?.workouts??[]).map((w,i)=>(
              <div key={i} className="rounded-xl p-3" style={{background:'var(--color-bg)'}}>
                <p className="text-sm font-medium">{w.type||'Workout'}</p>
                <p className="text-xs mt-0.5" style={{color:'var(--color-muted)'}}>{w.duration_min}min · {w.calories} kcal</p>
              </div>
            ))}
            {!showSets
              ? <button onClick={()=>setShowSets(true)} className="text-sm font-medium" style={{color:'var(--color-accent)'}}>+ Log sets & reps</button>
              : <SetsLogger date={today} onSave={()=>setShowSets(false)} />}
          </div>
        )}
        {history.length>1 && (
          <div>
            <p className="text-sm font-semibold mb-2" style={{color:'var(--color-muted)'}}>30 days</p>
            <Sparkline data={history} color={cfg?.color||'var(--color-accent)'} />
          </div>
        )}
      </div>
    </>
  )
}
