// Full-screen sheet listing every captured Watch metric.
// One tap from Today via "All vitals →" link.
import { useEffect, useState } from 'react'

const TREND_ARROW = { up: '↑', down: '↓', flat: '→' }

// Color logic: arrow is accent if movement is "good" for that metric, danger if bad
function trendColor({ trend, goodWhen }) {
  if (!trend) return 'var(--color-muted)'
  if (goodWhen === 'neutral' || trend === 'flat') return 'var(--color-muted)'
  if (goodWhen === 'high')  return trend === 'up'   ? 'var(--color-accent)' : 'var(--color-danger)'
  if (goodWhen === 'low')   return trend === 'down' ? 'var(--color-accent)' : 'var(--color-danger)'
  return 'var(--color-muted)'
}

function VitalTile({ metric }) {
  const { emoji, label, value, unit, target, week_avg } = metric
  const has = value != null && value !== ''
  return (
    <div className="card p-3 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-base leading-none">{emoji}</span>
        {metric.trend && (
          <span className="text-sm leading-none font-bold" style={{ color: trendColor(metric) }}>
            {TREND_ARROW[metric.trend]}
          </span>
        )}
      </div>
      <p className="text-[10px] uppercase tracking-wider leading-tight" style={{ color:'var(--color-muted)' }}>
        {label}
      </p>
      <p className="text-base font-bold tabular-nums leading-tight"
        style={{ color: has ? 'var(--color-text)' : 'var(--color-muted)' }}>
        {has ? value : '—'}
        {has && unit && <span className="text-[10px] font-normal ml-0.5" style={{ color:'var(--color-muted)' }}>{unit}</span>}
      </p>
      <div className="text-[9px]" style={{ color:'var(--color-muted)' }}>
        {target != null && <span>target {target}{unit}{week_avg != null ? ' · ' : ''}</span>}
        {week_avg != null && <span>avg {week_avg}{unit}</span>}
      </div>
    </div>
  )
}

export default function VitalsSheet({ open, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (!open) return
    setData(null); setError(null); setClosing(false)
    fetch('/api/vitals')
      .then(r => r.ok ? r.json() : Promise.reject(`HTTP ${r.status}`))
      .then(setData)
      .catch(e => setError(typeof e === 'string' ? e : e.message))
  }, [open])

  const handleClose = () => { setClosing(true); setTimeout(onClose, 250) }

  if (!open) return null

  return (
    <>
      <div className={`fixed inset-0 z-40 transition-opacity duration-200 ${closing?'opacity-0':'opacity-100'}`}
        style={{ background:'rgba(0,0,0,0.7)' }} onClick={handleClose} />
      <div className={`fixed inset-x-0 bottom-0 top-12 z-50 rounded-t-3xl overflow-y-auto sheet ${closing?'sheet-out':''}`}
        style={{ background:'var(--color-surface)', borderTop:'1px solid var(--color-border)' }}>
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full"
          style={{ background:'var(--color-border)' }} />

        <div className="px-4 pt-8 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest" style={{color:'var(--color-accent)'}}>
                All vitals
              </p>
              <h2 className="text-2xl font-black tracking-tight">Everything your Watch sees</h2>
            </div>
            <button onClick={handleClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
              style={{ background:'var(--color-bg)', color:'var(--color-muted)' }}>✕</button>
          </div>

          {error && (
            <div className="card p-3 text-xs" style={{ color:'var(--color-danger)' }}>
              Couldn't load vitals — {error}
            </div>
          )}

          {!data && !error && (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="card h-24 animate-pulse" />
              ))}
            </div>
          )}

          {data && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {data.metrics.map(m => <VitalTile key={m.id} metric={m} />)}
              </div>
              <p className="text-[10px] mt-4 leading-relaxed" style={{ color:'var(--color-muted)' }}>
                Trend arrows compare today vs your 7-day average (±5% threshold).
                Green = movement in the good direction, red = the wrong direction.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  )
}
