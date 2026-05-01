import { useState, useEffect, useCallback } from 'react'
import { PILLAR_CONFIGS } from '../components/pillars/pillarConfigs.js'
import Sparkline from '../components/ui/Sparkline.jsx'
import { usePullToRefresh } from '../hooks/usePullToRefresh.js'
import PullIndicator from '../components/ui/PullIndicator.jsx'

const ALL_SERIES = [
  ...PILLAR_CONFIGS,
  { id:'weight', label:'Weight', emoji:'⚖️', color:'#a3e635' },
]

function PillarChart({ cfg, data }) {
  const valueKey = cfg.id === 'weight' ? 'kg' : 'score'
  const values = (data ?? []).map(d => d?.[valueKey]).filter(v => v != null)
  const latest = values[values.length - 1]
  const avg = values.length ? Math.round(values.reduce((a,b)=>a+b,0) / values.length) : null

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold flex items-center gap-2" style={{color:cfg.color}}>
          <span className="text-base">{cfg.emoji}</span>{cfg.label}
        </p>
        <div className="text-right">
          {latest != null && (
            <p className="text-lg font-bold tabular-nums leading-none">
              {latest}{cfg.id==='weight'?<span className="text-xs font-normal ml-0.5" style={{color:'var(--color-muted)'}}>kg</span>:''}
            </p>
          )}
          {avg != null && values.length > 1 && (
            <p className="text-[10px] mt-0.5" style={{color:'var(--color-muted)'}}>
              avg {avg}{cfg.id==='weight'?'kg':''}
            </p>
          )}
        </div>
      </div>
      {values.length === 0
        ? <div className="h-16 rounded-xl flex items-center justify-center text-xs"
            style={{background:'rgba(255,255,255,0.03)',color:'var(--color-muted)'}}>
            No data yet
          </div>
        : <Sparkline data={data} color={cfg.color} valueKey={valueKey} />}
    </div>
  )
}

export default function History() {
  const [series, setSeries] = useState({})  // {pillarId: [{date, score}, ...]}
  const [report, setReport] = useState(null)

  const fetchAll = useCallback(async () => {
    const fetches = ALL_SERIES.map(c =>
      fetch(`/api/history?pillar=${c.id}`).then(r => r.json()).then(data => [c.id, data])
    )
    const [results, rep] = await Promise.all([
      Promise.all(fetches),
      fetch('/api/report').then(r => r.json()).catch(() => null),
    ])
    setSeries(Object.fromEntries(results))
    setReport(rep)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])
  const { pullY, refreshing, threshold } = usePullToRefresh(fetchAll)

  return (
    <div className="px-4 pt-14 pb-4 space-y-4 max-w-md mx-auto"
      style={{ transform: `translateY(${pullY * 0.5}px)`, transition: pullY === 0 ? 'transform 0.2s' : 'none' }}>
      <PullIndicator pullY={pullY} refreshing={refreshing} threshold={threshold} />

      <div className="space-y-0.5 mb-1">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{color:'var(--color-accent)'}}>30 days</p>
        <h1 className="text-3xl font-black tracking-tight">History</h1>
      </div>

      {/* Stacked pillar charts */}
      {ALL_SERIES.map(cfg => (
        <PillarChart key={cfg.id} cfg={cfg} data={series[cfg.id]} />
      ))}

      {/* Weekly report */}
      {report && !report.error && report.summary && (
        <div className="card p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{color:'var(--color-muted)'}}>This Week</p>
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
