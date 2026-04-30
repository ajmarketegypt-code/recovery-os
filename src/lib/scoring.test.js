// src/lib/scoring.test.js
import { describe, it, expect } from 'vitest'
import { scoreSleep, scoreMovement, scoreStrength, scoreEnergy, clamp, linearScale } from './scoring.js'

describe('clamp', () => {
  it('clamps below min', () => expect(clamp(-5, 0, 100)).toBe(0))
  it('clamps above max', () => expect(clamp(110, 0, 100)).toBe(100))
  it('passes through in range', () => expect(clamp(50, 0, 100)).toBe(50))
})

describe('scoreSleep', () => {
  it('returns 100 for perfect sleep', () => {
    expect(scoreSleep({ total_hours: 8, efficiency: 90, stages: { deep: 1.8, rem: 1.5, core: 3.7, awake: 0 } })).toBe(100)
  })
  it('returns 0 for 4h sleep with 60% efficiency and 5% deep', () => {
    expect(scoreSleep({ total_hours: 4, efficiency: 60, stages: { deep: 0.2, rem: 0.5, core: 3.3, awake: 0 } })).toBe(0)
  })
})

describe('scoreMovement', () => {
  it('returns 100 for all rings complete', () => {
    expect(scoreMovement({ move_pct: 100, exercise_pct: 100, stand_pct: 100 })).toBe(100)
  })
  it('move_pct weights 50%', () => {
    expect(scoreMovement({ move_pct: 100, exercise_pct: 0, stand_pct: 0 })).toBe(50)
  })
})

describe('scoreStrength', () => {
  it('returns 100 at target', () => expect(scoreStrength({ weekly_workouts: 4, target: 4 })).toBe(100))
  it('returns 50 at half target', () => expect(scoreStrength({ weekly_workouts: 2, target: 4 })).toBe(50))
  it('caps at 100', () => expect(scoreStrength({ weekly_workouts: 6, target: 4 })).toBe(100))
})

describe('scoreEnergy', () => {
  it('returns 100 for all 100s', () => {
    expect(scoreEnergy({ sleep_score: 100, hrv_score: 100, movement_score: 100 })).toBe(100)
  })
})
