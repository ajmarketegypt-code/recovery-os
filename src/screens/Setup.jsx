import { useState, useEffect } from 'react'
const IS_JULIE = import.meta.env.VITE_USER_NAME === 'julie'
const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
function urlB64ToUint8(b64) {
  const padding='='.repeat((4-b64.length%4)%4), base64=(b64+padding).replace(/-/g,'+').replace(/_/g,'/')
  return new Uint8Array([...atob(base64)].map(c=>c.charCodeAt(0)))
}

const Btn = ({onClick,disabled,children}) => (
  <button onClick={onClick} disabled={disabled}
    className="w-full py-4 rounded-2xl font-bold disabled:opacity-40"
    style={{background:'var(--color-accent)',color:'var(--color-bg)'}}>
    {children}
  </button>
)

export default function Setup({ onComplete }) {
  const steps = IS_JULIE ? [1,2,4,5,6,7] : [1,2,3,4,5,6,7]
  const [idx, setIdx] = useState(0)
  const step = steps[idx]
  const [name, setName] = useState('')
  const [target, setTarget] = useState(4)
  const [visionCap, setVisionCap] = useState(150)
  const [standalone, setStandalone] = useState(false)
  useEffect(()=>{ const chk=()=>setStandalone(!!window.navigator.standalone); chk(); const id=setInterval(chk,2000); return ()=>clearInterval(id) },[])
  const next = () => { if (idx<steps.length-1) setIdx(i=>i+1) }
  const save = patch => fetch('/api/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(patch)})
  const requestPush = async () => {
    try {
      const perm = await Notification.requestPermission()
      if (perm==='granted') {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlB64ToUint8(VAPID_KEY)})
        await fetch('/api/push/subscribe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(sub.toJSON())})
      }
    } catch {}
    next()
  }

  const STEPS = {
    1: <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black tracking-tight">Welcome to Health</h2>
        <p className="mt-2 text-sm" style={{color:'var(--color-muted)'}}>Your personal health super app.</p>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Your name</label>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ahmed"
          className="w-full px-4 py-3 rounded-2xl text-lg outline-none"
          style={{background:'var(--color-surface)',color:'var(--color-text)',border:'1px solid var(--color-border)'}} />
      </div>
      <Btn onClick={async()=>{ if(!name.trim())return; localStorage.setItem('health_name',name); await save({name}); next() }} disabled={!name.trim()}>Continue →</Btn>
    </div>,

    2: <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black tracking-tight">Add to Home Screen</h2>
        <p className="mt-2 text-sm" style={{color:'var(--color-muted)'}}>Required for push notifications on iOS.</p>
      </div>
      {standalone
        ? <div className="card p-4 flex items-center gap-3" style={{border:'1px solid var(--color-accent)'}}>
            <span className="text-2xl">✅</span>
            <p className="text-sm font-medium" style={{color:'var(--color-accent)'}}>Running from home screen!</p>
          </div>
        : <div className="card p-4 space-y-2">
            <ol className="text-sm space-y-1.5 list-decimal list-inside leading-relaxed" style={{color:'var(--color-muted)'}}>
              <li>Tap the <strong style={{color:'var(--color-text)'}}>Share</strong> button in Safari</li>
              <li>Tap <strong style={{color:'var(--color-text)'}}>Add to Home Screen</strong></li>
              <li>Open the app from your home screen</li>
            </ol>
            <p className="text-xs" style={{color:'var(--color-muted)'}}>Waiting…</p>
          </div>}
      <Btn onClick={next} disabled={!standalone}>Continue →</Btn>
    </div>,

    3: <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black tracking-tight">Connect Apple Watch</h2>
        <p className="mt-2 text-sm" style={{color:'var(--color-muted)'}}>Health Auto Export sends Watch data automatically.</p>
      </div>
      <div className="card p-4 space-y-2">
        <ol className="text-sm space-y-1.5 list-decimal list-inside leading-relaxed" style={{color:'var(--color-muted)'}}>
          <li>Install Health Auto Export from App Store</li>
          <li>Purchase Premium Annual ($6.99/yr)</li>
          <li>REST API URL: <code className="text-xs" style={{color:'var(--color-text)'}}>{window.location.origin}/api/health-ingest</code></li>
          <li>Schedule: Hourly + On workout completion</li>
        </ol>
        <p className="text-xs mt-2" style={{color:'var(--color-muted)'}}>You can set this up later — app works with manual input now.</p>
      </div>
      <Btn onClick={next}>Continue →</Btn>
    </div>,

    4: <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black tracking-tight">Notifications</h2>
        <p className="mt-2 text-sm" style={{color:'var(--color-muted)'}}>Stay on track with smart reminders.</p>
      </div>
      <div className="space-y-2">
        {['🌅 7:00am — Morning brief + recovery score','🏋️ 6:00pm — Workout reminder','📊 Sunday 7pm — Weekly health report'].map((item,i)=>(
          <div key={i} className="card px-4 py-3"><p className="text-sm">{item}</p></div>
        ))}
      </div>
      <Btn onClick={requestPush}>Enable Notifications</Btn>
      <button onClick={next} className="w-full py-2 text-sm" style={{color:'var(--color-muted)'}}>Skip for now</button>
    </div>,

    5: <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black tracking-tight">Workout Goal</h2>
        <p className="mt-2 text-sm" style={{color:'var(--color-muted)'}}>How many workouts per week?</p>
      </div>
      <div className="flex items-center justify-center gap-8">
        <button onClick={()=>setTarget(t=>Math.max(1,t-1))}
          className="w-14 h-14 rounded-full text-2xl font-bold"
          style={{background:'var(--color-surface)',border:'1px solid var(--color-border)'}}>−</button>
        <span className="text-6xl font-black" style={{color:'var(--color-accent)'}}>{target}</span>
        <button onClick={()=>setTarget(t=>Math.min(7,t+1))}
          className="w-14 h-14 rounded-full text-2xl font-bold"
          style={{background:'var(--color-surface)',border:'1px solid var(--color-border)'}}>+</button>
      </div>
      <Btn onClick={async()=>{ await save({workout_target:target}); next() }}>Continue →</Btn>
    </div>,

    6: <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-black tracking-tight">Meal Photo Budget</h2>
        <p className="mt-2 text-sm" style={{color:'var(--color-muted)'}}>Monthly limit for AI meal analysis.</p>
      </div>
      <input type="range" min={50} max={150} step={25} value={visionCap}
        onChange={e=>setVisionCap(parseInt(e.target.value))} className="w-full accent-emerald-400" />
      <p className="text-center text-3xl font-black" style={{color:'var(--color-accent)'}}>
        ${(visionCap/100).toFixed(2)}<span className="text-base font-normal ml-1" style={{color:'var(--color-muted)'}}>/mo</span>
      </p>
      <Btn onClick={async()=>{ await save({vision_cap_cents:visionCap}); next() }}>Continue →</Btn>
    </div>,

    7: <div className="space-y-6 text-center">
      <div className="text-6xl">🎉</div>
      <div>
        <h2 className="text-3xl font-black tracking-tight">You're all set!</h2>
        <p className="mt-2 text-sm" style={{color:'var(--color-muted)'}}>Health is ready. Watch data flows in automatically.</p>
      </div>
      <Btn onClick={onComplete}>Open Health →</Btn>
    </div>,
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{background:'var(--color-bg)'}}>
      <div className="w-full max-w-sm space-y-6">
        <div className="flex gap-1.5 justify-center">
          {steps.map((_,i)=>(
            <div key={i} className="h-1 rounded-full transition-all"
              style={{width:i===idx?28:8,background:i<=idx?'var(--color-accent)':'var(--color-border)'}} />
          ))}
        </div>
        {STEPS[step]}
      </div>
    </div>
  )
}
