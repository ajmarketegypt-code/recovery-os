import { useState, useEffect } from 'react'
import { useHealth } from '../hooks/useHealth.js'
import { usePullToRefresh } from '../hooks/usePullToRefresh.js'
import { PILLAR_CONFIGS } from '../components/pillars/pillarConfigs.js'
import Pillar from '../components/pillars/Pillar.jsx'
import PillarDetail from '../components/pillars/PillarDetail.jsx'
import ChipSelect from '../components/ui/ChipSelect.jsx'
import MoodPicker from '../components/ui/MoodPicker.jsx'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const greeting = () => { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening' }

const TAG_OPTIONS = [
  {id:'alcohol',emoji:'🍷',label:'Alcohol'},{id:'late_meal',emoji:'🌙',label:'Late meal'},
  {id:'high_stress',emoji:'😰',label:'High stress'},{id:'travel',emoji:'✈️',label:'Travel'},
  {id:'poor_sleep_intent',emoji:'😴',label:'Late night'},
]

function BriefCard({ brief }) {
  if (!brief?.headline) return <div className="card h-28 animate-pulse" />
  const rc = { 'Train hard':'var(--color-accent)', 'Rest':'var(--color-danger)' }[brief.recommendation]||'var(--color-warning)'
  return (
    <div className="card p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold leading-snug">{brief.headline}</p>
        <span className="text-xs px-2.5 py-1 rounded-full shrink-0 font-semibold"
              style={{background:rc+'20',color:rc}}>{brief.recommendation}</span>
      </div>
      <ul className="space-y-1.5">
        {brief.bullets?.map((b,i) => (
          <li key={i} className="text-xs flex gap-2" style={{color:'var(--color-muted)'}}>
            <span style={{color:'var(--color-accent)'}}>•</span>{b}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Today() {
  const { data, brief, refresh } = useHealth()
  const refreshing = usePullToRefresh(refresh)
  const [detail, setDetail] = useState(null)
  const [tags, setTags] = useState([])
  useEffect(() => { if (data?.tags) setTags(data.tags) }, [data?.tags])
  const [mood, setMood] = useState(null)
  const [feltEnergy, setFeltEnergy] = useState(null)
  const [weight, setWeight] = useState('')
  const log = (type, payload) => fetch('/api/today-log',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type,data:payload})})
  const name = localStorage.getItem('health_name') || 'there'
  const d = new Date()
  return (
    <div className="px-4 pt-14 pb-4 space-y-5 max-w-md mx-auto">
      {refreshing && (
        <div className="flex justify-center py-1">
          <div className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{borderColor:'var(--color-accent)',borderTopColor:'transparent'}} />
        </div>
      )}
      <div className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{color:'var(--color-accent)'}}>
          {DAYS[d.getDay()]} · {MONTHS[d.getMonth()]} {d.getDate()}
        </p>
        <h1 className="text-3xl font-black tracking-tight">{greeting()}, {name}</h1>
      </div>
      <BriefCard brief={brief} />
      <div className="grid grid-cols-3 gap-3">
        {PILLAR_CONFIGS.map(cfg => <Pillar key={cfg.id} config={cfg} data={data?.[cfg.id]} onTap={setDetail} />)}
      </div>
      <section className="space-y-3 pt-1">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{color:'var(--color-muted)'}}>Log Today</p>
        <ChipSelect options={TAG_OPTIONS} selected={tags} onChange={next=>{setTags(next);log('tags',next)}} />
        <MoodPicker mood={mood} feltEnergy={feltEnergy}
          onMoodChange={v=>{setMood(v);log('subjective',{mood:v})}}
          onEnergyChange={v=>{setFeltEnergy(v);log('subjective',{felt_energy:v})}} />
        <div className="flex items-center gap-2">
          <input type="number" placeholder="Weight" value={weight} onChange={e=>setWeight(e.target.value)}
            onBlur={()=>weight&&log('weight',{kg:parseFloat(weight)})}
            className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{background:'var(--color-surface)',color:'var(--color-text)',border:'1px solid var(--color-border)'}} />
          <span className="text-sm" style={{color:'var(--color-muted)'}}>kg</span>
        </div>
      </section>
      {detail && <PillarDetail pillarId={detail} data={data?.[detail]} onClose={() => setDetail(null)} />}
    </div>
  )
}
