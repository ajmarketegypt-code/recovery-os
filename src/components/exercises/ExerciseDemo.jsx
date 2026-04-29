import { useState, useEffect } from 'react'

// Maps app exercise names → free-exercise-db folder slugs
const SLUG_MAP = {
  'Glute Bridge': 'Glute_Bridge',
  'Single-Leg Bridge': 'Single_Leg_Glute_Bridge',
  'Hip Thrust': 'Barbell_Hip_Thrust',
  'Push-up': 'Pushups',
  'Incline Push-up': 'Incline_Push-Up',
  'Diamond Push-up': 'Push-Ups_Close_Triceps_Position',
  'Archer Push-up': null,
  'Bodyweight Squat': 'Bodyweight_Squat',
  'Split Squat': 'Split_Squats',
  'Bulgarian Split Squat': null,
  'Pistol Squat': 'Pistol_Squat',
  'Towel Door Row': null,
  'Inverted Row': 'Inverted_Row',
  'Dead Bug': 'Dead_Bug',
  'Plank': 'Plank',
  'Hollow Body Hold': null,
  'L-Sit': 'L-sit',
  'Single-Leg RDL': 'Romanian_Deadlift_-_One_Leg',
}

const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises'

const FALLBACK_DATA = {
  'Archer Push-up': {
    steps: [
      'Wide hand position — much wider than regular push-up',
      'As you lower, shift weight toward one arm',
      'That arm bends; the other stays nearly straight',
      'Press back up and alternate sides',
    ],
    tip: 'The straight arm provides stability only — all load is on the bent arm',
  },
  'Bulgarian Split Squat': {
    steps: [
      'Rear foot elevated on a bench or couch behind you',
      'Front foot far enough that your shin stays vertical when you dip',
      'Drop your rear knee toward the floor — controlled and slow',
      'Drive through your front heel to stand',
    ],
    tip: 'This will feel unstable at first — hold something for balance while learning',
  },
  'Towel Door Row': {
    steps: [
      'Loop a towel around a door handle — hold both ends',
      'Lean back with straight arms, feet close to the door',
      'Pull your chest toward the door, elbows drive back',
      'Lower back to straight arms under control',
    ],
    tip: 'The more you lean back, the harder it gets — adjust your foot position',
  },
  'Hollow Body Hold': {
    steps: [
      'Lie on your back, press your lower back into the floor',
      'Raise your arms overhead, legs out straight and low',
      'Hold this position — the lower your legs, the harder it is',
      'If form breaks, raise your legs higher',
    ],
    tip: 'The lower back must stay glued to the floor — that\'s the whole exercise',
  },
}

const DEFAULT_FALLBACK = {
  steps: [
    'Set up in the starting position',
    'Perform the movement with control',
    'Return to start and repeat',
  ],
  tip: 'Focus on the muscle working — slow is better than fast',
}

function TextFallback({ name }) {
  const data = FALLBACK_DATA[name] ?? DEFAULT_FALLBACK
  return (
    <div className="px-4 py-3 space-y-3">
      {data.steps.map((step, i) => (
        <div key={i} className="flex gap-3 items-start">
          <div className="w-5 h-5 rounded-full bg-surface border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-[10px] font-bold text-primary">{i + 1}</span>
          </div>
          <p className="text-textPrimary text-sm leading-snug">{step}</p>
        </div>
      ))}
      <div className="bg-surface rounded-xl px-3 py-2.5 border border-border mt-2">
        <span className="text-primary text-[10px] font-bold uppercase tracking-wider">Key tip  </span>
        <span className="text-textMuted text-xs leading-snug">{data.tip}</span>
      </div>
    </div>
  )
}

export default function ExerciseDemo({ name }) {
  const slug = SLUG_MAP[name]
  const [frame, setFrame] = useState(0)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    if (!slug || errored) return
    const id = setInterval(() => setFrame(f => (f === 0 ? 1 : 0)), 750)
    return () => clearInterval(id)
  }, [slug, errored])

  if (!slug || errored) {
    return (
      <div className="w-full rounded-xl overflow-hidden bg-base border border-border">
        <TextFallback name={name} />
      </div>
    )
  }

  const url0 = `${BASE}/${slug}/0.jpg`
  const url1 = `${BASE}/${slug}/1.jpg`

  return (
    <div className="w-full rounded-xl overflow-hidden bg-base border border-border">
      <div className="relative w-full aspect-video bg-black">
        {/* frame 0 */}
        <img
          src={url0}
          alt={`${name} start position`}
          onError={() => setErrored(true)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: frame === 0 ? 1 : 0 }}
        />
        {/* frame 1 */}
        <img
          src={url1}
          alt={`${name} end position`}
          onError={() => setErrored(true)}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
          style={{ opacity: frame === 1 ? 1 : 0 }}
        />
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full uppercase tracking-widest">
          {frame === 0 ? 'start' : 'end'}
        </div>
      </div>
    </div>
  )
}
