export default function Sparkline({ data, width=320, height=120, color='#10b981', valueKey='score' }) {
  const values = data.map(d=>d[valueKey]??null)
  const valid = values.filter(v=>v!=null)
  if (valid.length<2) return <div className="h-32 flex items-center justify-center text-sm" style={{color:'var(--color-muted)'}}>Not enough data yet</div>
  const padX=8, padY=8, innerW=width-padX*2, innerH=height-padY*2
  const points = values.map((v,i)=>v==null?null:[padX+(i/(values.length-1))*innerW, padY+(1-v/100)*innerH]).filter(Boolean)
  const polyPts = points.map(p=>p.join(',')).join(' ')
  const area = `M ${points[0][0]},${padY+innerH} ${points.map(p=>`L ${p[0]},${p[1]}`).join(' ')} L ${points[points.length-1][0]},${padY+innerH} Z`
  const avg = Math.round(valid.reduce((a,b)=>a+b,0)/valid.length)
  const gid = `g${color.replace('#','')}`
  return (
    <div>
      <svg width={width} height={height} className="w-full">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <polyline points={polyPts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={color} />)}
      </svg>
      <p className="text-xs text-center mt-1" style={{color:'var(--color-muted)'}}>30-day avg: <span style={{color:'var(--color-text)'}}>{avg}</span></p>
    </div>
  )
}
