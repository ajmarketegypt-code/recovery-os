import { useState, useRef } from 'react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const fmtDate = iso => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

export default function Sparkline({ data, height = 140, color = '#10b981', valueKey = 'score' }) {
  const [activeIdx, setActiveIdx] = useState(null)
  const svgRef = useRef(null)

  const series = (data ?? []).map(d => ({ date: d?.date, value: d?.[valueKey] ?? null }))
  const validValues = series.map(s => s.value).filter(v => v != null)

  if (validValues.length < 2) {
    return (
      <div className="rounded-xl flex items-center justify-center text-xs"
        style={{ height, background:'rgba(255,255,255,0.03)', color:'var(--color-muted)' }}>
        Not enough data yet
      </div>
    )
  }

  // Y scale: auto-fit with 10% padding above/below the data range
  const dataMin = Math.min(...validValues)
  const dataMax = Math.max(...validValues)
  const range = Math.max(1, dataMax - dataMin)
  const pad = range * 0.15
  const yMin = Math.max(0, dataMin - pad)
  const yMax = dataMax + pad
  const ySpan = yMax - yMin

  const width = 320
  const padL = 28, padR = 8, padT = 12, padB = 22
  const innerW = width - padL - padR
  const innerH = height - padT - padB

  const xAt = i => padL + (series.length === 1 ? innerW/2 : (i / (series.length - 1)) * innerW)
  const yAt = v => padT + (1 - (v - yMin) / ySpan) * innerH

  const points = series
    .map((s, i) => s.value == null ? null : { i, x: xAt(i), y: yAt(s.value), ...s })
    .filter(Boolean)

  const linePath = points.map((p, i) => `${i===0?'M':'L'} ${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length-1].x},${padT+innerH} L ${points[0].x},${padT+innerH} Z`

  const gid = `g${color.replace('#','')}_${Math.random().toString(36).slice(2,7)}`

  // Find min/max points for markers
  const minPoint = points.reduce((a,b) => b.value < a.value ? b : a, points[0])
  const maxPoint = points.reduce((a,b) => b.value > a.value ? b : a, points[0])

  // Date labels: show first, middle, last
  const dateLabels = series.length > 0 ? [
    { i: 0, label: fmtDate(series[0]?.date) },
    { i: Math.floor(series.length / 2), label: fmtDate(series[Math.floor(series.length / 2)]?.date) },
    { i: series.length - 1, label: fmtDate(series[series.length - 1]?.date) },
  ] : []

  // Touch / mouse handler
  const handleMove = e => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const px = ((clientX - rect.left) / rect.width) * width
    // Find nearest point
    let nearest = 0, bestDist = Infinity
    points.forEach(p => {
      const d = Math.abs(p.x - px)
      if (d < bestDist) { bestDist = d; nearest = p.i }
    })
    setActiveIdx(nearest)
  }

  const active = activeIdx != null ? points.find(p => p.i === activeIdx) : null
  const fmtValue = v => Number.isInteger(v) ? v : v.toFixed(1)

  return (
    <div className="select-none">
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full block touch-none"
        onTouchStart={handleMove} onTouchMove={handleMove} onTouchEnd={()=>setActiveIdx(null)}
        onMouseMove={handleMove} onMouseLeave={()=>setActiveIdx(null)}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Min/max horizontal reference lines */}
        <line x1={padL} y1={yAt(dataMax)} x2={padL+innerW} y2={yAt(dataMax)}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="2 4" />
        <line x1={padL} y1={yAt(dataMin)} x2={padL+innerW} y2={yAt(dataMin)}
          stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="2 4" />

        {/* Y-axis labels */}
        <text x={padL-4} y={yAt(dataMax)+3} fontSize="9" fill="var(--color-muted)" textAnchor="end">{fmtValue(dataMax)}</text>
        <text x={padL-4} y={yAt(dataMin)+3} fontSize="9" fill="var(--color-muted)" textAnchor="end">{fmtValue(dataMin)}</text>

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gid})`} />

        {/* Line */}
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* All data points */}
        {points.map(p => (
          <circle key={p.i} cx={p.x} cy={p.y} r={p.i === activeIdx ? 4 : 2} fill={color}
            opacity={activeIdx == null || p.i === activeIdx ? 1 : 0.5} />
        ))}

        {/* Highlight max + min points */}
        {!active && (
          <>
            <circle cx={maxPoint.x} cy={maxPoint.y} r="3" fill={color} stroke="var(--color-bg)" strokeWidth="1.5" />
            <circle cx={minPoint.x} cy={minPoint.y} r="3" fill={color} stroke="var(--color-bg)" strokeWidth="1.5" opacity="0.6" />
          </>
        )}

        {/* Active vertical line + tooltip */}
        {active && (
          <>
            <line x1={active.x} y1={padT} x2={active.x} y2={padT+innerH}
              stroke={color} strokeWidth="1" opacity="0.4" strokeDasharray="2 3" />
            <circle cx={active.x} cy={active.y} r="5" fill={color} stroke="var(--color-bg)" strokeWidth="2" />
          </>
        )}

        {/* X-axis date labels */}
        {dateLabels.map((d, idx) => (
          <text key={idx} x={xAt(d.i)} y={height - 6} fontSize="9" fill="var(--color-muted)"
            textAnchor={idx === 0 ? 'start' : idx === dateLabels.length - 1 ? 'end' : 'middle'}>
            {d.label}
          </text>
        ))}
      </svg>

      {/* Active value readout (above chart, doesn't displace layout) */}
      {active && (
        <div className="flex justify-between items-center text-xs mt-1 px-1">
          <span style={{color:'var(--color-muted)'}}>{fmtDate(active.date)}</span>
          <span className="font-bold tabular-nums" style={{color}}>{fmtValue(active.value)}</span>
        </div>
      )}
    </div>
  )
}
