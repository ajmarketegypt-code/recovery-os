// Centralized KV access. Wraps @vercel/kv with two cross-cutting concerns:
//
//   1. USER_NAMESPACE prefix on every key — prevents data bleed when the
//      same Upstash instance backs multiple per-user Vercel projects
//      (ahmed-health, julie-health). Set USER_NAMESPACE='ahmed' on one,
//      'julie' on the other; falls back to 'default' if unset.
//
//   2. APP_TZ-aware isoDate — date keys are bucketed by the user's local
//      day, not UTC. Without this, an 11pm Cairo sleep session (21:00 UTC)
//      gets stored under the previous day's key while the wake reading
//      (05:00 UTC = 7am Cairo) lands on the current day, splitting one
//      night across two records.
//
// Every API route should `import { kv } from '../src/lib/kv.js'`, NOT
// from '@vercel/kv' directly. Direct imports bypass the namespace.
import { kv as rawKv } from '@vercel/kv'

const NS = process.env.USER_NAMESPACE || 'default'
const APP_TZ = process.env.APP_TZ || 'Africa/Cairo'

const TTL_90D  = 60 * 60 * 24 * 90
const TTL_180D = 60 * 60 * 24 * 180

const prefix = (key) => typeof key === 'string' ? `${NS}:${key}` : key
const prefixAll = (keys) => keys.map(prefix)

// Namespaced kv proxy. Add a method here when you reach for one that's missing.
export const kv = {
  get:         (key)              => rawKv.get(prefix(key)),
  set:         (key, value, opts) => rawKv.set(prefix(key), value, opts),
  del:         (...keys)          => rawKv.del(...prefixAll(keys)),
  mget:        (...keys)          => rawKv.mget(...prefixAll(keys)),
  incr:        (key)              => rawKv.incr(prefix(key)),
  incrbyfloat: (key, n)           => rawKv.incrbyfloat(prefix(key), n),
  expire:      (key, sec)         => rawKv.expire(prefix(key), sec),
  lpush:       (key, ...vals)     => rawKv.lpush(prefix(key), ...vals),
  ltrim:       (key, s, e)        => rawKv.ltrim(prefix(key), s, e),
  lrange:      (key, s, e)        => rawKv.lrange(prefix(key), s, e),
  // SCAN takes a `match` pattern that must also be namespaced
  scan: (cursor, opts = {}) => {
    const o = { ...opts }
    if (o.match) o.match = prefix(o.match)
    return rawKv.scan(cursor, o)
  },
}

// Escape hatch for migration scripts that need to read pre-namespace keys.
// Do NOT use in regular code paths.
export const rawKvUnsafe = rawKv

export const KEY_NAMESPACE = NS
export const APP_TIMEZONE = APP_TZ

// ───────────────────── Helpers ────────────────────────────

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

// ───────────────────── Date / week / month keys ────────────

/** ISO week key: "2026-W18". Computed in APP_TZ so weekly aggregates align with local week boundaries. */
export const isoWeek = (date = new Date()) => {
  const local = new Date(localParts(date).join('-') + 'T00:00:00Z')
  local.setUTCDate(local.getUTCDate() + 4 - (local.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(local.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((local - yearStart) / 86400000) + 1) / 7)
  return `${local.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/** YYYY-MM in APP_TZ for monthly budget keys. */
export const isoMonth = (date = new Date()) => {
  const [y, m] = localParts(date)
  return `${y}-${m}`
}

/** YYYY-MM-DD in APP_TZ. The user's local "today" — NOT UTC. */
export const isoDate = (date = new Date()) => localParts(date).join('-')

// Returns ['YYYY','MM','DD'] in APP_TZ. Single source of truth for tz conversion.
function localParts(date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  })
  // en-CA always emits "YYYY-MM-DD" regardless of locale machinations
  return fmt.format(date).split('-')
}
