// src/lib/kv.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

import { kv as rawKv } from '@vercel/kv'
import {
  getHealthData, setHealthData,
  getBrief,
  isoWeek, isoMonth, isoDate,
  KEY_NAMESPACE,
} from './kv.js'

const NS = KEY_NAMESPACE

beforeEach(() => vi.clearAllMocks())

describe('getHealthData', () => {
  it('returns null when key missing', async () => {
    rawKv.get.mockResolvedValue(null)
    const result = await getHealthData('2026-05-01', 'sleep')
    expect(result).toBeNull()
    expect(rawKv.get).toHaveBeenCalledWith(`${NS}:health:2026-05-01:sleep`)
  })

  it('returns parsed object when key exists', async () => {
    rawKv.get.mockResolvedValue({ score: 80 })
    const result = await getHealthData('2026-05-01', 'sleep')
    expect(result).toEqual({ score: 80 })
  })
})

describe('setHealthData', () => {
  it('writes with 90-day TTL', async () => {
    rawKv.set.mockResolvedValue('OK')
    await setHealthData('2026-05-01', 'sleep', { score: 80 })
    expect(rawKv.set).toHaveBeenCalledWith(
      `${NS}:health:2026-05-01:sleep`,
      { score: 80 },
      { ex: 60 * 60 * 24 * 90 }
    )
  })
})

describe('getBrief', () => {
  it('uses brief: key prefix', async () => {
    rawKv.get.mockResolvedValue(null)
    await getBrief('2026-05-01')
    expect(rawKv.get).toHaveBeenCalledWith(`${NS}:brief:2026-05-01`)
  })
})

describe('isoWeek', () => {
  it('returns YYYY-WXX format', () => {
    const result = isoWeek(new Date('2026-05-01'))
    expect(result).toMatch(/^\d{4}-W\d{2}$/)
  })
})

describe('isoMonth', () => {
  it('returns YYYY-MM format', () => {
    expect(isoMonth(new Date('2026-05-01'))).toBe('2026-05')
  })
})

describe('isoDate', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(isoDate(new Date('2026-05-01'))).toBe('2026-05-01')
  })
})
