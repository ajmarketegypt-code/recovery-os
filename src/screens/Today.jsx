import { useState, useEffect } from 'react'
import { useHealth } from '../hooks/useHealth.js'
import { usePullToRefresh } from '../hooks/usePullToRefresh.js'
import { useOnline } from '../hooks/useOnline.js'
import PullIndicator from '../components/ui/PullIndicator.jsx'
import StatusBanner from '../components/ui/StatusBanner.jsx'
import StreakStrip from '../components/ui/StreakStrip.jsx'
import CheckIn from '../components/ui/CheckIn.jsx'
import WeightCard from '../components/ui/WeightCard.jsx'
import { PILLAR_CONFIGS } from '../components/pillars/pillarConfigs.js'
import Pillar from '../components/pillars/Pillar.jsx'
import PillarDetail from '../components/pillars/PillarDetail.jsx'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const greeting = () => { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening' }

function BriefCard({ brief }) {
  const [expanded, setExpanded] = useState(false)
  if (brief?.skipped) {
    return (
      <div className="card p-4">
        <p className="text-sm font-semibold mb-1">Daily brief</p>
        <p className="text-xs leading-relaxed" style={{color:'var(--color-muted)'}}>
          {brief.message || 'Connect Apple Watch to get your daily brief.'}
        </p>
      </div>
    )
  }
  if (!brief?.headline) return <div className="card h-24 animate-pulse" />
  const rc = {
    'Train hard':       'var(--color-accent)',
    'Train as planned': 'var(--color-accent)',
    'Light only':       'var(--color-warning)',
    'Rest':             'var(--color-danger)',
  }[brief.recommendation] || 'var(--color-warning)'
  const hasMore = brief.bullets?.length > 0
  return (
    <div className="card p-4 space-y-2 active:opacity-90 transition-opacity"
      onClick={() => hasMore && setExpanded(e => !e)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-bold leading-tight">{brief.headline}</p>
        <span className="text-xs px-2.5 py-1 rounded-full shrink-0 font-semibold whitespace-nowrap"
          style={{ background: rc+'20', color: rc }}>{brief.recommendation}</span>
      </div>
      {brief.sub && (
        <p className="text-sm leading-snug" style={{ color:'var(--color-muted)' }}>{brief.sub}</p>
      )}
      {brief.actions?.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {brief.actions.map((a, i) => (
            <div key={i} className="flex items-center gap-2 text-xs leading-snug">
              <span style={{ color: rc, fontSize: '14px', lineHeight: 1 }}>→</span>
              <span style={{ color: 'var(--color-text)' }}>{a}</span>
            </div>
          ))}
        </div>
      )}
      {hasMore && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] uppercase tracking-wider" style={{ color:'var(--color-muted)' }}>
            {expanded ? 'Tap to hide' : 'Tap for why'}
          </span>
          <span className="text-xs" style={{ color:'var(--color-muted)' }}>{expanded ? '▲' : '▼'}</span>
        </div>
      )}
      {expanded && hasMore && (
        <ul className="space-y-1.5 pt-1 border-t" style={{ borderColor:'var(--color-border)' }}>
          {brief.bullets.map((b, i) => (
            <li key={i} className="text-xs flex gap-2 pt-1.5" style={{ color:'var(--color-muted)' }}>
              <span style={{ color:'var(--color-accent)' }}>•</span>{b}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Today({ active = true }) {
  const { data, brief, weekly, error, refresh } = useHealth(active)
  const { pullY, refreshing, threshold } = usePullToRefresh(refresh, active)
  const online = useOnline()
  const [detail, setDetail] = useState(null)
  const [tags, setTags] = useState([])
  const [feeling, setFeeling] = useState(null)
  useEffect(() => { if (data?.tags) setTags(data.tags) }, [data?.tags])
  useEffect(() => { if (data?.subjective?.feeling != null) setFeeling(data.subjective.feeling) }, [data?.subjective?.feeling])

  const log = (type, payload) => fetch('/api/today-log', {
    method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({ type, data: payload }),
  })

  const name = localStorage.getItem('health_name') || 'there'
  const d = new Date()

  return (
    <div className="px-4 pt-14 pb-4 space-y-5 max-w-md mx-auto"
      style={{ transform: `translateY(${pullY * 0.5}px)`, transition: pullY === 0 ? 'transform 0.2s' : 'none' }}>
      <PullIndicator pullY={pullY} refreshing={refreshing} threshold={threshold} />
      <StatusBanner message={!online ? "You're offline" : (error ? "Couldn't reach the server" : null)}
        tone={!online ? 'warning' : 'danger'} />

      <div className="space-y-0.5">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{color:'var(--color-accent)'}}>
          {DAYS[d.getDay()]} · {MONTHS[d.getMonth()]} {d.getDate()}
        </p>
        <h1 className="text-3xl font-black tracking-tight">{greeting()}, {name}</h1>
      </div>

      <BriefCard brief={brief} />

      <div className="grid grid-cols-3 gap-3">
        {PILLAR_CONFIGS.map(cfg => (
          <Pillar key={cfg.id} config={cfg} data={data?.[cfg.id]} weekly={weekly} onTap={setDetail} />
        ))}
      </div>

      <StreakStrip streaks={weekly?.streaks} weekly={weekly?.week} />

      {/* Raw lifestyle metrics shown as chips so they're not confused with pillar scores */}
      {(data?.movement?.steps != null || data?.daylight?.minutes != null || data?.mindful?.minutes != null) && (
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {data?.movement?.steps != null && (
            <div className="card shrink-0 px-3 py-2.5 flex items-center gap-2.5 min-w-[100px]">
              <span className="text-base">🚶</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider" style={{color:'var(--color-muted)'}}>Steps</p>
                <p className="text-sm font-bold leading-tight tabular-nums">{data.movement.steps.toLocaleString()}</p>
              </div>
            </div>
          )}
          {data?.daylight?.minutes != null && (
            <div className="card shrink-0 px-3 py-2.5 flex items-center gap-2.5 min-w-[100px]">
              <span className="text-base">☀️</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider" style={{color:'var(--color-muted)'}}>Daylight</p>
                <p className="text-sm font-bold leading-tight">{data.daylight.minutes}<span className="text-xs font-normal ml-0.5" style={{color:'var(--color-muted)'}}>min</span></p>
              </div>
            </div>
          )}
          {data?.mindful?.minutes != null && (
            <div className="card shrink-0 px-3 py-2.5 flex items-center gap-2.5 min-w-[100px]">
              <span className="text-base">🧘</span>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider" style={{color:'var(--color-muted)'}}>Mindful</p>
                <p className="text-sm font-bold leading-tight">{data.mindful.minutes}<span className="text-xs font-normal ml-0.5" style={{color:'var(--color-muted)'}}>min</span></p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unified daily check-in (replaces the old Log Today section) */}
      <CheckIn
        feeling={feeling}
        tags={tags}
        onFeelingChange={v => { setFeeling(v); log('subjective', { feeling: v }) }}
        onTagsChange={next => { setTags(next); log('tags', next) }}
      />

      {/* Weight with rolling avg + recomp pace */}
      <WeightCard
        weight={weekly?.weight}
        onLog={kg => { log('weight', { kg }); refresh() }}
      />

      {detail && <PillarDetail pillarId={detail} data={data?.[detail]} onClose={() => setDetail(null)} />}
    </div>
  )
}
