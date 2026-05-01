// Five daily prayer pills with completion tracking.
// Highlights the next upcoming prayer; tap any to toggle complete.
const PRAYERS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']

function fmt12h(time24) {
  if (!time24) return '—'
  const [h, m] = time24.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function getNextPrayer(times) {
  const now = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  for (const p of PRAYERS) {
    if (!times[p]) continue
    const [h, m] = times[p].split(':').map(Number)
    if (h * 60 + m > nowMin) return p
  }
  return null  // all prayers passed for the day
}

export default function PrayerStrip({ data, onToggle }) {
  if (!data?.times) return null
  const { times, completed = [] } = data
  const next = getNextPrayer(times)
  const allDone = completed.length === 5

  return (
    <div className="card p-3">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color:'var(--color-muted)' }}>
          Prayers
        </p>
        <p className="text-xs tabular-nums font-semibold"
          style={{ color: allDone ? 'var(--color-accent)' : 'var(--color-muted)' }}>
          {completed.length}/5 today{allDone && ' ✓'}
        </p>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {PRAYERS.map(p => {
          const done = completed.includes(p)
          const isNext = p === next
          return (
            <button key={p} onClick={() => onToggle(p)}
              className="flex flex-col items-center py-2 rounded-xl active:scale-95 transition-all"
              style={{
                background: done ? 'var(--color-accent)' : isNext ? '#10b98115' : 'var(--color-bg)',
                color:      done ? 'var(--color-bg)'    : 'var(--color-text)',
                border: `1px solid ${done ? 'var(--color-accent)' : isNext ? '#10b98155' : 'var(--color-border)'}`,
              }}>
              <span className="text-[9px] uppercase tracking-wider"
                style={{ color: done ? 'var(--color-bg)' : 'var(--color-muted)' }}>
                {p}
              </span>
              <span className="text-[10px] font-bold tabular-nums mt-0.5">
                {fmt12h(times[p])}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
