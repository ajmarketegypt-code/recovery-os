import { useState, useEffect, useCallback } from 'react'
import { PILLAR_CONFIGS } from '../components/pillars/pillarConfigs.js'
import Sparkline from '../components/ui/Sparkline.jsx'
import { usePullToRefresh } from '../hooks/usePullToRefresh.js'
import PullIndicator from '../components/ui/PullIndicator.jsx'

export default function History() {
  const [pillar, setPillar] = useState('sleep')
  const [histData, setHistData] = useState([])
  const [report, setReport] = useState(null)

  const fetchAll = useCallback(async () => {
    await Promise.all([
      fetch(`/api/history?pillar=${pillar}`).then(r=>r.json()).then(setHistData),
      fetch('/api/report').then(r=>r.json()).then(setReport),
    ])
  }, [pillar])

  useEffect(()=>{ fetchAll() }, [fetchAll])
  const { pullY, refreshing, threshold } = usePullToRefresh(fetchAll)

  const cfg = PILLAR_CONFIGS.find(c=>c.id===pillar)
  const ALL = [...PILLAR_CONFIGS, {id:'weight',label:'Weight',emoji:'⚖️',color:'#a3e635'}]

  return (
    <div className="px-4 pt-14 pb-4 space-y-5 max-w-md mx-auto"
      style={{ transform: `translateY(${pullY * 0.5}px)`, transition: pullY === 0 ? 'transform 0.2s' : 'none' }}>
      <PullIndicator pullY={pullY} refreshing={refreshing} threshold={threshold} />
      <div className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{color:'var(--color-accent)'}}>Trends</p>
        <h1 className="text-3xl font-black tracking-tight">History</h1>
      </div>

      {/* pillar filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {ALL.map(c => (
          <button key={c.id} onClick={()=>setPillar(c.id)}
            className="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
            style={{
              background: pillar===c.id ? c.color : 'var(--color-surface)',
              color: pillar===c.id ? 'var(--color-bg)' : 'var(--color-muted)',
              border: `1px solid ${pillar===c.id ? c.color : 'var(--color-border)'}`
            }}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* sparkline card */}
      <div className="card p-4">
        <p className="text-sm font-semibold mb-3" style={{color:cfg?.color||'#a3e635'}}>
          {cfg?.emoji||'⚖️'} {cfg?.label||'Weight'} — 30 days
        </p>
        <Sparkline data={histData} color={cfg?.color||'#a3e635'} valueKey={pillar==='weight'?'kg':'score'} />
      </div>

      {/* weekly report */}
      {report && !report.error && report.summary && (
        <div className="card p-4 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-widest" style={{color:'var(--color-muted)'}}>This Week</p>
          <p className="text-sm leading-relaxed" style={{color:'var(--color-text)'}}>{report.summary}</p>
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl p-3" style={{background:'#10b98122',border:'1px solid #10b98133'}}>
              <p className="text-xs font-semibold" style={{color:'var(--color-accent)'}}>Win</p>
              <p className="text-xs mt-1" style={{color:'var(--color-text)'}}>{report.win}</p>
            </div>
            <div className="flex-1 rounded-xl p-3" style={{background:'#f59e0b22',border:'1px solid #f59e0b33'}}>
              <p className="text-xs font-semibold" style={{color:'var(--color-warning)'}}>Focus</p>
              <p className="text-xs mt-1" style={{color:'var(--color-text)'}}>{report.gap}</p>
            </div>
          </div>
          {report.correlations && (
            <p className="text-xs p-3 rounded-xl leading-relaxed"
              style={{background:'var(--color-bg)',border:'1px solid var(--color-border)',color:'var(--color-muted)'}}>
              {report.correlations}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
