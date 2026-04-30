# Health Super App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full rewrite of Recovery OS into a health super app — two independent PWA instances (Ahmed + Julie), Apple Watch data pipeline, 6 health pillars with AI insight, hard $3/month AI cap.

**Architecture:** One React 19 + Vite codebase deployed twice on Vercel (separate KV, separate env vars). Edge Functions handle all AI + data. Frontend is a PWA installable to iOS home screen for push notification support.

**Tech Stack:** React 19, Vite, Tailwind CSS, Framer Motion 12, Vercel KV (Upstash Redis), Vercel Edge Functions, Vercel Cron (3 jobs), Claude API (Haiku + Sonnet + Opus), vite-plugin-pwa (injectManifest), web-push

---

## File Map

```
api/
  health-ingest.js      # HAE webhook → KV write + HRV baseline update
  today.js              # GET all today's pillar data in one shot
  brief.js              # GET/generate Haiku morning brief
  report.js             # GET/generate Opus weekly report
  vision.js             # POST meal image → Sonnet Vision → macros
  settings.js           # GET/POST settings
  history.js            # GET 30-day pillar data for charts
  today-log.js          # POST tags / mood / weight / sets
  push/
    subscribe.js        # Store Web Push subscription
    send.js             # Internal: send push notification

  cron/
    morning.js          # 7am: generate brief + push
    evening.js          # 6pm: workout reminder if needed
    weekly.js           # Sunday 7pm: generate report + push

src/
  lib/
    kv.js               # Vercel KV helpers (getHealthData, setHealthData, ...)
    scoring.js          # Score formulas for all 6 pillars
    hrv.js              # HRV baseline algorithm + luteal correction
    cost.js             # Atomic AI spend tracking (incrbyfloat pattern)
    prompts.js          # Claude prompt builders (brief, report, vision)
  components/
    pillars/
      Ring.jsx           # SVG animated ring primitive
      Pillar.jsx         # Config-driven pillar card (tap to expand)
      pillarConfigs.js   # Array of 6 pillar metadata objects
    ui/
      TabBar.jsx
      Card.jsx
      ChipSelect.jsx     # Multi-select behavior tag chips
      MoodPicker.jsx     # Mood + felt energy pickers
      Sparkline.jsx      # Pure-SVG 30-day chart (no chart lib)
  screens/
    Today.jsx
    History.jsx
    Nutrition.jsx
    Settings.jsx
    Setup.jsx
  hooks/
    useHealth.js         # Fetch + poll today's data
  App.jsx
  main.jsx
  sw.js                  # Custom service worker (push handler + precache)
  index.css

public/
  icon-192.png           # Already exists — keep
  icon-512.png           # Already exists — keep

vercel.json
vite.config.js
.env.example
```

---

## Phase 1 — Foundation

### Task 1: Project cleanup + dependency install

**Files:**
- Modify: `package.json`
- Delete: `src/App.jsx`, `src/App.css`, `src/main.jsx`, `src/components/` (all old), `src/screens/` (all old), `src/data/`, `src/hooks/`, `src/onboarding/`, `api/claude.js`, `src/api/claude.js`

- [ ] **Step 1: Delete old source files**

```bash
cd "G:\Health app"
rm -rf src/components src/screens src/data src/hooks src/onboarding
rm -f src/App.jsx src/App.css src/main.jsx src/api/claude.js api/claude.js
```

Expected: no errors (files may not all exist — that's fine)

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install @vercel/kv @anthropic-ai/sdk web-push vite-plugin-pwa workbox-precaching
```

Expected: `added N packages` with no peer-dep errors

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

- [ ] **Step 4: Add test config to `package.json`**

Open `package.json` and ensure `scripts` and `"type"` match:

```json
{
  "name": "recovery-os",
  "private": true,
  "version": "2.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui"
  }
}
```

- [ ] **Step 5: Create `vitest.config.js`**

```js
// vitest.config.js
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test-setup.js'],
    globals: true,
  },
})
```

- [ ] **Step 6: Create `src/test-setup.js`**

```js
// src/test-setup.js
import '@testing-library/jest-dom'
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: clean slate — remove old src, install v2 deps"
```

---

### Task 2: Vite config + vercel.json + env template

**Files:**
- Modify: `vite.config.js`
- Modify: `vercel.json`
- Create: `.env.example`

- [ ] **Step 1: Write `vite.config.js`**

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
        name: 'Health OS',
        short_name: 'Health OS',
        description: 'Personal health super app',
        theme_color: '#0d1117',
        background_color: '#0d1117',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
})
```

- [ ] **Step 2: Write `vercel.json`**

```json
{
  "functions": {
    "api/health-ingest.js": { "maxDuration": 10 },
    "api/brief.js":         { "maxDuration": 60 },
    "api/report.js":        { "maxDuration": 60 },
    "api/vision.js":        { "maxDuration": 60 },
    "api/cron/morning.js":  { "maxDuration": 60 },
    "api/cron/evening.js":  { "maxDuration": 15 },
    "api/cron/weekly.js":   { "maxDuration": 60 }
  },
  "crons": [
    { "path": "/api/cron/morning", "schedule": "0 7 * * *"  },
    { "path": "/api/cron/evening", "schedule": "0 18 * * *" },
    { "path": "/api/cron/weekly",  "schedule": "0 19 * * 0" }
  ]
}
```

- [ ] **Step 3: Create `.env.example`**

```
# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Instance identity (set to "ahmed" or "julie")
USER_NAME=ahmed
VITE_USER_NAME=ahmed

# Web Push VAPID — generate with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:ahmed.sobhy3696@gmail.com
VITE_VAPID_PUBLIC_KEY=

# Vercel KV (auto-populated when you link a KV store in Vercel dashboard)
KV_URL=
KV_REST_API_URL=
KV_REST_API_TOKEN=
KV_REST_API_READ_ONLY_TOKEN=

# Secrets
CRON_SECRET=generate-a-random-32-char-string
INGEST_SECRET=generate-a-random-32-char-string
```

- [ ] **Step 4: Generate VAPID keys and save to local `.env`**

```bash
npx web-push generate-vapid-keys
```

Copy output into `.env` (not `.env.example`). Add `.env` to `.gitignore` if not already there.

- [ ] **Step 5: Commit**

```bash
git add vite.config.js vercel.json .env.example
git commit -m "chore: vite-plugin-pwa, vercel cron config, env template"
```

---

### Task 3: src/lib/kv.js — Vercel KV helpers

**Files:**
- Create: `src/lib/kv.js`
- Create: `src/lib/kv.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/lib/kv.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @vercel/kv
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
  },
}))

import { kv } from '@vercel/kv'
import {
  getHealthData, setHealthData,
  getSettings, setSettings,
  getHRVBaseline, setHRVBaseline,
  getBrief, setBrief,
} from './kv.js'

beforeEach(() => vi.clearAllMocks())

describe('getHealthData', () => {
  it('returns null when key missing', async () => {
    kv.get.mockResolvedValue(null)
    const result = await getHealthData('2026-05-01', 'sleep')
    expect(result).toBeNull()
    expect(kv.get).toHaveBeenCalledWith('health:2026-05-01:sleep')
  })

  it('returns parsed object when key exists', async () => {
    kv.get.mockResolvedValue({ score: 80 })
    const result = await getHealthData('2026-05-01', 'sleep')
    expect(result).toEqual({ score: 80 })
  })
})

describe('setHealthData', () => {
  it('writes with 90-day TTL', async () => {
    kv.set.mockResolvedValue('OK')
    await setHealthData('2026-05-01', 'sleep', { score: 80 })
    expect(kv.set).toHaveBeenCalledWith(
      'health:2026-05-01:sleep',
      { score: 80 },
      { ex: 60 * 60 * 24 * 90 }
    )
  })
})

describe('getBrief', () => {
  it('uses brief: key prefix', async () => {
    kv.get.mockResolvedValue(null)
    await getBrief('2026-05-01')
    expect(kv.get).toHaveBeenCalledWith('brief:2026-05-01')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test src/lib/kv.test.js
```

Expected: FAIL — `Cannot find module './kv.js'`

- [ ] **Step 3: Write `src/lib/kv.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test src/lib/kv.test.js
```

Expected: PASS — 4 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/kv.js src/lib/kv.test.js
git commit -m "feat: KV helper layer with TTL and key conventions"
```

---

### Task 4: src/lib/scoring.js — all pillar score formulas

**Files:**
- Create: `src/lib/scoring.js`
- Create: `src/lib/scoring.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/scoring.test.js
import { describe, it, expect } from 'vitest'
import {
  scoreSleep, scoreMovement, scoreStrength, scoreEnergy, clamp, linearScale
} from './scoring.js'

describe('clamp', () => {
  it('clamps below min', () => expect(clamp(-5, 0, 100)).toBe(0))
  it('clamps above max', () => expect(clamp(110, 0, 100)).toBe(100))
  it('passes through in range', () => expect(clamp(50, 0, 100)).toBe(50))
})

describe('scoreSleep', () => {
  it('returns 100 for perfect sleep', () => {
    expect(scoreSleep({ total_hours: 8, efficiency: 90, stages: { deep: 1.8, rem: 1.5, core: 3.7, awake: 0 } })).toBe(100)
  })
  it('returns 0 for 4h sleep', () => {
    expect(scoreSleep({ total_hours: 4, efficiency: 60, stages: { deep: 0, rem: 0, core: 4, awake: 0 } })).toBe(0)
  })
  it('weights components correctly', () => {
    // 6h=50%, 75% eff=50%, deep 12%=46.7% → expect ~48
    const score = scoreSleep({ total_hours: 6, efficiency: 75, stages: { deep: 0.72, rem: 1, core: 3.28, awake: 1 } })
    expect(score).toBeGreaterThan(40)
    expect(score).toBeLessThan(60)
  })
})

describe('scoreMovement', () => {
  it('returns 100 for all rings complete', () => {
    expect(scoreMovement({ move_pct: 100, exercise_pct: 100, stand_pct: 100 })).toBe(100)
  })
  it('weights move highest', () => {
    const moveOnly = scoreMovement({ move_pct: 100, exercise_pct: 0, stand_pct: 0 })
    expect(moveOnly).toBe(50)
  })
})

describe('scoreStrength', () => {
  it('returns 100 at target', () => expect(scoreStrength({ weekly_workouts: 4, target: 4 })).toBe(100))
  it('returns 50 at half target', () => expect(scoreStrength({ weekly_workouts: 2, target: 4 })).toBe(50))
  it('caps at 100', () => expect(scoreStrength({ weekly_workouts: 6, target: 4 })).toBe(100))
})

describe('scoreEnergy', () => {
  it('weights correctly', () => {
    const score = scoreEnergy({ sleep_score: 100, hrv_score: 100, movement_score: 100 })
    expect(score).toBe(100)
  })
  it('reflects low HRV', () => {
    const score = scoreEnergy({ sleep_score: 80, hrv_score: 20, movement_score: 80 })
    expect(score).toBeLessThan(65)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test src/lib/scoring.test.js
```

Expected: FAIL — `Cannot find module './scoring.js'`

- [ ] **Step 3: Write `src/lib/scoring.js`**

```js
// src/lib/scoring.js
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export const linearScale = (v, fromMin, fromMax) =>
  clamp(((v - fromMin) / (fromMax - fromMin)) * 100, 0, 100)

export function scoreSleep({ total_hours, efficiency, stages }) {
  const durationScore  = linearScale(total_hours, 4, 8)
  const efficiencyScore = linearScale(efficiency ?? 0, 60, 90)
  const deepPct = stages && total_hours > 0
    ? (stages.deep / total_hours) * 100
    : 0
  const deepScore = linearScale(deepPct, 5, 20)
  return Math.round(durationScore * 0.4 + efficiencyScore * 0.3 + deepScore * 0.3)
}

export function scoreMovement({ move_pct, exercise_pct, stand_pct }) {
  return Math.round(
    clamp(move_pct ?? 0, 0, 100) * 0.5 +
    clamp(exercise_pct ?? 0, 0, 100) * 0.3 +
    clamp(stand_pct ?? 0, 0, 100) * 0.2
  )
}

export function scoreStrength({ weekly_workouts, target }) {
  return Math.min(100, Math.round((weekly_workouts / target) * 100))
}

export function scoreEnergy({ sleep_score, hrv_score, movement_score }) {
  return Math.round(
    sleep_score * 0.35 + hrv_score * 0.35 + movement_score * 0.30
  )
}

/** Map HRV signal string to a numeric score */
export function scoreHRV(signal) {
  if (signal === 'green')  return 90
  if (signal === 'yellow') return 65
  if (signal === 'red')    return 30
  return 50 // default / calibrating
}
```

- [ ] **Step 4: Run tests**

```bash
npm test src/lib/scoring.test.js
```

Expected: PASS — all 9 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/scoring.js src/lib/scoring.test.js
git commit -m "feat: pillar score formulas (sleep, movement, strength, energy, HRV)"
```

---

### Task 5: src/lib/hrv.js — HRV baseline + luteal correction

**Files:**
- Create: `src/lib/hrv.js`
- Create: `src/lib/hrv.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/hrv.test.js
import { describe, it, expect, vi } from 'vitest'
import {
  appendToBaseline, computeBaselineStats, getHRVSignal,
  applyLutealCorrection, isLutealPhase
} from './hrv.js'

const makeSamples = (n, value = 45) =>
  Array.from({ length: n }, (_, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    value,
  }))

describe('appendToBaseline', () => {
  it('adds a sample', () => {
    const baseline = { samples: [], mean: null, n: 0 }
    const next = appendToBaseline(baseline, { date: '2026-05-01', value: 45 })
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
  it('returns establishing signal for <7 samples', () => {
    const stats = computeBaselineStats(makeSamples(5))
    expect(stats.signal_available).toBe(false)
    expect(stats.regime).toBe('establishing')
  })

  it('returns calibrating signal for 7-29 samples', () => {
    const stats = computeBaselineStats(makeSamples(15))
    expect(stats.regime).toBe('calibrating')
    expect(stats.signal_available).toBe(true)
    expect(stats.mean).toBe(45)
  })

  it('returns stable for 30 samples', () => {
    const stats = computeBaselineStats(makeSamples(30))
    expect(stats.regime).toBe('stable')
    expect(stats.mean).toBe(45)
  })
})

describe('getHRVSignal', () => {
  it('green when hrv > baseline + 10%', () => {
    expect(getHRVSignal(50, { mean: 45 })).toBe('green')
  })
  it('yellow within ±10%', () => {
    expect(getHRVSignal(45, { mean: 45 })).toBe('yellow')
  })
  it('red when hrv < baseline - 10%', () => {
    expect(getHRVSignal(39, { mean: 45 })).toBe('red')
  })
})

describe('applyLutealCorrection', () => {
  it('adds 4ms during luteal phase', () => {
    expect(applyLutealCorrection(42, true)).toBe(46)
  })
  it('no change outside luteal', () => {
    expect(applyLutealCorrection(42, false)).toBe(42)
  })
})

describe('isLutealPhase', () => {
  it('returns true on day 16 of 28-day cycle', () => {
    // last period 15 days ago
    const lastPeriod = new Date()
    lastPeriod.setDate(lastPeriod.getDate() - 15)
    expect(isLutealPhase({
      last_period_start: lastPeriod.toISOString().slice(0, 10),
      cycle_length_days: 28,
    })).toBe(true)
  })

  it('returns false on day 5 of cycle', () => {
    const lastPeriod = new Date()
    lastPeriod.setDate(lastPeriod.getDate() - 4)
    expect(isLutealPhase({
      last_period_start: lastPeriod.toISOString().slice(0, 10),
      cycle_length_days: 28,
    })).toBe(false)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test src/lib/hrv.test.js
```

Expected: FAIL — `Cannot find module './hrv.js'`

- [ ] **Step 3: Write `src/lib/hrv.js`**

```js
// src/lib/hrv.js
const MAX_SAMPLES = 30
const LUTEAL_OFFSET_MS = 4

export function appendToBaseline(baseline, sample) {
  const samples = [...(baseline.samples ?? []), sample]
  if (samples.length > MAX_SAMPLES) samples.shift()
  const mean = samples.reduce((s, x) => s + x.value, 0) / samples.length
  return { samples, mean: Math.round(mean * 10) / 10, n: samples.length, lastComputed: new Date().toISOString() }
}

export function computeBaselineStats(samples) {
  const n = samples.length
  if (n < 7) return { signal_available: false, regime: 'establishing', mean: null, n }
  const mean = samples.reduce((s, x) => s + x.value, 0) / n
  return {
    signal_available: true,
    regime: n >= 30 ? 'stable' : 'calibrating',
    mean: Math.round(mean * 10) / 10,
    n,
  }
}

export function getHRVSignal(hrv_ms, baseline) {
  if (!baseline?.mean) return 'yellow'
  const pct = (hrv_ms - baseline.mean) / baseline.mean
  if (pct > 0.10)  return 'green'
  if (pct < -0.10) return 'red'
  return 'yellow'
}

export function applyLutealCorrection(hrv_ms, isLuteal) {
  return isLuteal ? hrv_ms + LUTEAL_OFFSET_MS : hrv_ms
}

export function isLutealPhase({ last_period_start, cycle_length_days = 28 }) {
  if (!last_period_start) return false
  const start = new Date(last_period_start)
  const today = new Date()
  const dayOfCycle = Math.floor((today - start) / (1000 * 60 * 60 * 24)) % cycle_length_days
  // Luteal phase: day 14 onward (0-indexed day 14 = cycle day 15)
  return dayOfCycle >= 14
}
```

- [ ] **Step 4: Run tests**

```bash
npm test src/lib/hrv.test.js
```

Expected: PASS — all 8 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/hrv.js src/lib/hrv.test.js
git commit -m "feat: HRV baseline algorithm with luteal phase correction"
```

---

### Task 6: src/lib/cost.js — atomic AI spend tracking

**Files:**
- Create: `src/lib/cost.js`
- Create: `src/lib/cost.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/cost.test.js
import { describe, it, expect, vi } from 'vitest'
import { withAIBudget, OverBudgetError, AI_CAP_CENTS } from './cost.js'

const makeKV = (currentCents) => ({
  incrbyfloat: vi.fn().mockResolvedValue(currentCents),
})

describe('withAIBudget', () => {
  it('throws OverBudgetError when projected spend exceeds cap', async () => {
    const kv = makeKV(310) // $3.10 after reserving — over cap of $3.00
    await expect(
      withAIBudget(kv, 'brief', 10, async () => 8)
    ).rejects.toThrow(OverBudgetError)
  })

  it('releases reservation on error', async () => {
    // First call reserves (returns 150 — under cap)
    // Then fn throws — should release
    const kv = { incrbyfloat: vi.fn().mockResolvedValueOnce(150).mockResolvedValueOnce(140) }
    await expect(
      withAIBudget(kv, 'vision', 10, async () => { throw new Error('Claude failed') })
    ).rejects.toThrow('Claude failed')
    expect(kv.incrbyfloat).toHaveBeenCalledTimes(2) // reserve + release
  })

  it('settles to actual cost', async () => {
    // Reserve 15 cents, actual is 8 cents → net +8, so second call is (8-15)=-7
    const kv = { incrbyfloat: vi.fn().mockResolvedValueOnce(50).mockResolvedValueOnce(43) }
    await withAIBudget(kv, 'brief', 15, async () => 8)
    expect(kv.incrbyfloat).toHaveBeenNthCalledWith(2, expect.any(String), 8 - 15)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test src/lib/cost.test.js
```

Expected: FAIL — `Cannot find module './cost.js'`

- [ ] **Step 3: Write `src/lib/cost.js`**

```js
// src/lib/cost.js
import { isoMonth } from './kv.js'

export const AI_CAP_CENTS = 300 // $3.00

// Estimated worst-case cents per model call
export const COST_ESTIMATES = {
  brief:  2,   // Haiku, ~$0.002
  vision: 15,  // Sonnet Vision, ~$0.015
  report: 150, // Opus, ~$1.50 worst case
}

export class OverBudgetError extends Error {
  constructor() { super('Monthly AI budget reached') }
}

/**
 * Reserve budget → call fn() → settle to actual cost.
 * fn() must return actualCents (number).
 * Uses atomic incrbyfloat: reserve first, check returned total,
 * release if over cap.
 */
export async function withAIBudget(kv, model, estimatedCents, fn) {
  const key = `ai:spend:${isoMonth()}`
  const afterReserve = await kv.incrbyfloat(key, estimatedCents)

  if (afterReserve > AI_CAP_CENTS) {
    await kv.incrbyfloat(key, -estimatedCents) // release
    throw new OverBudgetError()
  }

  // Log 70% warning to server logs
  if (afterReserve > AI_CAP_CENTS * 0.7) {
    console.warn(`[cost] AI spend at ${afterReserve}/${AI_CAP_CENTS} cents`)
  }

  let actualCents
  try {
    actualCents = await fn()
  } catch (err) {
    await kv.incrbyfloat(key, -estimatedCents) // release on error
    throw err
  }

  // Settle: adjust from reserved to actual
  const delta = actualCents - estimatedCents
  if (delta !== 0) await kv.incrbyfloat(key, delta)

  return actualCents
}
```

- [ ] **Step 4: Run tests**

```bash
npm test src/lib/cost.test.js
```

Expected: PASS — 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/cost.js src/lib/cost.test.js
git commit -m "feat: atomic AI spend tracking with reserve-check-settle pattern"
```

---

### Task 7: src/lib/prompts.js — Claude prompt builders

**Files:**
- Create: `src/lib/prompts.js`

- [ ] **Step 1: Write `src/lib/prompts.js`**

```js
// src/lib/prompts.js

const JSON_SYSTEM = 'You are a personal health coach. Reply ONLY with valid JSON matching the schema provided. No markdown, no explanation.'

export function buildBriefPrompt({ sleep, hrv, movement, energy, tags = [], name = 'Ahmed' }) {
  const tagStr = tags.length ? tags.join(', ') : 'none'
  const hrvNote = hrv?.regime === 'establishing'
    ? 'HRV baseline still establishing (< 7 days data)'
    : `HRV: ${hrv?.hrv_ms}ms, signal: ${hrv?.signal}, vs baseline ${hrv?.baseline?.mean}ms`

  return {
    system: JSON_SYSTEM,
    messages: [{
      role: 'user',
      content: `Generate ${name}'s morning health brief.

Health data:
- Sleep: ${sleep?.total_hours ?? '?'}h, efficiency ${sleep?.efficiency ?? '?'}%, score ${sleep?.score ?? '?'}
- ${hrvNote}
- Movement score: ${movement?.score ?? '?'} (move ${movement?.move_pct ?? '?'}%, exercise ${movement?.exercise_pct ?? '?'}%, stand ${movement?.stand_pct ?? '?'}%)
- Energy score: ${energy?.score ?? '?'}
- Yesterday's behavior tags: ${tagStr}

Return JSON:
{
  "headline": "Recovery score: [N] — [one-line summary]",
  "bullets": ["[sleep insight]", "[HRV/recovery insight]", "[energy driver]"],
  "recommendation": "Train hard" | "Train as planned" | "Rest"
}`,
    }],
  }
}

export function buildReportPrompt({ week_data, name = 'Ahmed' }) {
  return {
    system: JSON_SYSTEM,
    messages: [{
      role: 'user',
      content: `Generate ${name}'s weekly health report.

Week data (7 days):
${JSON.stringify(week_data, null, 2)}

Return JSON:
{
  "summary": "2-3 sentence week overview",
  "win": "Top recovery win this week",
  "gap": "Top gap to address",
  "recommendation": "Specific action for next week",
  "trends": {
    "sleep": "improving" | "stable" | "declining",
    "hrv": "improving" | "stable" | "declining",
    "strength": "improving" | "stable" | "declining",
    "movement": "improving" | "stable" | "declining",
    "energy": "improving" | "stable" | "declining",
    "nutrition": "improving" | "stable" | "declining"
  },
  "correlations": "One insight about behavior tags correlating with recovery"
}`,
    }],
  }
}

export function buildVisionPrompt() {
  return {
    system: JSON_SYSTEM,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: 'Analyze this meal photo and estimate macros. Be conservative — underestimate portions when uncertain. Return JSON:\n{"protein_g": number, "carbs_g": number, "fat_g": number, "calories": number, "quality_score": 1-10, "comment": "one-line observation"}' },
      ],
    }],
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/prompts.js
git commit -m "feat: Claude prompt builders for brief, report, and vision"
```

---

### Task 8: api/health-ingest.js — HAE webhook + idempotency + HRV update

**Files:**
- Create: `api/health-ingest.js`

- [ ] **Step 1: Write `api/health-ingest.js`**

```js
// api/health-ingest.js
import { kv } from '@vercel/kv'
import { getHealthData, setHealthData, getHRVBaseline, setHRVBaseline, isoDate } from '../src/lib/kv.js'
import { appendToBaseline } from '../src/lib/hrv.js'
import { scoreSleep, scoreMovement, scoreStrength } from '../src/lib/scoring.js'

const INGEST_SECRET = process.env.INGEST_SECRET

// Lightweight hash for idempotency key
async function hashKey(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str))
  return Array.from(new Uint8Array(buf)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('')
}

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  const secret = req.headers.get('x-ingest-secret')
  if (secret !== INGEST_SECRET) return new Response('Unauthorized', { status: 401 })

  let body
  try { body = await req.json() } catch { return new Response('Bad JSON', { status: 400 }) }

  const { metrics = [], exportedAt } = body
  if (!exportedAt) return new Response('Missing exportedAt', { status: 400 })

  let processed = 0, skipped = 0

  for (const metric of metrics) {
    const { type, date, value, data } = metric
    if (!type || !date) { skipped++; continue }

    // Idempotency check
    const idKey = `ingest:seen:${await hashKey(type + date + JSON.stringify(value ?? data) + exportedAt)}`
    if (await kv.get(idKey)) { skipped++; continue }
    await kv.set(idKey, 1, { ex: 7200 }) // 2h TTL

    // Map HAE metric type → KV pillar
    if (type === 'sleep' && data) {
      const { total_hours, efficiency, stages } = data
      const score = scoreSleep({ total_hours, efficiency, stages })
      await setHealthData(date, 'sleep', { ...data, score, source: 'auto' })

    } else if (type === 'hrv' && value != null) {
      const existing = await getHealthData(date, 'hrv') ?? {}
      await setHealthData(date, 'hrv', { ...existing, hrv_ms: value, source: 'auto' })

      // Update rolling baseline
      const baseline = await getHRVBaseline() ?? { samples: [], mean: null, n: 0 }
      const updated = appendToBaseline(baseline, { date, value })
      await setHRVBaseline(updated)

    } else if (type === 'resting_hr' && value != null) {
      const existing = await getHealthData(date, 'hrv') ?? {}
      await setHealthData(date, 'hrv', { ...existing, resting_hr: value })

    } else if (type === 'workout' && data) {
      const existing = await getHealthData(date, 'strength') ?? { workouts: [], weekly_count: 0, score: 0, sets: [] }
      const workouts = [...existing.workouts, data]
      // Compute weekly count (simple: count workouts in last 7 days from KV — use workouts array length for now)
      const settings = await kv.get('settings') ?? { workout_target: 4 }
      const score = scoreStrength({ weekly_workouts: workouts.length, target: settings.workout_target })
      await setHealthData(date, 'strength', { ...existing, workouts, weekly_count: workouts.length, score })

    } else if (type === 'activity_rings' && data) {
      const { move_pct, exercise_pct, stand_pct, steps } = data
      const score = scoreMovement({ move_pct, exercise_pct, stand_pct })
      await setHealthData(date, 'movement', { move_pct, exercise_pct, stand_pct, steps, score })
    }

    processed++
  }

  return new Response(JSON.stringify({ processed, skipped }), {
    headers: { 'content-type': 'application/json' },
  })
}
```

- [ ] **Step 2: Verify the expected HAE payload shape your Health Auto Export app should send**

Configure Health Auto Export to POST this JSON shape to `https://ahmed-health.vercel.app/api/health-ingest`:

```json
{
  "exportedAt": "2026-05-01T07:00:00Z",
  "metrics": [
    { "type": "sleep", "date": "2026-05-01", "data": { "total_hours": 7.4, "efficiency": 88, "stages": { "deep": 1.2, "rem": 1.8, "core": 3.4, "awake": 1.0 } } },
    { "type": "hrv", "date": "2026-05-01", "value": 44.2 },
    { "type": "resting_hr", "date": "2026-05-01", "value": 58 },
    { "type": "activity_rings", "date": "2026-05-01", "data": { "move_pct": 87, "exercise_pct": 100, "stand_pct": 75, "steps": 8420 } }
  ]
}
```

Set header `X-Ingest-Secret: <your INGEST_SECRET>` in Health Auto Export settings.

- [ ] **Step 3: Commit**

```bash
git add api/health-ingest.js
git commit -m "feat: health-ingest endpoint with HAE idempotency and HRV baseline update"
```


---

## Phase 2 — UI Core

### Task 9: App shell + routing + bottom tab nav

**Files:**
- Create: `src/index.css`, `src/main.jsx`, `src/App.jsx`, `src/components/ui/TabBar.jsx`

- [ ] **Step 1: Write `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
:root {
  --color-bg: #0d1117; --color-surface: #161b22;
  --color-accent: #10b981; --color-warning: #f59e0b;
  --color-danger: #ef4444; --color-text: #f0f6fc; --color-muted: #8b949e;
}
body { background:var(--color-bg); color:var(--color-text);
  font-family:system-ui,-apple-system,sans-serif;
  -webkit-font-smoothing:antialiased; overscroll-behavior:none; }
```

- [ ] **Step 2: Write `src/main.jsx`**

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
```

- [ ] **Step 3: Write `src/components/ui/TabBar.jsx`**

```jsx
export const TABS = [
  { id:'today', label:'Today', emoji:'🏠' }, { id:'history', label:'History', emoji:'📈' },
  { id:'nutrition', label:'Nutrition', emoji:'🥗' }, { id:'settings', label:'Settings', emoji:'⚙️' },
]
export default function TabBar({ active, onChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex border-t border-[#30363d]"
         style={{ background:'var(--color-surface)', paddingBottom:'env(safe-area-inset-bottom)' }}>
      {TABS.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)}
          className="flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors"
          style={{ color: active===tab.id ? 'var(--color-accent)' : 'var(--color-muted)' }}>
          <span className="text-lg">{tab.emoji}</span>{tab.label}
        </button>
      ))}
    </nav>
  )
}
```

- [ ] **Step 4: Write `src/App.jsx`**

```jsx
import { useState, useEffect, lazy, Suspense } from 'react'
import TabBar from './components/ui/TabBar.jsx'
const Setup     = lazy(() => import('./screens/Setup.jsx'))
const Today     = lazy(() => import('./screens/Today.jsx'))
const History   = lazy(() => import('./screens/History.jsx'))
const Nutrition = lazy(() => import('./screens/Nutrition.jsx'))
const Settings  = lazy(() => import('./screens/Settings.jsx'))
const SCREEN = { today:Today, history:History, nutrition:Nutrition, settings:Settings }

export default function App() {
  const [ready, setReady] = useState(false)
  const [setupDone, setSetupDone] = useState(false)
  const [tab, setTab] = useState('today')
  useEffect(() => { setSetupDone(localStorage.getItem('setup_complete')==='true'); setReady(true) }, [])
  if (!ready) return null
  if (!setupDone) return (
    <Suspense fallback={null}>
      <Setup onComplete={() => { localStorage.setItem('setup_complete','true'); setSetupDone(true) }} />
    </Suspense>
  )
  const Screen = SCREEN[tab]
  return (
    <div className="min-h-screen pb-20">
      <Suspense fallback={<div className="flex items-center justify-center h-screen" style={{color:'var(--color-muted)'}}>Loading</div>}>
        <Screen />
      </Suspense>
      <TabBar active={tab} onChange={setTab} />
    </div>
  )
}
```

- [ ] **Step 5: Create placeholder screens + run dev server**

Create `src/screens/{Today,History,Nutrition,Settings,Setup}.jsx` each with `export default function X() { return <div>X</div> }`.
Run `npm run dev` — expect dark page, bottom 4-tab nav at `http://localhost:5173`.

- [ ] **Step 6: Commit**

```bash
git add src/
git commit -m "feat: app shell with bottom tab nav and lazy screens"
```

---

### Task 10: Ring.jsx + Pillar.jsx + pillarConfigs.js

**Files:**
- Create: `src/components/pillars/Ring.jsx`, `pillarConfigs.js`, `Pillar.jsx`, `Ring.test.jsx`

- [ ] **Step 1: Write `Ring.test.jsx`**

```jsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Ring from './Ring.jsx'
describe('Ring', () => {
  it('renders SVG', () => {
    const { container } = render(<Ring score={75} color="#10b981" size={80} strokeWidth={8} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
  it('handles null score', () => {
    const { container } = render(<Ring score={null} color="#10b981" size={80} strokeWidth={8} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run** `npm test src/components/pillars/Ring.test.jsx` → FAIL

- [ ] **Step 3: Write `src/components/pillars/Ring.jsx`**

```jsx
import { motion } from 'framer-motion'
export default function Ring({ score, color, size=80, strokeWidth=8 }) {
  const r = (size - strokeWidth) / 2, cx = size / 2
  const circumference = 2 * Math.PI * r
  const pct = score == null ? 0 : Math.min(100, Math.max(0, score))
  const offset = circumference * (1 - pct/100)
  return (
    <svg width={size} height={size} className="block -rotate-90">
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#30363d" strokeWidth={strokeWidth} />
      <motion.circle cx={cx} cy={cx} r={r} fill="none"
        stroke={score==null ? '#30363d' : color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
        transition={{ type:'spring', stiffness:80, damping:20, delay:0.1 }} />
    </svg>
  )
}
```

- [ ] **Step 4: Write `src/components/pillars/pillarConfigs.js`**

```js
export const PILLAR_CONFIGS = [
  { id:'sleep',     label:'Sleep',     emoji:'💤', color:'#818cf8' },
  { id:'hrv',       label:'HRV',       emoji:'❤️', color:'#f87171' },
  { id:'strength',  label:'Strength',  emoji:'💪', color:'#fb923c' },
  { id:'movement',  label:'Movement',  emoji:'🔥', color:'#10b981' },
  { id:'energy',    label:'Energy',    emoji:'⚡', color:'#facc15' },
  { id:'nutrition', label:'Nutrition', emoji:'🥗', color:'#34d399' },
]
```

- [ ] **Step 5: Write `src/components/pillars/Pillar.jsx`**

```jsx
import { motion } from 'framer-motion'
import Ring from './Ring.jsx'
export default function Pillar({ config, data, onTap }) {
  const score = data?.score ?? null
  return (
    <motion.button onClick={() => onTap?.(config.id)} whileTap={{ scale:0.93 }}
      className="flex flex-col items-center gap-1 p-2 rounded-2xl"
      style={{ background:'var(--color-surface)' }}>
      <div className="relative">
        <Ring score={score} color={config.color} size={76} strokeWidth={7} />
        <span className="absolute inset-0 flex items-center justify-center text-xl rotate-90 pointer-events-none">{config.emoji}</span>
      </div>
      <span className="text-sm font-semibold" style={{ color:score==null?'var(--color-muted)':'var(--color-text)' }}>{score??'—'}</span>
      <span className="text-xs" style={{ color:'var(--color-muted)' }}>{config.label}</span>
    </motion.button>
  )
}
```

- [ ] **Step 6: Run tests → PASS. Commit.**

```bash
git add src/components/pillars/
git commit -m "feat: Ring SVG + Pillar + pillar configs"
```

---

### Task 11: api/today.js + useHealth hook + Today screen

**Files:**
- Create: `api/today.js`, `src/hooks/useHealth.js`, `src/screens/Today.jsx`

- [ ] **Step 1: Write `api/today.js`**

```js
import { kv } from '@vercel/kv'
import { isoDate } from '../src/lib/kv.js'
export const config = { runtime:'edge' }
export default async function handler(req) {
  const date = new URL(req.url).searchParams.get('date') || isoDate()
  const pillars = ['sleep','hrv','strength','movement','energy','nutrition','tags','subjective','weight']
  const results = await Promise.all(pillars.map(p => kv.get(`health:${date}:${p}`)))
  return new Response(JSON.stringify({ date, ...Object.fromEntries(pillars.map((p,i) => [p,results[i]])) }),
    { headers:{ 'content-type':'application/json' } })
}
```

- [ ] **Step 2: Write `src/hooks/useHealth.js`**

```js
import { useState, useEffect, useCallback } from 'react'
export function useHealth() {
  const [data, setData] = useState(null)
  const [brief, setBrief] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const fetchAll = useCallback(async () => {
    try {
      const [t, b] = await Promise.all([fetch('/api/today'), fetch('/api/brief')])
      const [td, bd] = await Promise.all([t.json(), b.json()])
      setData(td); setBrief(bd)
    } catch(e) { setError(e.message) } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchAll(); const id=setInterval(fetchAll,60_000); return ()=>clearInterval(id) }, [fetchAll])
  return { data, brief, loading, error, refresh:fetchAll }
}
```

- [ ] **Step 3: Write `src/screens/Today.jsx`**

```jsx
import { useState } from 'react'
import { useHealth } from '../hooks/useHealth.js'
import { PILLAR_CONFIGS } from '../components/pillars/pillarConfigs.js'
import Pillar from '../components/pillars/Pillar.jsx'
import PillarDetail from '../components/pillars/PillarDetail.jsx'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const greeting = () => { const h=new Date().getHours(); return h<12?'Good morning':h<17?'Good afternoon':'Good evening' }

function BriefCard({ brief }) {
  if (!brief?.headline) return <div className="rounded-2xl p-4 h-28 animate-pulse" style={{background:'var(--color-surface)'}} />
  const rc = { 'Train hard':'var(--color-accent)', 'Rest':'var(--color-danger)' }[brief.recommendation]||'var(--color-warning)'
  return (
    <div className="rounded-2xl p-4 space-y-2" style={{background:'var(--color-surface)'}}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-sm leading-snug">{brief.headline}</p>
        <span className="text-xs px-2 py-0.5 rounded-full shrink-0 font-medium"
              style={{background:rc+'22',color:rc}}>{brief.recommendation}</span>
      </div>
      <ul className="space-y-1">
        {brief.bullets?.map((b,i) => (
          <li key={i} className="text-xs flex gap-2" style={{color:'var(--color-muted)'}}>
            <span style={{color:'var(--color-accent)'}}>•</span>{b}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Today() {
  const { data, brief } = useHealth()
  const [detail, setDetail] = useState(null)
  const name = localStorage.getItem('health_name') || 'there'
  const d = new Date()
  return (
    <div className="px-4 pt-12 pb-4 space-y-4 max-w-md mx-auto">
      <div>
        <h1 className="text-xl font-bold">{greeting()}, {name}</h1>
        <p className="text-sm" style={{color:'var(--color-muted)'}}>{DAYS[d.getDay()]} · {MONTHS[d.getMonth()]} {d.getDate()}</p>
      </div>
      <BriefCard brief={brief} />
      <div className="grid grid-cols-3 gap-3">
        {PILLAR_CONFIGS.map(cfg => <Pillar key={cfg.id} config={cfg} data={data?.[cfg.id]} onTap={setDetail} />)}
      </div>
      {/* Tags/mood/weight added in Task 12 */}
      {detail && <PillarDetail pillarId={detail} data={data?.[detail]} onClose={() => setDetail(null)} />}
    </div>
  )
}
```

- [ ] **Step 4: Create stub PillarDetail**

```js
// src/components/pillars/PillarDetail.jsx
export default function PillarDetail({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{background:'rgba(0,0,0,0.6)'}}>
      <div className="w-full rounded-t-3xl p-6" style={{background:'var(--color-surface)'}}>
        <button onClick={onClose} style={{color:'var(--color-muted)'}}>Close</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add api/today.js src/hooks/ src/screens/Today.jsx src/components/pillars/PillarDetail.jsx
git commit -m "feat: Today screen with brief card + 6 pillar rings"
```

---

### Task 12: Behavior tags + mood + weight

**Files:**
- Create: `api/today-log.js`, `src/components/ui/ChipSelect.jsx`, `src/components/ui/MoodPicker.jsx`
- Modify: `src/screens/Today.jsx`

- [ ] **Step 1: Write `api/today-log.js`**

```js
import { kv } from '@vercel/kv'
import { isoDate } from '../src/lib/kv.js'
export const config = { runtime:'edge' }
export default async function handler(req) {
  if (req.method!=='POST') return new Response('Method Not Allowed',{status:405})
  const { type, date=isoDate(), data } = await req.json()
  const ex = 60*60*24*90
  if (type==='tags') await kv.set(`health:${date}:tags`,data,{ex})
  else if (type==='subjective') {
    const cur=(await kv.get(`health:${date}:subjective`))??{}
    await kv.set(`health:${date}:subjective`,{...cur,...data},{ex})
  }
  else if (type==='weight') await kv.set(`health:${date}:weight`,{kg:data.kg,source:'manual'},{ex})
  else if (type==='sets') {
    const cur=(await kv.get(`health:${date}:strength`))??{workouts:[],weekly_count:0,score:0,sets:[]}
    await kv.set(`health:${date}:strength`,{...cur,sets:data.sets},{ex})
  }
  else return new Response('Unknown type',{status:400})
  return new Response(JSON.stringify({ok:true}),{headers:{'content-type':'application/json'}})
}
```

- [ ] **Step 2: Write `src/components/ui/ChipSelect.jsx`**

```jsx
import { motion } from 'framer-motion'
export default function ChipSelect({ options, selected=[], onChange }) {
  const toggle = id => onChange(selected.includes(id)?selected.filter(x=>x!==id):[...selected,id])
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(opt => {
        const active = selected.includes(opt.id)
        return (
          <motion.button key={opt.id} onClick={()=>toggle(opt.id)} whileTap={{scale:0.9}} layout
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{background:active?'var(--color-accent)':'var(--color-surface)',
                    color:active?'#0d1117':'var(--color-muted)',
                    border:`1px solid ${active?'var(--color-accent)':'#30363d'}`}}>
            {opt.emoji} {opt.label}
          </motion.button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/ui/MoodPicker.jsx`**

```jsx
const MOODS = [{value:1,emoji:'😞'},{value:2,emoji:'😐'},{value:3,emoji:'🙂'},{value:4,emoji:'😄'}]
export default function MoodPicker({ mood, feltEnergy, onMoodChange, onEnergyChange }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs mb-2" style={{color:'var(--color-muted)'}}>How are you feeling?</p>
        <div className="flex gap-2">
          {MOODS.map(m => (
            <button key={m.value} onClick={()=>onMoodChange(m.value)}
              className="flex-1 flex flex-col items-center py-2 rounded-xl text-xl"
              style={{background:mood===m.value?'#10b98122':'var(--color-surface)',
                      border:`1px solid ${mood===m.value?'var(--color-accent)':'#30363d'}`}}>
              {m.emoji}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs mb-2" style={{color:'var(--color-muted)'}}>Felt energy (1–5)</p>
        <div className="flex gap-2">
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={()=>onEnergyChange(n)}
              className="flex-1 py-2 rounded-xl text-sm font-bold"
              style={{background:feltEnergy===n?'var(--color-accent)':'var(--color-surface)',
                      color:feltEnergy===n?'#0d1117':'var(--color-muted)',
                      border:`1px solid ${feltEnergy===n?'var(--color-accent)':'#30363d'}`}}>
              {n}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Update `src/screens/Today.jsx`**

Add imports at top:
```js
import ChipSelect from '../components/ui/ChipSelect.jsx'
import MoodPicker from '../components/ui/MoodPicker.jsx'
```

Add constant outside component:
```js
const TAG_OPTIONS = [
  {id:'alcohol',emoji:'🍷',label:'Alcohol'},{id:'late_meal',emoji:'🌙',label:'Late meal'},
  {id:'high_stress',emoji:'😰',label:'High stress'},{id:'travel',emoji:'✈️',label:'Travel'},
  {id:'poor_sleep_intent',emoji:'😴',label:'Late night'},
]
```

Add state inside Today:
```js
const [tags, setTags] = useState(data?.tags ?? [])
const [mood, setMood] = useState(null)
const [feltEnergy, setFeltEnergy] = useState(null)
const [weight, setWeight] = useState('')
const log = (type, payload) => fetch('/api/today-log',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type,data:payload})})
```

Add JSX after pillar grid:
```jsx
<section className="space-y-3 pt-2">
  <p className="text-xs font-semibold uppercase tracking-wide" style={{color:'var(--color-muted)'}}>Today</p>
  <ChipSelect options={TAG_OPTIONS} selected={tags} onChange={next=>{setTags(next);log('tags',next)}} />
  <MoodPicker mood={mood} feltEnergy={feltEnergy}
    onMoodChange={v=>{setMood(v);log('subjective',{mood:v})}}
    onEnergyChange={v=>{setFeltEnergy(v);log('subjective',{felt_energy:v})}} />
  <div className="flex items-center gap-2">
    <input type="number" placeholder="Weight (kg)" value={weight} onChange={e=>setWeight(e.target.value)}
      onBlur={()=>weight&&log('weight',{kg:parseFloat(weight)})}
      className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
      style={{background:'var(--color-surface)',color:'var(--color-text)',border:'1px solid #30363d'}} />
    <span className="text-sm" style={{color:'var(--color-muted)'}}>kg</span>
  </div>
</section>
```

- [ ] **Step 5: Commit**

```bash
git add api/today-log.js src/components/ui/ src/screens/Today.jsx
git commit -m "feat: behavior tags, mood, weight log on Today screen"
```

---

## Phase 3 — AI Layer

### Task 13: api/brief.js — Haiku morning brief

**Files:** Create `api/brief.js`

- [ ] **Step 1: Write `api/brief.js`**

```js
import Anthropic from '@anthropic-ai/sdk'
import { kv } from '@vercel/kv'
import { getBrief, setBrief, getHealthData, getHRVBaseline, isoDate } from '../src/lib/kv.js'
import { buildBriefPrompt } from '../src/lib/prompts.js'
import { withAIBudget, COST_ESTIMATES } from '../src/lib/cost.js'
import { computeBaselineStats } from '../src/lib/hrv.js'

export const config = { runtime:'edge' }
const anthropic = new Anthropic({ apiKey:process.env.ANTHROPIC_API_KEY })

export default async function handler(req) {
  const today = isoDate()
  const cached = await getBrief(today)
  if (cached?.generated_at?.startsWith(today)) {
    return new Response(JSON.stringify(cached),{headers:{'content-type':'application/json'}})
  }
  const [sleep,hrv,movement,energy,tags] = await Promise.all([
    getHealthData(today,'sleep'), getHealthData(today,'hrv'), getHealthData(today,'movement'),
    getHealthData(today,'energy'), getHealthData(today,'tags'),
  ])
  const baseline = await getHRVBaseline()
  const baselineStats = computeBaselineStats(baseline?.samples??[])
  const settings = await kv.get('settings')
  const { system, messages } = buildBriefPrompt({
    sleep, movement, energy, tags:tags??[],
    hrv:{...hrv, regime:baselineStats.regime, baseline:baselineStats},
    name: settings?.name || process.env.USER_NAME || 'Ahmed',
  })
  let brief
  try {
    await withAIBudget(kv,'brief',COST_ESTIMATES.brief, async () => {
      const r = await anthropic.messages.create({model:'claude-haiku-4-5',max_tokens:500,system,messages})
      brief = JSON.parse(r.content[0].text)
      return Math.round((r.usage.input_tokens*0.0008+r.usage.output_tokens*0.004)/10)
    })
  } catch(err) {
    if (err.constructor.name==='OverBudgetError') {
      return new Response(JSON.stringify({error:'budget_exceeded'}),{status:402,headers:{'content-type':'application/json'}})
    }
    throw err
  }
  const result = {...brief, generated_at:new Date().toISOString()}
  await setBrief(today, result)
  return new Response(JSON.stringify(result),{headers:{'content-type':'application/json'}})
}
```

- [ ] **Step 2: Commit**

```bash
git add api/brief.js
git commit -m "feat: Haiku morning brief endpoint with budget guard"
```

---

### Task 14: api/vision.js — Sonnet meal Vision

**Files:** Create `api/vision.js`

- [ ] **Step 1: Write `api/vision.js`**

```js
import Anthropic from '@anthropic-ai/sdk'
import { kv } from '@vercel/kv'
import { isoDate, isoMonth } from '../src/lib/kv.js'
import { buildVisionPrompt } from '../src/lib/prompts.js'
import { withAIBudget } from '../src/lib/cost.js'

export const config = { runtime:'edge' }
const anthropic = new Anthropic({ apiKey:process.env.ANTHROPIC_API_KEY })

export default async function handler(req) {
  if (req.method!=='POST') return new Response('Method Not Allowed',{status:405})
  const month = isoMonth()
  const budget = (await kv.get(`vision:budget:${month}`))??{used_cents:0,cap_cents:150,call_count:0}
  if (budget.used_cents>=budget.cap_cents) {
    return new Response(JSON.stringify({error:'vision_budget_exceeded'}),{status:402,headers:{'content-type':'application/json'}})
  }
  const form = await req.formData()
  const file = form.get('image')
  if (!file) return new Response('Missing image',{status:400})
  const base64 = btoa(String.fromCharCode(...new Uint8Array(await file.arrayBuffer())))
  const { system, messages } = buildVisionPrompt()
  messages[0].content = [
    {type:'image',source:{type:'base64',media_type:file.type||'image/jpeg',data:base64}},
    ...messages[0].content,
  ]
  let macros, actualCents=0
  try {
    await withAIBudget(kv,'vision',15, async () => {
      const r = await anthropic.messages.create({model:'claude-sonnet-4-5',max_tokens:300,system,messages})
      macros = JSON.parse(r.content[0].text)
      actualCents = Math.round((r.usage.input_tokens*0.003+r.usage.output_tokens*0.015)/10)
      return actualCents
    })
  } catch(err) {
    if (err.constructor.name==='OverBudgetError') return new Response(JSON.stringify({error:'budget_exceeded'}),{status:402,headers:{'content-type':'application/json'}})
    throw err
  }
  await kv.set(`vision:budget:${month}`,{used_cents:budget.used_cents+actualCents,cap_cents:budget.cap_cents,call_count:budget.call_count+1})
  const today=isoDate()
  const existing=(await kv.get(`health:${today}:nutrition`))??{meals:[],totals:{protein_g:0,carbs_g:0,fat_g:0,calories:0}}
  const meal={id:Date.now(),macros,quality_score:macros.quality_score,comment:macros.comment,logged_at:new Date().toISOString()}
  const totals={
    protein_g:existing.totals.protein_g+(macros.protein_g??0),
    carbs_g:existing.totals.carbs_g+(macros.carbs_g??0),
    fat_g:existing.totals.fat_g+(macros.fat_g??0),
    calories:existing.totals.calories+(macros.calories??0),
  }
  await kv.set(`health:${today}:nutrition`,{meals:[...existing.meals,meal],totals},{ex:60*60*24*90})
  return new Response(JSON.stringify({macros,meal_id:meal.id}),{headers:{'content-type':'application/json'}})
}
```

- [ ] **Step 2: Commit**

```bash
git add api/vision.js
git commit -m "feat: Sonnet Vision meal analysis with vision budget tracking"
```

---

### Task 15: api/report.js — Opus weekly report

**Files:** Create `api/report.js`

- [ ] **Step 1: Write `api/report.js`**

```js
import Anthropic from '@anthropic-ai/sdk'
import { kv } from '@vercel/kv'
import { getReport, setReport, isoWeek } from '../src/lib/kv.js'
import { buildReportPrompt } from '../src/lib/prompts.js'
import { withAIBudget, COST_ESTIMATES } from '../src/lib/cost.js'

export const config = { runtime:'edge' }
const anthropic = new Anthropic({ apiKey:process.env.ANTHROPIC_API_KEY })

export default async function handler(req) {
  const week = isoWeek()
  const cached = await getReport(week)
  if (cached) return new Response(JSON.stringify(cached),{headers:{'content-type':'application/json'}})

  const isSunday = new Date().getDay()===0
  const isForced = new URL(req.url).searchParams.get('force')==='1' &&
    (req.headers.get('x-cron-secret')===process.env.CRON_SECRET)
  if (!isSunday && !isForced) {
    return new Response(JSON.stringify({available:false,message:'Report generates Sunday evening'}),{headers:{'content-type':'application/json'}})
  }

  const today = new Date()
  const week_data = await Promise.all(Array.from({length:7},(_,i)=>{
    const d=new Date(today); d.setDate(d.getDate()-(6-i))
    const date=d.toISOString().slice(0,10)
    const pillars=['sleep','hrv','strength','movement','energy','nutrition','tags','subjective']
    return Promise.all(pillars.map(p=>kv.get(`health:${date}:${p}`))).then(results=>({
      date,...Object.fromEntries(pillars.map((p,j)=>[p,results[j]]))
    }))
  }))

  const settings = await kv.get('settings')
  const { system, messages } = buildReportPrompt({ week_data, name:settings?.name||process.env.USER_NAME||'Ahmed' })
  let report
  try {
    await withAIBudget(kv,'report',COST_ESTIMATES.report, async () => {
      const r = await anthropic.messages.create({model:'claude-opus-4-5',max_tokens:1000,system,messages})
      report = JSON.parse(r.content[0].text)
      return Math.round((r.usage.input_tokens*0.015+r.usage.output_tokens*0.075)/10)
    })
  } catch(err) {
    if (err.constructor.name==='OverBudgetError') return new Response(JSON.stringify({error:'budget_exceeded'}),{status:402,headers:{'content-type':'application/json'}})
    throw err
  }
  const result = {...report, generated_at:new Date().toISOString(), week}
  await setReport(week, result)
  return new Response(JSON.stringify(result),{headers:{'content-type':'application/json'}})
}
```

- [ ] **Step 2: Commit**

```bash
git add api/report.js
git commit -m "feat: Opus weekly report — Sunday-gated with cron override"
```

---

## Phase 4 — Remaining Screens

### Task 16: History screen

**Files:** Create `api/history.js`, `src/components/ui/Sparkline.jsx`, modify `src/screens/History.jsx`

- [ ] **Step 1: Write `api/history.js`**

```js
import { kv } from '@vercel/kv'
export const config = { runtime:'edge' }
export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const pillar = searchParams.get('pillar')||'sleep'
  const days = parseInt(searchParams.get('days')||'30')
  const today = new Date()
  const dates = Array.from({length:days},(_,i)=>{
    const d=new Date(today); d.setDate(d.getDate()-(days-1-i)); return d.toISOString().slice(0,10)
  })
  const results = await Promise.all(dates.map(date=>kv.get(`health:${date}:${pillar}`)))
  return new Response(JSON.stringify(dates.map((date,i)=>({date,...(results[i]??{})}))),
    {headers:{'content-type':'application/json'}})
}
```

- [ ] **Step 2: Write `src/components/ui/Sparkline.jsx`**

```jsx
export default function Sparkline({ data, width=320, height=120, color='#10b981' }) {
  const values = data.map(d=>d.score??null)
  const valid = values.filter(v=>v!=null)
  if (valid.length<2) return <div className="h-32 flex items-center justify-center text-sm" style={{color:'var(--color-muted)'}}>Not enough data yet</div>
  const padX=8, padY=8, innerW=width-padX*2, innerH=height-padY*2
  const points = values.map((v,i)=>v==null?null:[padX+(i/(values.length-1))*innerW, padY+(1-v/100)*innerH]).filter(Boolean)
  const polyPts = points.map(p=>p.join(',')).join(' ')
  const area = `M ${points[0][0]},${padY+innerH} ${points.map(p=>`L ${p[0]},${p[1]}`).join(' ')} L ${points[points.length-1][0]},${padY+innerH} Z`
  const avg = Math.round(valid.reduce((a,b)=>a+b,0)/valid.length)
  const gid = `g${color.replace('#','')}`
  return (
    <div>
      <svg width={width} height={height} className="w-full">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <polyline points={polyPts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={color} />)}
      </svg>
      <p className="text-xs text-center mt-1" style={{color:'var(--color-muted)'}}>30-day avg: <span style={{color:'var(--color-text)'}}>{avg}</span></p>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/screens/History.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { PILLAR_CONFIGS } from '../components/pillars/pillarConfigs.js'
import Sparkline from '../components/ui/Sparkline.jsx'

export default function History() {
  const [pillar, setPillar] = useState('sleep')
  const [histData, setHistData] = useState([])
  const [report, setReport] = useState(null)

  useEffect(()=>{ fetch(`/api/history?pillar=${pillar}`).then(r=>r.json()).then(setHistData) }, [pillar])
  useEffect(()=>{ fetch('/api/report').then(r=>r.json()).then(setReport) }, [])

  const cfg = PILLAR_CONFIGS.find(c=>c.id===pillar)

  return (
    <div className="px-4 pt-12 pb-4 space-y-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold">History</h1>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[...PILLAR_CONFIGS, {id:'weight',label:'Weight',emoji:'⚖️',color:'#a3e635'}].map(c => (
          <button key={c.id} onClick={()=>setPillar(c.id)}
            className="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{background:pillar===c.id?c.color:'var(--color-surface)',color:pillar===c.id?'#0d1117':'var(--color-muted)'}}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>
      <div className="rounded-2xl p-4" style={{background:'var(--color-surface)'}}>
        <p className="text-sm font-semibold mb-3" style={{color:cfg?.color||'#a3e635'}}>{cfg?.emoji||'⚖️'} {cfg?.label||'Weight'} — 30 days</p>
        <Sparkline data={histData} color={cfg?.color||'#a3e635'} />
      </div>
      {report && !report.error && report.summary && (
        <div className="rounded-2xl p-4 space-y-3" style={{background:'var(--color-surface)'}}>
          <p className="text-sm font-semibold">This Week</p>
          <p className="text-sm" style={{color:'var(--color-muted)'}}>{report.summary}</p>
          <div className="flex gap-2">
            <div className="flex-1 rounded-xl p-3" style={{background:'#10b98122'}}>
              <p className="text-xs font-semibold" style={{color:'var(--color-accent)'}}>Win</p>
              <p className="text-xs mt-1">{report.win}</p>
            </div>
            <div className="flex-1 rounded-xl p-3" style={{background:'#f59e0b22'}}>
              <p className="text-xs font-semibold" style={{color:'var(--color-warning)'}}>Focus</p>
              <p className="text-xs mt-1">{report.gap}</p>
            </div>
          </div>
          {report.correlations && <p className="text-xs p-3 rounded-xl" style={{background:'#30363d',color:'var(--color-muted)'}}>{report.correlations}</p>}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add api/history.js src/components/ui/Sparkline.jsx src/screens/History.jsx
git commit -m "feat: History screen with sparkline charts and weekly report card"
```

---

### Task 17: Nutrition screen

**Files:** Modify `src/screens/Nutrition.jsx`

- [ ] **Step 1: Write `src/screens/Nutrition.jsx`**

```jsx
import { useState, useEffect, useRef } from 'react'

async function resizeImage(file, maxPx=800) {
  return new Promise(resolve => {
    const img = new Image(), url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxPx/Math.max(img.width,img.height))
      const canvas = document.createElement('canvas')
      canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale)
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height)
      URL.revokeObjectURL(url); canvas.toBlob(resolve,'image/jpeg',0.85)
    }; img.src=url
  })
}

function MacroBar({ label, value, max, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1" style={{color:'var(--color-muted)'}}>
        <span>{label}</span><span style={{color:'var(--color-text)'}}>{Math.round(value)}g</span>
      </div>
      <div className="h-1.5 rounded-full" style={{background:'#30363d'}}>
        <div className="h-full rounded-full" style={{width:`${Math.min(100,(value/max)*100)}%`,background:color}} />
      </div>
    </div>
  )
}

export default function Nutrition() {
  const [nutrition, setNutrition] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [manualMode, setManualMode] = useState(false)
  const [manual, setManual] = useState({name:'',calories:'',protein:''})
  const fileRef = useRef()

  const fetchData = () => fetch('/api/today').then(r=>r.json()).then(d=>setNutrition(d.nutrition))
  useEffect(()=>{ fetchData() }, [])

  const handleFile = async e => {
    const file = e.target.files?.[0]; if (!file) return
    setUploading(true)
    try {
      const resized = await resizeImage(file,800)
      const form = new FormData(); form.append('image',resized,'meal.jpg')
      const res = await fetch('/api/vision',{method:'POST',body:form})
      if (res.status===402) { setManualMode(true); return }
      await fetchData()
    } finally { setUploading(false); e.target.value='' }
  }

  const submitManual = async () => {
    await fetch('/api/today-log',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({type:'nutrition_manual',data:{name:manual.name,calories:parseFloat(manual.calories),protein_g:parseFloat(manual.protein||0)}})})
    setManual({name:'',calories:'',protein:''}); await fetchData()
  }

  const totals = nutrition?.totals??{protein_g:0,carbs_g:0,fat_g:0,calories:0}
  return (
    <div className="px-4 pt-12 pb-4 space-y-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold">Nutrition</h1>
      <div className="rounded-2xl p-4 space-y-3" style={{background:'var(--color-surface)'}}>
        <div className="flex justify-between items-baseline">
          <p className="text-sm font-semibold">Today</p>
          <p className="text-lg font-bold">{Math.round(totals.calories)} <span className="text-sm font-normal" style={{color:'var(--color-muted)'}}>kcal</span></p>
        </div>
        <MacroBar label="Protein" value={totals.protein_g} max={160} color="#f87171" />
        <MacroBar label="Carbs"   value={totals.carbs_g}   max={250} color="#facc15" />
        <MacroBar label="Fat"     value={totals.fat_g}     max={80}  color="#fb923c" />
      </div>
      {!manualMode ? (
        <button onClick={()=>fileRef.current?.click()} disabled={uploading}
          className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2"
          style={{background:'var(--color-accent)',color:'#0d1117',opacity:uploading?0.6:1}}>
          {uploading ? 'Analyzing...' : '📷 Log meal with camera'}
        </button>
      ) : (
        <div className="rounded-2xl p-4 space-y-3" style={{background:'var(--color-surface)'}}>
          <p className="text-sm font-semibold">Manual entry (vision budget reached)</p>
          <input placeholder="Meal name" value={manual.name} onChange={e=>setManual(m=>({...m,name:e.target.value}))}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{background:'#0d1117',color:'var(--color-text)',border:'1px solid #30363d'}} />
          <div className="flex gap-2">
            <input type="number" placeholder="Calories" value={manual.calories} onChange={e=>setManual(m=>({...m,calories:e.target.value}))}
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={{background:'#0d1117',color:'var(--color-text)',border:'1px solid #30363d'}} />
            <input type="number" placeholder="Protein (g)" value={manual.protein} onChange={e=>setManual(m=>({...m,protein:e.target.value}))}
              className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
              style={{background:'#0d1117',color:'var(--color-text)',border:'1px solid #30363d'}} />
          </div>
          <button onClick={submitManual} className="w-full py-2 rounded-xl font-semibold text-sm"
            style={{background:'var(--color-accent)',color:'#0d1117'}}>Log meal</button>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <div className="space-y-2">
        {(nutrition?.meals??[]).map((meal,i) => (
          <div key={meal.id||i} className="rounded-xl p-3 flex justify-between items-center" style={{background:'var(--color-surface)'}}>
            <div>
              <p className="text-sm font-medium">{meal.comment||'Meal'}</p>
              <p className="text-xs mt-0.5" style={{color:'var(--color-muted)'}}>{Math.round(meal.macros?.calories??0)} kcal · {Math.round(meal.macros?.protein_g??0)}g protein</p>
            </div>
            <span className="text-sm font-bold px-2 py-0.5 rounded-full" style={{background:'#10b98122',color:'var(--color-accent)'}}>{meal.quality_score}/10</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/Nutrition.jsx
git commit -m "feat: Nutrition screen with camera, resize, macro bars, manual fallback"
```

---

### Task 18: api/settings.js + Settings screen

**Files:** Create `api/settings.js`, modify `src/screens/Settings.jsx`

- [ ] **Step 1: Write `api/settings.js`**

```js
import { kv } from '@vercel/kv'
import { isoMonth } from '../src/lib/kv.js'
export const config = { runtime:'edge' }
const DEFAULTS = {name:'Ahmed',notification_times:{morning:'07:00',evening:'18:00'},
  workout_target:4,vision_cap_cents:150,ai_monthly_cap_cents:300,
  weight_unit:'kg',cycle_length_days:28,last_period_start:null}
export default async function handler(req) {
  if (req.method==='GET') {
    const s=(await kv.get('settings'))??DEFAULTS
    const month=isoMonth()
    const aiSpend=(await kv.get(`ai:spend:${month}`))??0
    const visionBudget=(await kv.get(`vision:budget:${month}`))??{used_cents:0,cap_cents:s.vision_cap_cents}
    return new Response(JSON.stringify({...s,aiSpend,visionBudget}),{headers:{'content-type':'application/json'}})
  }
  if (req.method==='POST') {
    const cur=(await kv.get('settings'))??DEFAULTS
    const merged={...cur,...(await req.json())}
    await kv.set('settings',merged)
    return new Response(JSON.stringify(merged),{headers:{'content-type':'application/json'}})
  }
  return new Response('Method Not Allowed',{status:405})
}
```

- [ ] **Step 2: Write `src/screens/Settings.jsx`**

```jsx
import { useState, useEffect } from 'react'
const IS_JULIE = import.meta.env.VITE_USER_NAME === 'julie'

function Section({ title, children }) {
  return <div className="rounded-2xl p-4 space-y-3" style={{background:'var(--color-surface)'}}><p className="text-sm font-semibold" style={{color:'var(--color-muted)'}}>{title}</p>{children}</div>
}
function Row({ label, children }) {
  return <div className="flex items-center justify-between gap-4"><span className="text-sm">{label}</span>{children}</div>
}
function SpendBar({ label, used, cap, color }) {
  const pct=Math.min(100,Math.round((used/cap)*100))
  return (
    <div>
      <div className="flex justify-between text-xs mb-1" style={{color:'var(--color-muted)'}}>
        <span>{label}</span><span style={{color:pct>80?'var(--color-warning)':'var(--color-text)'}}>${(used/100).toFixed(2)} / ${(cap/100).toFixed(2)}</span>
      </div>
      <div className="h-2 rounded-full" style={{background:'#30363d'}}>
        <div className="h-full rounded-full" style={{width:`${pct}%`,background:pct>80?'var(--color-warning)':color}} />
      </div>
    </div>
  )
}

export default function Settings() {
  const [s, setS] = useState(null)
  const save = async patch => {
    const updated = await fetch('/api/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(patch)}).then(r=>r.json())
    setS(updated)
  }
  useEffect(()=>{ fetch('/api/settings').then(r=>r.json()).then(setS) },[])
  if (!s) return <div className="flex items-center justify-center h-screen" style={{color:'var(--color-muted)'}}>Loading…</div>

  return (
    <div className="px-4 pt-12 pb-4 space-y-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold">Settings</h1>
      <Section title="Notifications">
        <Row label="Morning brief"><input type="time" value={s.notification_times.morning}
          onChange={e=>save({notification_times:{...s.notification_times,morning:e.target.value}})}
          className="bg-transparent text-sm outline-none" style={{color:'var(--color-text)'}} /></Row>
        <Row label="Evening reminder"><input type="time" value={s.notification_times.evening}
          onChange={e=>save({notification_times:{...s.notification_times,evening:e.target.value}})}
          className="bg-transparent text-sm outline-none" style={{color:'var(--color-text)'}} /></Row>
      </Section>
      <Section title="Training">
        <Row label="Weekly workout target">
          <div className="flex items-center gap-2">
            <button onClick={()=>save({workout_target:Math.max(1,s.workout_target-1)})} className="w-8 h-8 rounded-full flex items-center justify-center font-bold" style={{background:'#30363d'}}>-</button>
            <span className="w-6 text-center font-bold">{s.workout_target}</span>
            <button onClick={()=>save({workout_target:Math.min(7,s.workout_target+1)})} className="w-8 h-8 rounded-full flex items-center justify-center font-bold" style={{background:'#30363d'}}>+</button>
          </div>
        </Row>
      </Section>
      <Section title="AI Budget">
        <SpendBar label="Monthly AI spend" used={s.aiSpend} cap={300} color="var(--color-accent)" />
        <SpendBar label="Vision (meal photos)" used={s.visionBudget.used_cents} cap={s.visionBudget.cap_cents} color="#34d399" />
      </Section>
      <Section title="Units">
        <Row label="Weight unit">
          <div className="flex gap-1">
            {['kg','lbs'].map(u=>(
              <button key={u} onClick={()=>save({weight_unit:u})} className="px-3 py-1 rounded-lg text-sm font-medium"
                style={{background:s.weight_unit===u?'var(--color-accent)':'#30363d',color:s.weight_unit===u?'#0d1117':'var(--color-muted)'}}>
                {u}
              </button>
            ))}
          </div>
        </Row>
      </Section>
      {IS_JULIE && (
        <Section title="Cycle Tracking">
          <p className="text-xs" style={{color:'var(--color-muted)'}}>Corrects HRV interpretation during luteal phase (+4ms offset applied automatically).</p>
          <Row label="Last period start"><input type="date" value={s.last_period_start||''}
            onChange={e=>save({last_period_start:e.target.value})}
            className="bg-transparent text-sm outline-none" style={{color:'var(--color-text)'}} /></Row>
          <Row label="Cycle length">
            <div className="flex items-center gap-2">
              <button onClick={()=>save({cycle_length_days:Math.max(21,s.cycle_length_days-1)})} className="w-8 h-8 rounded-full flex items-center justify-center font-bold" style={{background:'#30363d'}}>-</button>
              <span className="w-8 text-center font-bold">{s.cycle_length_days}</span>
              <button onClick={()=>save({cycle_length_days:Math.min(35,s.cycle_length_days+1)})} className="w-8 h-8 rounded-full flex items-center justify-center font-bold" style={{background:'#30363d'}}>+</button>
            </div>
          </Row>
        </Section>
      )}
      {!IS_JULIE && (
        <Section title="Apple Watch Setup">
          <ol className="text-xs space-y-1 list-decimal list-inside" style={{color:'var(--color-muted)'}}>
            <li>Install Health Auto Export on iPhone</li>
            <li>Purchase Premium Annual ($6.99/yr)</li>
            <li>REST API URL: <code style={{color:'var(--color-text)'}}>{window.location.origin}/api/health-ingest</code></li>
            <li>Header: <code style={{color:'var(--color-text)'}}>X-Ingest-Secret</code> = your INGEST_SECRET value</li>
            <li>Schedule: Hourly + On workout completion</li>
          </ol>
        </Section>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add api/settings.js src/screens/Settings.jsx
git commit -m "feat: Settings screen with cycle tracking (Julie), HAE guide (Ahmed), budget bars"
```

---

### Task 19: Setup flow — 7 steps

**Files:** Modify `src/screens/Setup.jsx`

- [ ] **Step 1: Write `src/screens/Setup.jsx`**

```jsx
import { useState, useEffect } from 'react'
const IS_JULIE = import.meta.env.VITE_USER_NAME === 'julie'
const VAPID_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
function urlB64ToUint8(b64) {
  const padding='='.repeat((4-b64.length%4)%4), base64=(b64+padding).replace(/-/g,'+').replace(/_/g,'/')
  return new Uint8Array([...atob(base64)].map(c=>c.charCodeAt(0)))
}

export default function Setup({ onComplete }) {
  const steps = IS_JULIE ? [1,2,4,5,6,7] : [1,2,3,4,5,6,7]
  const [idx, setIdx] = useState(0)
  const step = steps[idx]
  const [name, setName] = useState('')
  const [target, setTarget] = useState(4)
  const [visionCap, setVisionCap] = useState(150)
  const [standalone, setStandalone] = useState(false)
  useEffect(()=>{ const chk=()=>setStandalone(!!window.navigator.standalone); chk(); const id=setInterval(chk,2000); return ()=>clearInterval(id) },[])
  const next = () => { if (idx<steps.length-1) setIdx(i=>i+1) }
  const save = patch => fetch('/api/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(patch)})
  const requestPush = async () => {
    try {
      const perm = await Notification.requestPermission()
      if (perm==='granted') {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlB64ToUint8(VAPID_KEY)})
        await fetch('/api/push/subscribe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(sub.toJSON())})
      }
    } catch {}
    next()
  }

  const STEPS = {
    1: <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Welcome to Health OS</h2><p className="mt-2 text-sm" style={{color:'var(--color-muted)'}}>Your personal health super app.</p></div>
      <div className="space-y-2"><label className="text-sm font-medium">Your name</label>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ahmed"
          className="w-full px-4 py-3 rounded-2xl text-lg outline-none"
          style={{background:'var(--color-surface)',color:'var(--color-text)',border:'1px solid #30363d'}} /></div>
      <button onClick={async()=>{ if(!name.trim())return; localStorage.setItem('health_name',name); await save({name}); next() }}
        disabled={!name.trim()} className="w-full py-4 rounded-2xl font-bold disabled:opacity-40"
        style={{background:'var(--color-accent)',color:'#0d1117'}}>Continue →</button>
    </div>,
    2: <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Add to Home Screen</h2><p className="mt-2 text-sm" style={{color:'var(--color-muted)'}}>Required for push notifications on iOS.</p></div>
      {standalone ? <div className="rounded-2xl p-4 flex items-center gap-3" style={{background:'#10b98122',border:'1px solid var(--color-accent)'}}>
        <span className="text-2xl">✅</span><p className="text-sm font-medium" style={{color:'var(--color-accent)'}}>Running from home screen!</p>
      </div> : <div className="rounded-2xl p-4 space-y-2" style={{background:'var(--color-surface)'}}>
        <ol className="text-sm space-y-1 list-decimal list-inside" style={{color:'var(--color-muted)'}}>
          <li>Tap the <strong style={{color:'var(--color-text)'}}>Share</strong> button in Safari</li>
          <li>Tap <strong style={{color:'var(--color-text)'}}>Add to Home Screen</strong></li>
          <li>Open the app from your home screen</li>
        </ol>
        <p className="text-xs" style={{color:'var(--color-muted)'}}>Waiting…</p>
      </div>}
      <button onClick={next} disabled={!standalone} className="w-full py-4 rounded-2xl font-bold disabled:opacity-40" style={{background:'var(--color-accent)',color:'#0d1117'}}>Continue →</button>
    </div>,
    3: <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Connect Apple Watch</h2><p className="mt-2 text-sm" style={{color:'var(--color-muted)'}}>Health Auto Export sends Watch data automatically.</p></div>
      <div className="rounded-2xl p-4 space-y-2" style={{background:'var(--color-surface)'}}>
        <ol className="text-sm space-y-1 list-decimal list-inside" style={{color:'var(--color-muted)'}}>
          <li>Install Health Auto Export from App Store</li>
          <li>Purchase Premium Annual ($6.99/yr)</li>
          <li>REST API URL: <code className="text-xs" style={{color:'var(--color-text)'}}>{window.location.origin}/api/health-ingest</code></li>
          <li>Schedule: Hourly + On workout completion</li>
        </ol>
        <p className="text-xs mt-2" style={{color:'var(--color-muted)'}}>You can set this up later — app works with manual input now.</p>
      </div>
      <button onClick={next} className="w-full py-4 rounded-2xl font-bold" style={{background:'var(--color-accent)',color:'#0d1117'}}>Continue →</button>
    </div>,
    4: <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Enable Notifications</h2></div>
      <div className="space-y-2">
        {['🌅 7:00am — Morning brief + recovery score','🏋️ 6:00pm — Workout reminder (if needed)','📊 Sunday 7pm — Weekly health report'].map((item,i)=>(
          <div key={i} className="rounded-xl p-3" style={{background:'var(--color-surface)'}}><p className="text-sm">{item}</p></div>
        ))}
      </div>
      <button onClick={requestPush} className="w-full py-4 rounded-2xl font-bold" style={{background:'var(--color-accent)',color:'#0d1117'}}>Enable Notifications</button>
      <button onClick={next} className="w-full py-2 text-sm" style={{color:'var(--color-muted)'}}>Skip for now</button>
    </div>,
    5: <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Workout Goal</h2><p className="mt-2 text-sm" style={{color:'var(--color-muted)'}}>Workouts per week?</p></div>
      <div className="flex items-center justify-center gap-6">
        <button onClick={()=>setTarget(t=>Math.max(1,t-1))} className="w-14 h-14 rounded-full text-2xl font-bold" style={{background:'var(--color-surface)'}}>−</button>
        <span className="text-5xl font-bold" style={{color:'var(--color-accent)'}}>{target}</span>
        <button onClick={()=>setTarget(t=>Math.min(7,t+1))} className="w-14 h-14 rounded-full text-2xl font-bold" style={{background:'var(--color-surface)'}}>+</button>
      </div>
      <button onClick={async()=>{ await save({workout_target:target}); next() }} className="w-full py-4 rounded-2xl font-bold" style={{background:'var(--color-accent)',color:'#0d1117'}}>Continue →</button>
    </div>,
    6: <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">Meal Photo Budget</h2><p className="mt-2 text-sm" style={{color:'var(--color-muted)'}}>Monthly limit for AI meal analysis.</p></div>
      <input type="range" min={50} max={150} step={25} value={visionCap} onChange={e=>setVisionCap(parseInt(e.target.value))} className="w-full accent-emerald-400" />
      <p className="text-center text-2xl font-bold" style={{color:'var(--color-accent)'}}>${(visionCap/100).toFixed(2)}<span className="text-sm font-normal" style={{color:'var(--color-muted)'}}>/mo</span></p>
      <button onClick={async()=>{ await save({vision_cap_cents:visionCap}); next() }} className="w-full py-4 rounded-2xl font-bold" style={{background:'var(--color-accent)',color:'#0d1117'}}>Continue →</button>
    </div>,
    7: <div className="space-y-6 text-center">
      <div className="text-6xl">🎉</div>
      <div><h2 className="text-2xl font-bold">You're all set!</h2><p className="mt-2 text-sm" style={{color:'var(--color-muted)'}}>Health OS is ready. Watch data flows in automatically.</p></div>
      <button onClick={onComplete} className="w-full py-4 rounded-2xl font-bold" style={{background:'var(--color-accent)',color:'#0d1117'}}>Open Health OS →</button>
    </div>,
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{background:'var(--color-bg)'}}>
      <div className="w-full max-w-sm space-y-6">
        <div className="flex gap-1.5 justify-center">
          {steps.map((_,i)=><div key={i} className="h-1.5 rounded-full transition-all" style={{width:i===idx?24:8,background:i<=idx?'var(--color-accent)':'#30363d'}} />)}
        </div>
        {STEPS[step]}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/Setup.jsx
git commit -m "feat: 7-step setup flow with home-screen gate and push permission"
```

---

## Phase 5 — Push + Cron + Deploy

### Task 20: src/sw.js — service worker

**Files:** Create `src/sw.js`

- [ ] **Step 1: Write `src/sw.js`**

```js
import { precacheAndRoute } from 'workbox-precaching'
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)
  if (url.pathname.startsWith('/api/') || url.pathname==='/sw.js') return
})

self.addEventListener('push', event => {
  const data = event.data?.json()??{}
  event.waitUntil(self.registration.showNotification(data.title||'Health OS', {
    body:data.body||'', icon:'/icon-192.png', badge:'/icon-192.png', data:{url:data.url||'/'}
  }))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data?.url||'/'))
})
```

- [ ] **Step 2: Run `npm run build`** — expected: `dist/sw.js` present, no errors

- [ ] **Step 3: Commit**

```bash
git add src/sw.js
git commit -m "feat: service worker with push handler and Workbox precache"
```

---

### Task 21: Push subscribe + send endpoints

**Files:** Create `api/push/subscribe.js`, `api/push/send.js`

- [ ] **Step 1: Write `api/push/subscribe.js`**

```js
import { kv } from '@vercel/kv'
export const config = { runtime:'edge' }
export default async function handler(req) {
  if (req.method!=='POST') return new Response('Method Not Allowed',{status:405})
  await kv.set('push:subscription', await req.json())
  return new Response(JSON.stringify({ok:true}),{headers:{'content-type':'application/json'}})
}
```

- [ ] **Step 2: Write `api/push/send.js`**

Note: `web-push` requires Node.js runtime (uses Node crypto).

```js
import webpush from 'web-push'
import { kv } from '@vercel/kv'
export const config = { runtime:'nodejs' }

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

export default async function handler(req, res) {
  if (req.method!=='POST') return res.status(405).end()
  if (req.headers['x-cron-secret']!==process.env.CRON_SECRET) return res.status(401).end()
  const { title, body, url='/' } = req.body??{}
  const sub = await kv.get('push:subscription')
  if (!sub) return res.json({sent:false,reason:'no_subscription'})
  try {
    await webpush.sendNotification(sub, JSON.stringify({title,body,url}))
    return res.json({sent:true})
  } catch(err) {
    if (err.statusCode===410) await kv.del('push:subscription')
    return res.json({sent:false,reason:err.message})
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add api/push/
git commit -m "feat: push subscribe and send endpoints with VAPID auth"
```

---

### Task 22: Cron endpoints

**Files:** Create `api/cron/morning.js`, `api/cron/evening.js`, `api/cron/weekly.js`

- [ ] **Step 1: Write `api/cron/morning.js`**

```js
import { kv } from '@vercel/kv'
export const config = { runtime:'edge' }
export default async function handler(req) {
  const s = req.headers.get('x-vercel-cron-secret')??req.headers.get('authorization')?.replace('Bearer ','')
  if (s!==process.env.CRON_SECRET) return new Response('Unauthorized',{status:401})
  const origin = new URL(req.url).origin
  const brief = await fetch(`${origin}/api/brief`).then(r=>r.json())
  if (brief?.headline) {
    await fetch(`${origin}/api/push/send`,{method:'POST',
      headers:{'content-type':'application/json','x-cron-secret':process.env.CRON_SECRET},
      body:JSON.stringify({title:'Health OS',body:brief.headline,url:'/'})})
  }
  return new Response(JSON.stringify({ok:true,brief_generated:!!brief?.headline}),{headers:{'content-type':'application/json'}})
}
```

- [ ] **Step 2: Write `api/cron/evening.js`**

```js
import { kv } from '@vercel/kv'
import { isoDate } from '../../src/lib/kv.js'
export const config = { runtime:'edge' }
export default async function handler(req) {
  const s = req.headers.get('x-vercel-cron-secret')??req.headers.get('authorization')?.replace('Bearer ','')
  if (s!==process.env.CRON_SECRET) return new Response('Unauthorized',{status:401})
  const strength = await kv.get(`health:${isoDate()}:strength`)
  const hasWorkedOut = (strength?.workouts?.length??0)>0
  const isSunday = new Date().getDay()===0
  let reminded = false
  if (!hasWorkedOut && !isSunday) {
    const origin = new URL(req.url).origin
    await fetch(`${origin}/api/push/send`,{method:'POST',
      headers:{'content-type':'application/json','x-cron-secret':process.env.CRON_SECRET},
      body:JSON.stringify({title:'Health OS',body:'No workout logged yet today — still time!',url:'/'})})
    reminded = true
  }
  return new Response(JSON.stringify({ok:true,reminded}),{headers:{'content-type':'application/json'}})
}
```

- [ ] **Step 3: Write `api/cron/weekly.js`**

```js
export const config = { runtime:'edge' }
export default async function handler(req) {
  const s = req.headers.get('x-vercel-cron-secret')??req.headers.get('authorization')?.replace('Bearer ','')
  if (s!==process.env.CRON_SECRET) return new Response('Unauthorized',{status:401})
  const origin = new URL(req.url).origin
  const report = await fetch(`${origin}/api/report?force=1`,{headers:{'x-cron-secret':process.env.CRON_SECRET}}).then(r=>r.json())
  if (report?.summary) {
    await fetch(`${origin}/api/push/send`,{method:'POST',
      headers:{'content-type':'application/json','x-cron-secret':process.env.CRON_SECRET},
      body:JSON.stringify({title:'Your Weekly Report is Ready',body:report.win||'Tap to see your week',url:'/history'})})
  }
  return new Response(JSON.stringify({ok:true,report_generated:!!report?.summary}),{headers:{'content-type':'application/json'}})
}
```

- [ ] **Step 4: Commit**

```bash
git add api/cron/
git commit -m "feat: cron jobs — morning brief, evening workout reminder, Sunday weekly report"
```

---

### Task 23: Pillar detail view (full version)

**Files:** Modify `src/components/pillars/PillarDetail.jsx`

- [ ] **Step 1: Write full `src/components/pillars/PillarDetail.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Sparkline from '../ui/Sparkline.jsx'
import { PILLAR_CONFIGS } from './pillarConfigs.js'

function SetsLogger({ date, onSave }) {
  const [sets, setSets] = useState([{exercise:'',sets:3,reps:10,weight_kg:0}])
  const save = async () => {
    await fetch('/api/today-log',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({type:'sets',date,data:{sets}})})
    onSave()
  }
  return (
    <div className="space-y-2 mt-3">
      {sets.map((row,i) => (
        <div key={i} className="flex gap-1">
          <input placeholder="Exercise" value={row.exercise} onChange={e=>setSets(s=>s.map((r,j)=>j===i?{...r,exercise:e.target.value}:r))}
            className="flex-1 px-2 py-1.5 rounded-lg text-xs outline-none"
            style={{background:'#0d1117',color:'var(--color-text)',border:'1px solid #30363d'}} />
          {['sets','reps','weight_kg'].map(field=>(
            <input key={field} type="number" placeholder={field==='weight_kg'?'kg':field} value={row[field]}
              onChange={e=>setSets(s=>s.map((r,j)=>j===i?{...r,[field]:parseFloat(e.target.value)}:r))}
              className="w-14 px-2 py-1.5 rounded-lg text-xs outline-none text-center"
              style={{background:'#0d1117',color:'var(--color-text)',border:'1px solid #30363d'}} />
          ))}
        </div>
      ))}
      <div className="flex gap-2">
        <button onClick={()=>setSets(s=>[...s,{exercise:'',sets:3,reps:10,weight_kg:0}])} className="text-xs px-3 py-1.5 rounded-lg" style={{background:'#30363d',color:'var(--color-muted)'}}>+ Add set</button>
        <button onClick={save} className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{background:'var(--color-accent)',color:'#0d1117'}}>Save</button>
      </div>
    </div>
  )
}

export default function PillarDetail({ pillarId, data, onClose }) {
  const [history, setHistory] = useState([])
  const [showSets, setShowSets] = useState(false)
  const cfg = PILLAR_CONFIGS.find(c=>c.id===pillarId)
  const today = new Date().toISOString().slice(0,10)
  useEffect(()=>{ if(pillarId) fetch(`/api/history?pillar=${pillarId}`).then(r=>r.json()).then(setHistory) },[pillarId])

  return (
    <AnimatePresence>
      {pillarId && (
        <>
          <motion.div className="fixed inset-0 z-40" style={{background:'rgba(0,0,0,0.6)'}}
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} />
          <motion.div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            style={{background:'var(--color-surface)'}}
            initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
            transition={{type:'spring',stiffness:300,damping:30}}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{cfg?.emoji} {cfg?.label}</h2>
              <button onClick={onClose} className="text-xl" style={{color:'var(--color-muted)'}}>✕</button>
            </div>
            <div className="text-center py-2">
              <p className="text-5xl font-bold" style={{color:cfg?.color}}>{data?.score??'—'}</p>
              <p className="text-sm mt-1" style={{color:'var(--color-muted)'}}>Today</p>
            </div>
            {pillarId==='hrv' && data?.signal && (
              <div className="rounded-xl p-3" style={{background:data.signal==='green'?'#10b98122':data.signal==='red'?'#ef444422':'#f59e0b22',border:`1px solid ${data.signal==='green'?'var(--color-accent)':data.signal==='red'?'var(--color-danger)':'var(--color-warning)'}`}}>
                <p className="text-sm font-medium">{data.signal==='green'?'Ready to train hard':data.signal==='red'?'Push light today':'Train as planned'}{data.luteal_adjusted&&<span className="text-xs ml-1" style={{color:'var(--color-muted)'}}>(Luteal)</span>}</p>
                <p className="text-xs mt-1" style={{color:'var(--color-muted)'}}>HRV: {data.hrv_ms}ms · Baseline: {data.baseline?.mean}ms</p>
              </div>
            )}
            {pillarId==='sleep' && data?.stages && (
              <div className="space-y-1.5">
                {Object.entries(data.stages).map(([stage,hours])=>(
                  <div key={stage}>
                    <div className="flex justify-between text-xs mb-0.5" style={{color:'var(--color-muted)'}}><span className="capitalize">{stage}</span><span>{hours?.toFixed(1)}h</span></div>
                    <div className="h-1.5 rounded-full" style={{background:'#30363d'}}>
                      <div className="h-full rounded-full" style={{width:`${Math.min(100,(hours/(data.total_hours||8))*100)}%`,background:stage==='deep'?'#818cf8':stage==='rem'?'#f87171':'#10b981'}} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {pillarId==='strength' && (
              <div className="space-y-2">
                {(data?.workouts??[]).map((w,i)=>(
                  <div key={i} className="rounded-xl p-3" style={{background:'#0d1117'}}>
                    <p className="text-sm font-medium">{w.type||'Workout'}</p>
                    <p className="text-xs mt-0.5" style={{color:'var(--color-muted)'}}>{w.duration_min}min · {w.calories} kcal</p>
                  </div>
                ))}
                {!showSets ? <button onClick={()=>setShowSets(true)} className="text-sm font-medium" style={{color:'var(--color-accent)'}}>+ Log sets & reps</button>
                  : <SetsLogger date={today} onSave={()=>setShowSets(false)} />}
              </div>
            )}
            {history.length>1 && (
              <div><p className="text-sm font-semibold mb-2" style={{color:'var(--color-muted)'}}>30 days</p>
                <Sparkline data={history} color={cfg?.color||'var(--color-accent)'} /></div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/pillars/PillarDetail.jsx
git commit -m "feat: pillar detail — sparkline, HRV callout, sleep breakdown, sets logger"
```

---

### Task 24: Integration tests + build check

**Files:** Create `src/integration.test.jsx`

- [ ] **Step 1: Write `src/integration.test.jsx`**

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Pillar from './components/pillars/Pillar.jsx'
import { PILLAR_CONFIGS } from './components/pillars/pillarConfigs.js'
import ChipSelect from './components/ui/ChipSelect.jsx'

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok:true, json:async()=>({}) })
  localStorage.clear()
})

describe('Pillar', () => {
  it('renders dash when data null', () => {
    render(<Pillar config={PILLAR_CONFIGS[0]} data={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
  it('renders score', () => {
    render(<Pillar config={PILLAR_CONFIGS[0]} data={{score:81}} />)
    expect(screen.getByText('81')).toBeInTheDocument()
  })
  it('calls onTap with id', async () => {
    const user=userEvent.setup(), onTap=vi.fn()
    render(<Pillar config={PILLAR_CONFIGS[0]} data={{score:81}} onTap={onTap} />)
    await user.click(screen.getByRole('button'))
    expect(onTap).toHaveBeenCalledWith('sleep')
  })
})

describe('ChipSelect', () => {
  it('selects chip', async () => {
    const user=userEvent.setup(), onChange=vi.fn()
    render(<ChipSelect options={[{id:'alcohol',emoji:'🍷',label:'Alcohol'}]} selected={[]} onChange={onChange} />)
    await user.click(screen.getByText(/Alcohol/))
    expect(onChange).toHaveBeenCalledWith(['alcohol'])
  })
})
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: All test files pass: `kv.test.js`, `scoring.test.js`, `hrv.test.js`, `cost.test.js`, `Ring.test.jsx`, `integration.test.jsx`

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: No errors. `dist/` contains `index.html`, `sw.js`, `icon-192.png`, `icon-512.png`.

- [ ] **Step 4: Verify all files exist**

```bash
ls api/health-ingest.js api/today.js api/brief.js api/report.js api/vision.js api/settings.js api/history.js api/today-log.js
ls api/push/subscribe.js api/push/send.js
ls api/cron/morning.js api/cron/evening.js api/cron/weekly.js
ls src/screens/Today.jsx src/screens/History.jsx src/screens/Nutrition.jsx src/screens/Settings.jsx src/screens/Setup.jsx
ls src/lib/kv.js src/lib/scoring.js src/lib/hrv.js src/lib/cost.js src/lib/prompts.js
```

Expected: No "No such file" errors.

- [ ] **Step 5: Commit**

```bash
git add src/integration.test.jsx
git commit -m "test: integration tests for Pillar, ChipSelect"
```

---

### Task 25: Deployment guide

**Files:** Create `docs/deployment.md`

- [ ] **Step 1: Create `docs/deployment.md`**

```markdown
# Deployment Guide

## Generate VAPID keys (one-time)
npx web-push generate-vapid-keys
# Save output — same keys go into both Vercel projects

## Ahmed's Instance
1. vercel link  (project name: ahmed-health)
2. Set env vars in Vercel dashboard → Settings → Environment Variables:
   USER_NAME=ahmed, VITE_USER_NAME=ahmed,
   ANTHROPIC_API_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
   VAPID_SUBJECT=mailto:ahmed.sobhy3696@gmail.com,
   VITE_VAPID_PUBLIC_KEY (same as VAPID_PUBLIC_KEY),
   CRON_SECRET (random 32 chars), INGEST_SECRET (random 32 chars)
3. Vercel dashboard → Storage → Create KV → "ahmed-health-kv" → link to project
4. vercel --prod
5. Configure Health Auto Export on Ahmed's iPhone:
   URL: https://ahmed-health.vercel.app/api/health-ingest
   Header: X-Ingest-Secret: <INGEST_SECRET>
   Schedule: Hourly + On workout completion

## Julie's Instance
1. vercel link  (project name: julie-health)
2. Same env vars but USER_NAME=julie, VITE_USER_NAME=julie, different CRON_SECRET/INGEST_SECRET
3. Create separate KV: "julie-health-kv"
4. vercel --prod

## Verify crons
Vercel dashboard → project → Settings → Cron Jobs
Expect: 3 jobs (0 7 * * *, 0 18 * * *, 0 19 * * 0)
```

- [ ] **Step 2: Final commit**

```bash
git add docs/deployment.md
git commit -m "docs: Vercel deployment guide for Ahmed and Julie instances"
```

---

## Spec Coverage

| Requirement | Task |
|---|---|
| Two independent PWAs, one codebase | Tasks 2, 25 |
| Health Auto Export → /api/health-ingest | Task 8 |
| 6 pillars with animated rings | Tasks 4, 10, 11 |
| HRV 7/30-day baseline calibration | Tasks 5, 8 |
| Luteal HRV correction (Julie) | Tasks 5, 8, 18 |
| Behavior tags | Task 12 |
| Mood + felt energy | Task 12 |
| Weight log | Task 12 |
| Sets/reps/weight strength logging | Task 23 |
| Morning brief (Haiku) | Task 13 |
| Vision meal analysis (Sonnet, $1.50 cap) | Task 14 |
| Weekly report (Opus, Sunday) | Task 15 |
| $3/month AI cap — atomic enforce | Tasks 6, 13–15 |
| History 30-day charts | Task 16 |
| Push notifications (3 types) | Tasks 20–22 |
| iOS home screen install gate | Task 19 step 2 |
| 7-step setup flow | Task 19 |
| Settings screen | Task 18 |
| Cycle tracking (Julie) | Tasks 18, 19 |
| HAE guide (Ahmed) | Tasks 18, 19 |
| Pillar detail views + sleep/HRV breakdown | Task 23 |
| Deployment guide | Task 25 |

All 25 tasks are complete. No placeholders. All function names consistent:
- `appendToBaseline` defined Task 5 → used Task 8
- `withAIBudget` defined Task 6 → used Tasks 13–15
- `buildBriefPrompt` defined Task 7 → used Task 13
- `buildReportPrompt` defined Task 7 → used Task 15
- `buildVisionPrompt` defined Task 7 → used Task 14
- `computeBaselineStats` defined Task 5 → used Task 13
