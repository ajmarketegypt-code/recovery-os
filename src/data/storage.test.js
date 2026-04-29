import { describe, it, expect, beforeEach } from 'vitest'
import {
  getJourneyStart, setJourneyStart,
  getDayLog, setDayLog,
  getSettings, setSettings,
  getCallLog, incrementCallLog,
  getBaselines, setBaselines,
} from './storage.js'

beforeEach(() => localStorage.clear())

describe('journey start', () => {
  it('returns null when not set', () => {
    expect(getJourneyStart()).toBeNull()
  })
  it('stores and retrieves ISO date string', () => {
    setJourneyStart('2026-04-29')
    expect(getJourneyStart()).toBe('2026-04-29')
  })
})

describe('day log', () => {
  it('returns default empty log for unknown day', () => {
    expect(getDayLog('2026-04-29')).toEqual({
      energy: null, sleepQuality: null, workoutDone: false,
      effortRating: null, anchorDone: false, protocol: null,
    })
  })
  it('stores and retrieves day log', () => {
    setDayLog('2026-04-29', { energy: 4, workoutDone: true })
    expect(getDayLog('2026-04-29').energy).toBe(4)
    expect(getDayLog('2026-04-29').workoutDone).toBe(true)
  })
  it('merges partial updates', () => {
    setDayLog('2026-04-29', { energy: 3 })
    setDayLog('2026-04-29', { sleepQuality: 4 })
    expect(getDayLog('2026-04-29').energy).toBe(3)
    expect(getDayLog('2026-04-29').sleepQuality).toBe(4)
  })
})

describe('settings', () => {
  it('returns defaults when not set', () => {
    expect(getSettings().bedTime).toBe('23:30')
    expect(getSettings().wakeTime).toBe('07:00')
  })
  it('stores and retrieves settings', () => {
    setSettings({ bedTime: '23:00' })
    expect(getSettings().bedTime).toBe('23:00')
  })
})

describe('call log', () => {
  it('returns zero for today when not set', () => {
    expect(getCallLog('2026-04-29')).toBe(0)
  })
  it('increments call count', () => {
    incrementCallLog('2026-04-29')
    incrementCallLog('2026-04-29')
    expect(getCallLog('2026-04-29')).toBe(2)
  })
  it('resets count for different date', () => {
    incrementCallLog('2026-04-29')
    expect(getCallLog('2026-04-30')).toBe(0)
  })
})

describe('baselines', () => {
  it('returns null baselines when not set', () => {
    expect(getBaselines().pushUpMax).toBeNull()
  })
  it('stores and retrieves baselines', () => {
    setBaselines({ pushUpMax: 15, plankSec: 45, treadmillNote: '0% 4km/h' })
    expect(getBaselines().pushUpMax).toBe(15)
  })
})
