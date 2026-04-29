import { describe, it, expect } from 'vitest'
import { getDayNumber, getPhase, getPhaseForDay, PROGRESSION_LADDERS } from './phases.js'

describe('getDayNumber', () => {
  it('returns 1 on start date', () => {
    expect(getDayNumber('2026-04-29', '2026-04-29')).toBe(1)
  })
  it('returns 14 two weeks in', () => {
    expect(getDayNumber('2026-04-29', '2026-05-12')).toBe(14)
  })
  it('returns 60 on last day', () => {
    expect(getDayNumber('2026-04-29', '2026-06-27')).toBe(60)
  })
})

describe('getPhase', () => {
  it('phase 1 for days 1-14', () => {
    expect(getPhase(1).number).toBe(1)
    expect(getPhase(14).number).toBe(1)
  })
  it('phase 2 for days 15-42', () => {
    expect(getPhase(15).number).toBe(2)
    expect(getPhase(42).number).toBe(2)
  })
  it('phase 3 for days 43-60', () => {
    expect(getPhase(43).number).toBe(3)
    expect(getPhase(60).number).toBe(3)
  })
})

describe('getPhaseForDay', () => {
  it('returns correct bed time for phase 1', () => {
    expect(getPhaseForDay(1).bedTime).toBe('23:30')
  })
  it('returns correct bed time for phase 2+', () => {
    expect(getPhaseForDay(15).bedTime).toBe('23:00')
  })
  it('returns correct workout frequency for phase 1', () => {
    expect(getPhaseForDay(1).workoutsPerWeek).toBe(3)
  })
  it('returns correct workout frequency for phase 3', () => {
    expect(getPhaseForDay(43).workoutsPerWeek).toBe(4)
  })
})

describe('PROGRESSION_LADDERS', () => {
  it('has push progression', () => {
    expect(PROGRESSION_LADDERS.push.length).toBeGreaterThan(0)
  })
  it('each exercise has name and cue', () => {
    Object.values(PROGRESSION_LADDERS).flat().forEach(ex => {
      expect(ex.name).toBeTruthy()
      expect(ex.cue).toBeTruthy()
      expect(ex.phase).toBeGreaterThanOrEqual(1)
    })
  })
})
