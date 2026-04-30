// src/lib/kv.js
import { kv } from '@vercel/kv'

const TTL_90D  = 60 * 60 * 24 * 90
const TTL_180D = 60 * 60 * 24 * 180

export const getHealthData = (date, pillar) =>
  kv.get(`health:${date}:${pillar}`)

export const setHealthData = (date, pillar, data) =>
  kv.set(`health:${date}:${pillar}`, data, { ex: TTL_90D })

export const getSettings = () => kv.get('settings')
export const setSettings = (data) => kv.set('settings', data)

export const getHRVBaseline = () => kv.get('hrv:baseline')
export const setHRVBaseline = (data) => kv.set('hrv:baseline', data)

export const getBrief = (date) => kv.get(`brief:${date}`)
export const setBrief = (date, data) =>
  kv.set(`brief:${date}`, data, { ex: TTL_90D })

export const getReport = (week) => kv.get(`report:${week}`)
export const setReport = (week, data) =>
  kv.set(`report:${week}`, data, { ex: TTL_180D })

export const getAISpend = (month) => kv.get(`ai:spend:${month}`)

export const getPushSubscription = () => kv.get('push:subscription')
export const setPushSubscription = (sub) => kv.set('push:subscription', sub)

/** ISO week key: "2026-W18" */
export const isoWeek = (date = new Date()) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** YYYY-MM for monthly budget keys */
export const isoMonth = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

/** YYYY-MM-DD */
export const isoDate = (date = new Date()) =>
  date.toISOString().slice(0, 10)
