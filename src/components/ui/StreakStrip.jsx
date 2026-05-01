// Top 1-3 active streaks shown as compact pills below the pillars on Today.
// Encourages compulsive engagement: "don't break the streak" beats "hit a number" every time.
const FIRE = '🔥'
const FLEX = '💪'
const HEART = '❤️'

export default function StreakStrip({ streaks, weekly }) {
  if (!streaks) return null

  const items = []
  if (streaks.sleep_days >= 2)
    items.push({ icon: FIRE, label: `${streaks.sleep_days}-day sleep streak`, color: '#818cf8' })
  if (streaks.workout_weeks >= 1)
    items.push({ icon: FLEX, label: `${streaks.workout_weeks}-wk workout streak`, color: '#fb923c' })
  else if (streaks.workout_days >= 2)
    items.push({ icon: FLEX, label: `${streaks.workout_days}-day workout streak`, color: '#fb923c' })
  if (streaks.hrv_days >= 3)
    items.push({ icon: HEART, label: `${streaks.hrv_days}-day HRV target`, color: '#f87171' })

  // Empty state — show next-target prompt instead of nothing
  if (items.length === 0 && weekly) {
    const sleepGap = (weekly.sleep_target_days ?? 7) - (weekly.sleep_hits ?? 0)
    const workoutGap = (weekly.workout_target ?? 4) - (weekly.workout_days ?? 0)
    return (
      <div className="card p-3 flex items-center gap-2">
        <span className="text-sm">🎯</span>
        <p className="text-xs" style={{ color:'var(--color-muted)' }}>
          {sleepGap > 0 ? `${sleepGap} more nights at sleep target this week` : `${workoutGap} more workouts this week`}
        </p>
      </div>
    )
  }

  return (
    <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
      {items.map((it, i) => (
        <div key={i} className="card shrink-0 px-3 py-2 flex items-center gap-2">
          <span className="text-base">{it.icon}</span>
          <p className="text-xs font-semibold" style={{ color: it.color }}>{it.label}</p>
        </div>
      ))}
    </div>
  )
}
