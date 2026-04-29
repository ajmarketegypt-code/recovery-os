import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useJourney } from './useJourney.js'
import { setJourneyStart, setDayLog } from '../data/storage.js'

beforeEach(() => localStorage.clear())

describe('useJourney', () => {
  it('returns notStarted when no journey start', () => {
    const { result } = renderHook(() => useJourney())
    expect(result.current.notStarted).toBe(true)
  })

  it('returns dayNumber 1 on start date', () => {
    const today = new Date().toISOString().split('T')[0]
    setJourneyStart(today)
    const { result } = renderHook(() => useJourney())
    expect(result.current.dayNumber).toBe(1)
    expect(result.current.notStarted).toBe(false)
  })

  it('returns phase 1 for day 1', () => {
    const today = new Date().toISOString().split('T')[0]
    setJourneyStart(today)
    const { result } = renderHook(() => useJourney())
    expect(result.current.phase.number).toBe(1)
  })

  it('computes streak from consecutive workout days', () => {
    const today = new Date()
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - 3)
    setJourneyStart(startDate.toISOString().split('T')[0])

    const offset = (n) => {
      const d = new Date(today)
      d.setDate(d.getDate() + n)
      return d.toISOString().split('T')[0]
    }
    setDayLog(offset(-2), { workoutDone: true })
    setDayLog(offset(-1), { workoutDone: true })

    const { result } = renderHook(() => useJourney())
    expect(result.current.streak).toBeGreaterThanOrEqual(2)
  })
})
