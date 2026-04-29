import { describe, it, expect, beforeEach } from 'vitest'
import { validateProtocol, buildFallbackProtocol } from './claude.js'

beforeEach(() => localStorage.clear())

describe('validateProtocol', () => {
  const valid = {
    sleep_target: '23:30', wake_target: '07:00', workout: null,
    anchor: 'No caffeine after 2pm', ai_note: 'Good energy today.', medical_flag: false,
  }

  it('accepts a valid protocol with no workout', () => {
    expect(validateProtocol(valid)).toBe(true)
  })

  it('accepts a valid protocol with workout', () => {
    const withWorkout = {
      ...valid,
      workout: { name: 'Push Day', duration_min: 20, exercises: [{ name: 'Push-up', reps: '10', tempo: '3-1-3', cue: 'Elbows at 45°' }] },
    }
    expect(validateProtocol(withWorkout)).toBe(true)
  })

  it('rejects missing sleep_target', () => {
    const { sleep_target, ...rest } = valid
    expect(validateProtocol(rest)).toBe(false)
  })

  it('rejects medical_flag = true', () => {
    expect(validateProtocol({ ...valid, medical_flag: true })).toBe(false)
  })

  it('rejects non-object', () => {
    expect(validateProtocol(null)).toBe(false)
    expect(validateProtocol('string')).toBe(false)
  })
})

describe('buildFallbackProtocol', () => {
  it('returns valid protocol for phase 1 workout day', () => {
    const result = buildFallbackProtocol({ phase: 1, isWorkoutDay: true, bedTime: '23:30', wakeTime: '07:00' })
    expect(validateProtocol(result)).toBe(true)
    expect(result.workout).not.toBeNull()
  })

  it('returns null workout on rest day', () => {
    const result = buildFallbackProtocol({ phase: 1, isWorkoutDay: false, bedTime: '23:30', wakeTime: '07:00' })
    expect(result.workout).toBeNull()
  })
})
