import { useState } from 'react'

const FEELINGS = [
  { value: 1, emoji: '😞', label: 'Drained' },
  { value: 2, emoji: '😕', label: 'Off' },
  { value: 3, emoji: '😐', label: 'OK' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
]

const TAG_OPTIONS = [
  { id:'late_meal',         emoji:'🌙', label:'Late meal' },
  { id:'high_stress',       emoji:'😰', label:'High stress' },
  { id:'travel',            emoji:'✈️', label:'Travel' },
  { id:'poor_sleep_intent', emoji:'😴', label:'Late night' },
  { id:'long_sitting',      emoji:'🪑', label:'Long sitting' },
  { id:'sick',              emoji:'🤒', label:'Sick' },
]

export default function CheckIn({ feeling, tags = [], onFeelingChange, onTagsChange }) {
  const [tagsOpen, setTagsOpen] = useState(tags.length > 0)
  const selected = FEELINGS.find(f => f.value === feeling)
  const toggleTag = id => onTagsChange(tags.includes(id) ? tags.filter(t => t !== id) : [...tags, id])

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold">How do you feel today?</p>
        {selected && (
          <p className="text-xs" style={{ color: 'var(--color-accent)' }}>{selected.label}</p>
        )}
      </div>

      {/* 5-emoji unified mood+energy slider */}
      <div className="flex gap-1">
        {FEELINGS.map(f => {
          const active = feeling === f.value
          return (
            <button key={f.value} onClick={() => onFeelingChange(f.value)}
              className="flex-1 flex flex-col items-center py-2.5 rounded-xl active:scale-95 transition-all"
              style={{
                background: active ? 'var(--color-accent)' : 'var(--color-surface)',
                border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`,
                opacity: feeling != null && !active ? 0.5 : 1,
              }}>
              <span className="text-xl">{f.emoji}</span>
            </button>
          )
        })}
      </div>

      {/* Collapsible context tags */}
      <button onClick={() => setTagsOpen(o => !o)}
        className="text-xs flex items-center gap-1 -mt-1 active:opacity-60"
        style={{ color: 'var(--color-muted)' }}>
        <span className="font-mono text-sm leading-none">{tagsOpen ? '−' : '+'}</span>
        {tags.length > 0
          ? <span style={{ color:'var(--color-text)' }}>{tags.length} context tag{tags.length>1?'s':''}</span>
          : <span>Add context (alcohol, stress, sick…)</span>}
      </button>

      {tagsOpen && (
        <div className="flex flex-wrap gap-2 pt-1">
          {TAG_OPTIONS.map(opt => {
            const active = tags.includes(opt.id)
            return (
              <button key={opt.id} onClick={() => toggleTag(opt.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium active:scale-90 transition-all"
                style={{
                  background: active ? 'var(--color-accent)' : 'var(--color-surface)',
                  color: active ? 'var(--color-bg)' : 'var(--color-muted)',
                  border: `1px solid ${active ? 'var(--color-accent)' : 'var(--color-border)'}`
                }}>
                <span>{opt.emoji}</span>{opt.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
