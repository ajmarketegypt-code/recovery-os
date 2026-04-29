export const PHASES = [
  {
    number: 1, name: 'Reset', days: [1, 14],
    bedTime: '23:30', wakeTime: '07:00',
    workoutsPerWeek: 3,
    overload: 'Controlled tempo (3-1-3)',
    description: 'Rebuild the sleep anchor. Joint prep. Habit formation.',
  },
  {
    number: 2, name: 'Build', days: [15, 42],
    bedTime: '23:00', wakeTime: '07:00',
    workoutsPerWeek: 3,
    overload: 'Harder movement variants',
    description: 'Step up intensity. Treadmill zone-2 on rest days.',
  },
  {
    number: 3, name: 'Groove', days: [43, 60],
    bedTime: '23:00', wakeTime: '07:00',
    workoutsPerWeek: 4,
    overload: 'AMRAP finishers, shorter rest',
    description: 'Consolidate strength. Push the ceiling.',
  },
]

export const getDayNumber = (startDate, today) => {
  const start = new Date(startDate)
  const current = new Date(today)
  const diff = Math.floor((current - start) / (1000 * 60 * 60 * 24))
  return diff + 1
}

export const getPhase = (dayNumber) =>
  PHASES.find(p => dayNumber >= p.days[0] && dayNumber <= p.days[1]) ?? PHASES[2]

export const getPhaseForDay = (dayNumber) => getPhase(dayNumber)

export const PROGRESSION_LADDERS = {
  push: [
    { name: 'Incline Push-up', cue: 'Keep body straight, hands shoulder-width', phase: 1, svgKey: 'incline_pushup' },
    { name: 'Push-up', cue: 'Elbows at 45°, slow the descent', phase: 1, svgKey: 'pushup' },
    { name: 'Diamond Push-up', cue: 'Elbows track back, thumbs nearly touching', phase: 2, svgKey: 'diamond_pushup' },
    { name: 'Archer Push-up', cue: 'Load one arm, keep hips square', phase: 2, svgKey: 'archer_pushup' },
    { name: 'One-Arm Push-up', cue: 'Stagger feet wide, brace everything', phase: 3, svgKey: 'onearm_pushup' },
  ],
  squat: [
    { name: 'Bodyweight Squat', cue: 'Chest up, knees track toes', phase: 1, svgKey: 'squat' },
    { name: 'Split Squat', cue: 'Vertical shin, drop straight down', phase: 1, svgKey: 'split_squat' },
    { name: 'Bulgarian Split Squat', cue: 'Rear foot elevated, drive through front heel', phase: 2, svgKey: 'bulgarian' },
    { name: 'Pistol Squat', cue: 'Arms forward for balance, sit deep', phase: 3, svgKey: 'pistol' },
  ],
  hinge: [
    { name: 'Glute Bridge', cue: 'Drive hips to ceiling, squeeze at top', phase: 1, svgKey: 'glute_bridge' },
    { name: 'Single-Leg Bridge', cue: 'One leg raised, keep hips level', phase: 1, svgKey: 'singleleg_bridge' },
    { name: 'Hip Thrust', cue: 'Shoulders on surface, full hip extension', phase: 2, svgKey: 'hip_thrust' },
    { name: 'Single-Leg RDL', cue: 'Hinge at hip, back flat, feel the hamstring', phase: 2, svgKey: 'singleleg_rdl' },
  ],
  pull: [
    { name: 'Towel Door Row', cue: 'Lean back, pull chest to hands', phase: 1, svgKey: 'towel_row' },
    { name: 'Inverted Row', cue: 'Under table, body straight, pull shoulder blades', phase: 2, svgKey: 'inverted_row' },
  ],
  core: [
    { name: 'Dead Bug', cue: 'Lower back pressed flat, move opposite limbs slowly', phase: 1, svgKey: 'dead_bug' },
    { name: 'Plank', cue: 'Hips level, squeeze glutes, breathe', phase: 1, svgKey: 'plank' },
    { name: 'Hollow Body Hold', cue: 'Lower back on floor, arms overhead, legs low', phase: 2, svgKey: 'hollow_body' },
    { name: 'L-Sit', cue: 'Depress shoulders fully, legs parallel to floor', phase: 3, svgKey: 'lsit' },
  ],
}
