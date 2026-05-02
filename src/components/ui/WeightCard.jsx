import { useState } from 'react'

const TONE_COLOR = {
  good:    'var(--color-accent)',
  warning: 'var(--color-warning)',
  danger:  'var(--color-danger)',
}

function MiniChart({ series, color }) {
  if (!series || series.length < 2) return null
  const values = series.map(p => p.kg)
  const min = Math.min(...values), max = Math.max(...values)
  const range = Math.max(0.5, max - min)
  const w = 280, h = 36
  const points = series.map((p, i) => {
    const x = (i / (series.length - 1)) * w
    const y = h - ((p.kg - min) / range) * h
    return [x, y]
  })
  const path = points.map(([x,y], i) => `${i===0?'M':'L'} ${x},${y}`).join(' ')
  const last = points[points.length - 1]
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full block" style={{ height: h }}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  )
}

export default function WeightCard({ weight, onLog }) {
  const [input, setInput] = useState('')
  const submit = () => {
    const kg = parseFloat(input)
    if (kg > 0) { onLog(kg); setInput('') }
  }

  const today = weight?.today_kg
  const avg7  = weight?.avg7d
  const delta = weight?.week_delta_kg
  const pace  = weight?.pace
  const paceColor = pace ? TONE_COLOR[pace.tone] : 'var(--color-muted)'

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">Weight</p>
        {today != null && (
          <p className="text-2xl font-black tabular-nums leading-none">
            {today}<span className="text-xs font-normal ml-1" style={{ color:'var(--color-muted)' }}>kg</span>
          </p>
        )}
      </div>

      {/* Trend line + 7-day avg + week delta */}
      {weight?.series?.length >= 2 && (
        <>
          <MiniChart series={weight.series} color={paceColor} />
          <div className="flex items-baseline justify-between text-xs">
            <span style={{ color:'var(--color-muted)' }}>7-day avg</span>
            <span className="font-semibold tabular-nums" style={{ color:'var(--color-text)' }}>
              {avg7}<span className="font-normal ml-0.5" style={{ color:'var(--color-muted)' }}>kg</span>
              {delta != null && (
                <span className="ml-2" style={{ color: paceColor }}>
                  {delta > 0 ? '+' : ''}{delta}kg/wk
                </span>
              )}
            </span>
          </div>
        </>
      )}

      {/* Recomp pace label */}
      {pace && (
        <div className="rounded-xl px-3 py-2 text-xs"
          style={{ background: paceColor + '15', border: `1px solid ${paceColor}33` }}>
          <p className="font-semibold" style={{ color: paceColor }}>{pace.label}</p>
          <p className="mt-0.5" style={{ color:'var(--color-muted)' }}>{pace.hint}</p>
        </div>
      )}

      {/* Empty state — invite first weigh-in with context */}
      {today == null && (!weight?.series || weight.series.length === 0) && (
        <p className="text-xs leading-relaxed" style={{ color:'var(--color-muted)' }}>
          Log your weight 3-4× this week (after waking, before food) so we can show
          fat-vs-muscle pace.
        </p>
      )}

      {/* Inline log */}
      <div className="flex items-center gap-2">
        <input type="number" inputMode="decimal" placeholder="Log today's weight" value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          onBlur={submit}
          className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background:'var(--color-bg)', color:'var(--color-text)', border:'1px solid var(--color-border)' }} />
        <span className="text-sm" style={{ color:'var(--color-muted)' }}>kg</span>
      </div>
    </div>
  )
}
