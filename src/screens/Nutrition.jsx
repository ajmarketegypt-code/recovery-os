import { useState, useEffect, useRef } from 'react'

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
      <div className="h-1.5 rounded-full" style={{background:'#30363d'}}>
        <div className="h-full rounded-full" style={{width:`${Math.min(100,(value/max)*100)}%`,background:color}} />
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

  const fetchData = () => fetch('/api/today').then(r=>r.json()).then(d=>setNutrition(d.nutrition))
  useEffect(()=>{ fetchData() }, [])

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

  const totals = nutrition?.totals??{protein_g:0,carbs_g:0,fat_g:0,calories:0}
  return (
    <div className="px-4 pt-12 pb-4 space-y-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold">Nutrition</h1>
      <div className="rounded-2xl p-4 space-y-3" style={{background:'var(--color-surface)'}}>
        <div className="flex justify-between items-baseline">
          <p className="text-sm font-semibold">Today</p>
          <p className="text-lg font-bold">{Math.round(totals.calories)} <span className="text-sm font-normal" style={{color:'var(--color-muted)'}}>kcal</span></p>
        </div>
        <MacroBar label="Protein" value={totals.protein_g} max={160} color="#f87171" />
        <MacroBar label="Carbs"   value={totals.carbs_g}   max={250} color="#facc15" />
        <MacroBar label="Fat"     value={totals.fat_g}     max={80}  color="#fb923c" />
      </div>
      {!manualMode ? (
        <button onClick={()=>fileRef.current?.click()} disabled={uploading}
          className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
          style={{background:'var(--color-accent)',color:'#0d1117',opacity:uploading?0.6:1}}>
          {uploading ? 'Analyzing...' : '📷 Log meal with camera'}
        </button>
      ) : (
        <div className="rounded-2xl p-4 space-y-3" style={{background:'var(--color-surface)'}}>
          <p className="text-sm font-semibold">Manual entry (vision budget reached)</p>
          <input placeholder="Meal name" value={manual.name} onChange={e=>setManual(m=>({...m,name:e.target.value}))}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{background:'#0d1117',color:'var(--color-text)',border:'1px solid #30363d'}} />
          <div className="flex gap-2">
            <input type="number" placeholder="Calories" value={manual.calories} onChange={e=>setManual(m=>({...m,calories:e.target.value}))}
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={{background:'#0d1117',color:'var(--color-text)',border:'1px solid #30363d'}} />
            <input type="number" placeholder="Protein (g)" value={manual.protein} onChange={e=>setManual(m=>({...m,protein:e.target.value}))}
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={{background:'#0d1117',color:'var(--color-text)',border:'1px solid #30363d'}} />
          </div>
          <button onClick={submitManual} className="w-full py-2 rounded-xl font-semibold text-sm"
            style={{background:'var(--color-accent)',color:'#0d1117'}}>Log meal</button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <div className="space-y-2">
        {(nutrition?.meals??[]).map((meal,i) => (
          <div key={meal.id||i} className="rounded-xl p-3 flex justify-between items-center" style={{background:'var(--color-surface)'}}>
            <div>
              <p className="text-sm font-medium">{meal.comment||'Meal'}</p>
              <p className="text-xs mt-0.5" style={{color:'var(--color-muted)'}}>{Math.round(meal.macros?.calories??0)} kcal · {Math.round(meal.macros?.protein_g??0)}g protein</p>
            </div>
            <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{background:'#10b98122',color:'var(--color-accent)'}}>{meal.quality_score}/10</span>
          </div>
        ))}
      </div>
    </div>
  )
}
