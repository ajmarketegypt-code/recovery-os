import { useState, useEffect, useRef, useCallback } from 'react'
import { usePullToRefresh } from '../hooks/usePullToRefresh.js'
import PullIndicator from '../components/ui/PullIndicator.jsx'

async function resizeImage(file, maxPx=800) {
  return new Promise(resolve => {
    const img = new Image(), url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxPx/Math.max(img.width,img.height))
      const canvas = document.createElement('canvas')
      canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale)
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height)
      URL.revokeObjectURL(url); canvas.toBlob(resolve,'image/jpeg',0.85)
    }; img.src=url
  })
}

function MacroBar({ label, value, max, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1" style={{color:'var(--color-muted)'}}>
        <span>{label}</span><span style={{color:'var(--color-text)'}}>{Math.round(value)}g</span>
      </div>
      <div className="h-1.5 rounded-full" style={{background:'rgba(255,255,255,0.08)'}}>
        <div className="h-full rounded-full transition-all" style={{width:`${Math.min(100,(value/max)*100)}%`,background:color}} />
      </div>
    </div>
  )
}

export default function Nutrition() {
  const [nutrition, setNutrition] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manual, setManual] = useState({name:'',calories:'',protein:''})
  const fileRef = useRef()

  const fetchData = useCallback(() =>
    fetch('/api/today').then(r=>r.json()).then(d=>setNutrition(d.nutrition)), [])

  useEffect(()=>{ fetchData() }, [fetchData])
  const { pullY, refreshing, threshold } = usePullToRefresh(fetchData)

  const handleFile = async e => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const resized = await resizeImage(file,800)
      const form = new FormData(); form.append('image',resized,'meal.jpg')
      const res = await fetch('/api/vision',{method:'POST',body:form})
      if (res.status===402) { setManualMode(true); return }
      await fetchData()
    } finally { setUploading(false); e.target.value='' }
  }

  const submitManual = async () => {
    await fetch('/api/today-log',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({type:'nutrition_manual',data:{name:manual.name,calories:parseFloat(manual.calories),protein_g:parseFloat(manual.protein||0)}})})
    setManual({name:'',calories:'',protein:''}); await fetchData()
  }

  const totals = nutrition?.totals ?? {protein_g:0,carbs_g:0,fat_g:0,calories:0}

  return (
    <div className="px-4 pt-14 pb-4 space-y-5 max-w-md mx-auto"
      style={{ transform: `translateY(${pullY * 0.5}px)`, transition: pullY === 0 ? 'transform 0.2s' : 'none' }}>
      <PullIndicator pullY={pullY} refreshing={refreshing} threshold={threshold} />
      <div className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{color:'var(--color-accent)'}}>Today's intake</p>
        <h1 className="text-3xl font-black tracking-tight">Nutrition</h1>
      </div>

      {/* macro summary */}
      <div className="card p-4 space-y-3">
        <div className="flex justify-between items-baseline">
          <p className="text-sm font-semibold" style={{color:'var(--color-muted)'}}>Calories</p>
          <p className="text-2xl font-black">{Math.round(totals.calories)}<span className="text-sm font-normal ml-1" style={{color:'var(--color-muted)'}}>kcal</span></p>
        </div>
        <MacroBar label="Protein" value={totals.protein_g} max={160} color="#f87171" />
        <MacroBar label="Carbs"   value={totals.carbs_g}   max={250} color="#facc15" />
        <MacroBar label="Fat"     value={totals.fat_g}     max={80}  color="#fb923c" />
      </div>

      {/* log meal */}
      {!manualMode ? (
        <button onClick={()=>fileRef.current?.click()} disabled={uploading}
          className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
          style={{background:'var(--color-accent)',color:'var(--color-bg)',opacity:uploading?0.6:1}}>
          {uploading ? 'Analyzing…' : '📷 Log meal with camera'}
        </button>
      ) : (
        <div className="card p-4 space-y-3">
          <p className="text-sm font-semibold">Manual entry <span className="font-normal text-xs" style={{color:'var(--color-muted)'}}>— vision budget reached</span></p>
          <input placeholder="Meal name" value={manual.name} onChange={e=>setManual(m=>({...m,name:e.target.value}))}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{background:'var(--color-bg)',color:'var(--color-text)',border:'1px solid var(--color-border)'}} />
          <div className="flex gap-2">
            <input type="number" placeholder="Calories" value={manual.calories} onChange={e=>setManual(m=>({...m,calories:e.target.value}))}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{background:'var(--color-bg)',color:'var(--color-text)',border:'1px solid var(--color-border)'}} />
            <input type="number" placeholder="Protein (g)" value={manual.protein} onChange={e=>setManual(m=>({...m,protein:e.target.value}))}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{background:'var(--color-bg)',color:'var(--color-text)',border:'1px solid var(--color-border)'}} />
          </div>
          <button onClick={submitManual} className="w-full py-2.5 rounded-xl font-semibold text-sm"
            style={{background:'var(--color-accent)',color:'var(--color-bg)'}}>Log meal</button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

      {/* meal list */}
      <div className="space-y-2">
        {(nutrition?.meals??[]).map((meal,i) => (
          <div key={meal.id||i} className="card px-4 py-3 flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">{meal.comment||'Meal'}</p>
              <p className="text-xs mt-0.5" style={{color:'var(--color-muted)'}}>
                {Math.round(meal.macros?.calories??0)} kcal · {Math.round(meal.macros?.protein_g??0)}g protein
              </p>
            </div>
            <span className="text-sm font-bold px-2 py-0.5 rounded-full"
              style={{background:'#10b98122',color:'var(--color-accent)'}}>{meal.quality_score}/10</span>
          </div>
        ))}
      </div>
    </div>
  )
}
