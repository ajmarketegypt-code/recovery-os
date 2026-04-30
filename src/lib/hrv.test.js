// src/lib/hrv.test.js
import { describe, it, expect } from 'vitest'
import { appendToBaseline, computeBaselineStats, getHRVSignal, applyLutealCorrection, isLutealPhase } from './hrv.js'

const makeSamples = (n, value = 45) =>
  Array.from({ length: n }, (_, i) => ({ date: `2026-01-${String(i + 1).padStart(2, '0')}`, value }))

describe('appendToBaseline', () => {
  it('adds a sample', () => {
    const next = appendToBaseline({ samples: [], mean: null, n: 0 }, { date: '2026-05-01', value: 45 })
    expect(next.samples).toHaveLength(1)
    expect(next.n).toBe(1)
  })
  it('evicts oldest when over 30', () => {
    const baseline = { samples: makeSamples(30), mean: 45, n: 30 }
    const next = appendToBaseline(baseline, { date: '2026-02-01', value: 50 })
    expect(next.samples).toHaveLength(30)
    expect(next.samples[29].value).toBe(50)
  })
})

describe('computeBaselineStats', () => {
  it('returns establishing for <7 samples', () => {
    const stats = computeBaselineStats(makeSamples(5))
    expect(stats.signal_available).toBe(false)
    expect(stats.regime).toBe('establishing')
  })
  it('returns calibrating for 7-29 samples', () => {
    const stats = computeBaselineStats(makeSamples(15))
    expect(stats.regime).toBe('calibrating')
    expect(stats.signal_available).toBe(true)
    expect(stats.mean).toBe(45)
  })
  it('returns stable for 30 samples', () => {
    const stats = computeBaselineStats(makeSamples(30))
    expect(stats.regime).toBe('stable')
  })
})

describe('getHRVSignal', () => {
  it('green when >+10%', () => expect(getHRVSignal(50, { mean: 45 })).toBe('green'))
  it('yellow within +-10%', () => expect(getHRVSignal(45, { mean: 45 })).toBe('yellow'))
  it('red when <-10%', () => expect(getHRVSignal(39, { mean: 45 })).toBe('red'))
})

describe('applyLutealCorrection', () => {
  it('adds 4ms during luteal', () => expect(applyLutealCorrection(42, true)).toBe(46))
  it('no change outside luteal', () => expect(applyLutealCorrection(42, false)).toBe(42))
})

describe('isLutealPhase', () => {
  it('true on day 16 of 28-day cycle', () => {
    const lastPeriod = new Date()
    lastPeriod.setDate(lastPeriod.getDate() - 15)
    expect(isLutealPhase({ last_period_start: lastPeriod.toISOString().slice(0, 10), cycle_length_days: 28 })).toBe(true)
  })
  it('false on day 5', () => {
    const lastPeriod = new Date()
    lastPeriod.setDate(lastPeriod.getDate() - 4)
    expect(isLutealPhase({ last_period_start: lastPeriod.toISOString().slice(0, 10), cycle_length_days: 28 })).toBe(false)
  })
})
