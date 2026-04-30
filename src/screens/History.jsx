import { useState, useEffect } from 'react'
import { PILLAR_CONFIGS } from '../components/pillars/pillarConfigs.js'
import Sparkline from '../components/ui/Sparkline.jsx'

export default function History() {
  const [pillar, setPillar] = useState('sleep')
  const [histData, setHistData] = useState([])
  const [report, setReport] = useState(null)

  useEffect(()=>{ fetch(`/api/history?pillar=${pillar}`).then(r=>r.json()).then(setHistData) }, [pillar])
  useEffect(()=>{ fetch('/api/report').then(r=>r.json()).then(setReport) }, [])

  const cfg = PILLAR_CONFIGS.find(c=>c.id===pillar)

  return (
    <div className="px-4 pt-12 pb-4 space-y-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold">History</h1>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[...PILLAR_CONFIGS, {id:'weight',label:'Weight',emoji:'⚖️',color:'#a3e635'}].map(c => (
          <button key={c.id} onClick={()=>setPillar(c.id)}
            className="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{background:pillar===c.id?c.color:'var(--color-surface)',color:pillar===c.id?'#0d1117':'var(--color-muted)'}}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>
      <div className="rounded-2xl p-4" style={{background:'var(--color-surface)'}}>
        <p className="text-sm font-semibold mb-3" style={{color:cfg?.color||'#a3e635'}}>{cfg?.emoji||'⚖️'} {cfg?.label||'Weight'} — 30 days</p>
        <Sparkline data={histData} color={cfg?.color||'#a3e635'} />
      </div>
      {report && !report.error && report.summary && (
        <div className="rounded-2xl p-4 space-y-3" style={{background:'var(--color-surface)'}}>
          <p className="text-sm font-semibold">This Week</p>
          <p className="text-sm" style={{color:'var(--color-muted)'}}>{report.summary}</p>
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl p-3" style={{background:'#10b98122'}}>
              <p className="text-xs font-semibold" style={{color:'var(--color-accent)'}}>Win</p>
              <p className="text-xs mt-1">{report.win}</p>
            </div>
            <div className="flex-1 rounded-xl p-3" style={{background:'#f59e0b22'}}>
              <p className="text-xs font-semibold" style={{color:'var(--color-warning)'}}>Focus</p>
              <p className="text-xs mt-1">{report.gap}</p>
            </div>
          </div>
          {report.correlations && <p className="text-xs p-3 rounded-xl" style={{background:'#30363d',color:'var(--color-muted)'}}>{report.correlations}</p>}
        </div>
      )}
    </div>
  )
}
