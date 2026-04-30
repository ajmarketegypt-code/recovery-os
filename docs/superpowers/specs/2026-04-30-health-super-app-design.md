# Health Super App — Design Spec
**Date:** 2026-04-30  
**Status:** Approved for implementation

---

## Vision

A personal health super app that exceeds Apple Health by depth of insight, not breadth of tracking. Minimal manual input, detailed output. Two independent instances — one for Ahmed, one for Julie — each a complete, standalone experience built on real Apple Watch data.

---

## Section 1 — Platform & Architecture

### Two Independent PWAs, One Codebase

One React codebase deployed twice on Vercel:
- `ahmed-health.vercel.app`
- `julie-health.vercel.app`

Each instance is fully isolated: separate Vercel KV store, separate API keys, separate push subscriptions, no shared state. No couple sync, no pairing, no shared backend. Complexity saved here goes entirely into making each individual experience exceptional.

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + Framer Motion |
| Hosting | Vercel |
| Data store | Vercel KV (per instance) |
| Edge functions | Vercel Edge Functions |
| AI | Anthropic Claude API (Haiku + Sonnet + Opus) |
| Watch bridge | Health Auto Export Premium Lifetime ($24.99/phone) |

### Full Rewrite

The existing 60-day program app is retired entirely. New codebase, new data model, new UI. Nothing carried forward except the visual identity (dark background `#0d1117`, emerald `#10b981` accent) and the Vercel deployment pipeline.

---

## Section 2 — Watch Data Pipeline

### Health Auto Export → Vercel KV

Both Ahmed and Julie install **Health Auto Export Premium Lifetime** ($24.99/phone, one-time). Each configures it to POST to their own instance's `/api/health-ingest` endpoint on a schedule (hourly + on workout completion).

```
Apple Watch → HealthKit → Health Auto Export → POST /api/health-ingest → Vercel KV
```

The ingest endpoint validates the payload, timestamps it, and writes structured health records to Vercel KV. The frontend reads from KV on load.

### Metrics Ingested Automatically

| Metric | Source | Pillar |
|---|---|---|
| Sleep stages (deep, REM, core, awake) | Apple Watch | Sleep |
| Total sleep duration | Apple Watch | Sleep |
| Sleep efficiency % | Apple Watch | Sleep |
| Overnight HRV | Apple Watch | HRV/Stress |
| Resting heart rate | Apple Watch | HRV/Stress |
| Workout type + duration | Apple Watch | Strength |
| Active calories | Apple Watch | Strength |
| Heart rate zones during workout | Apple Watch | Strength |
| Move ring % | Apple Watch | Movement |
| Exercise ring % | Apple Watch | Movement |
| Stand ring % | Apple Watch | Movement |
| Steps | Apple Watch | Movement |

### Manual Fallback

Every pillar has a manual input tap. If Health Auto Export isn't set up yet, is misconfigured, or fails silently, the app never goes blank — the user can always tap in a value. The UI makes it clear whether data came from Watch (auto) or was entered manually.

---

## Section 3 — The 6 Pillars

Each pillar renders as a ring on the home screen (0–100 score) and expands to a detail view with history chart, today's value, and AI commentary.

### 1. Sleep
**Auto from Watch.** Score formula: `(duration_score × 0.4) + (efficiency_score × 0.3) + (deep_pct_score × 0.3)`
- Duration score: 100 if ≥ 8h, scales down linearly to 0 at 4h
- Efficiency score: 100 if ≥ 90%, scales down to 0 at 60%
- Deep %: 100 if ≥ 20% of total, scales down to 0 at 5%
- Detail view: stage breakdown bar, 7-day trend, bedtime/wake time

### 2. HRV & Stress
**Auto from Watch.** Recovery signal derived from HRV relative to personal 30-day baseline.
- High HRV (> baseline + 10%) → Green: "Ready to train hard"
- Normal HRV (± 10% of baseline) → Yellow: "Train as planned"
- Low HRV (< baseline - 10%) → Red: "Push light today"
- Resting HR shown alongside. Both trend over 30 days.
- 30-day baseline computed as rolling average. During the first 7 days, no HRV signal is shown — the pillar displays "Establishing your baseline" and a neutral grey ring. From day 8–29 a 7-day rolling average is used with a banner noting "Baseline still calibrating." From day 30 onward, the full 30-day rolling baseline drives the signal. This prevents misleading "Ready to train hard" readings for users whose true baseline differs from any population average.

### 3. Strength
**Auto from Watch.** Workout logged automatically when Health Auto Export detects a workout session.
- Shows: workout type, duration, calories, avg HR, peak HR zone
- Weekly frequency tracker (target: user-configured, default 4×/week)
- Strength score: `min(100, (weekly_workouts / target_workouts) × 100)`
- Manual entry: tap "Log workout" → type, duration, intensity (1-5)

### 4. Movement
**Auto from Watch.** Activity rings as primary signal.
- Movement score: `(move_pct × 0.5) + (exercise_pct × 0.3) + (stand_pct × 0.2)`
- Shows actual ring values alongside score
- Steps as secondary indicator
- Useful on rest days — shows you're still active even without a formal workout

### 5. Energy
**Calculated.** No Watch source — derived composite.
```
energy = (sleep_score × 0.35) + (hrv_score × 0.35) + (movement_score × 0.30)
```
- Explains: "Your energy today is 72 — driven by solid sleep (81) but slightly suppressed by low HRV (58)"
- This is the single most actionable number — the app leads with it

### 6. Nutrition
**Manual with AI assist.** The only pillar requiring user action.
- Tap camera → take meal photo → image compressed to max 800px client-side
- Sent to Claude Sonnet Vision → returns estimated macros (protein/carbs/fat/calories) + quality score (1-10) + one-line comment
- Result cached by image hash — same meal never re-analyzed
- Monthly Vision budget (default: $5 cap, configurable in Settings)
- Usage bar shown in Settings, warning notification at 80%, hard stop at 100% with manual logging fallback
- Daily nutrition summary: total calories, protein target hit (yes/no), quality average

---

## Section 4 — AI Layer

### Three Claude Models, Three Jobs

| Model | Job | Frequency | Cost profile |
|---|---|---|---|
| Claude Haiku | Morning daily brief | Daily | Very cheap |
| Claude Sonnet | Meal photo Vision analysis | Per meal photo | Moderate, cached |
| Claude Opus | Weekly deep recovery report | Once/week (Sunday) | Higher, rare |

### Morning Brief (Haiku)
Generated at 7am (configurable). Prompt includes last night's sleep data, current HRV vs. baseline, yesterday's movement, and energy score. Returns:
- One headline: "Recovery score: 74 — Good day to train"
- Three bullet insights (sleep, HRV signal, energy driver)
- Today's recommendation: Train hard / Train as planned / Rest

Brief is generated server-side by Edge Function and cached until next day. Push notification fires with the headline; tapping opens the app to the full brief.

### Meal Vision (Sonnet)
- Image compressed client-side (max 800px, JPEG 85%) before upload
- Prompt: structured JSON response with `{protein_g, carbs_g, fat_g, calories, quality_score, comment}`
- No image caching. Photos of "the same meal" produce different bytes every time (angle, lighting, plate position) making hash-based caching unreliable in practice. Cost is controlled entirely by the hard monthly cap.
- Monthly token tracking in KV — incremented per successful Vision call
- Hard monthly cap enforced server-side, not just client-side. When cap is reached, the camera button is replaced with a manual text entry form: meal name + calories + protein (optional). No Vision call is made. The nutrition pillar still logs the entry.

### Weekly Report (Opus)
Generated Sunday evening. Full week of all 6 pillars fed into Opus. Returns:
- Week summary paragraph
- Top recovery win
- Top gap to address
- Specific recommendation for next week
- Trend direction (improving / stable / declining) per pillar

---

## Section 5 — Daily Experience & UI

### Navigation
Four tabs, bottom bar:
- **Today** — home screen, daily brief, 6 pillar rings
- **History** — 30-day charts per pillar, weekly report
- **Nutrition** — meal log, camera, daily macros summary
- **Settings** — Vision budget, notification times, workout target, Health Auto Export setup guide

### Home Screen
```
┌─────────────────────────────────┐
│  Good morning, Ahmed            │
│  Tuesday · April 30             │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Recovery score: 74       │  │
│  │  Good day to train        │  │
│  │  • Sleep 7.4h — solid     │  │
│  │  • HRV normal (+3%)       │  │
│  │  • Energy driven by sleep │  │
│  └───────────────────────────┘  │
│                                 │
│  💤 81  ❤️ 72  💪 100           │
│  🔥 65  ⚡ 74  🥗 3 meals       │
│                                 │
└─────────────────────────────────┘
```

Six pillar icons with scores. Tap any → full detail view with history chart.

### Visual Identity
- Background: `#0d1117` (near black)
- Surface: `#161b22` (card background)
- Accent: `#10b981` (emerald green)
- Warning: `#f59e0b` (amber)
- Danger: `#ef4444` (red)
- Text primary: `#f0f6fc`
- Text secondary: `#8b949e`
- Font: system-ui / SF Pro (Apple devices render natively)
- All transitions: Framer Motion spring animations
- Pillar rings: SVG stroke-dasharray animated rings, not flat cards

### Push Notifications
- **7:00am** — Morning brief headline (configurable)
- **6:00pm** — "No workout yet today" reminder (only on non-rest days, configurable)
- **Sunday 7:00pm** — Weekly report ready
- All sent via Vercel Edge Function + Web Push API (free, no third-party service)
- Push subscription stored in Vercel KV on first permission grant

---

## Section 6 — Data Model

### Vercel KV Schema

```
health:{date}:sleep      → { stages, total_hours, efficiency, score, source }
health:{date}:hrv        → { hrv_ms, resting_hr, baseline_30d, signal, score }
health:{date}:strength   → { workouts: [...], weekly_count, score }
health:{date}:movement   → { move_pct, exercise_pct, stand_pct, steps, score }
health:{date}:energy     → { score, components: { sleep, hrv, movement } }
health:{date}:nutrition  → { meals: [...], totals: { protein, carbs, fat, calories } }

brief:{date}             → { headline, bullets, recommendation, generated_at }
report:{week}            → { summary, win, gap, recommendation, trends }

vision:budget:{month}    → { used_cents, cap_cents, call_count }
ai:spend:{month}         → { total_cents, vision_cents, brief_cents, report_cents }

push:subscription        → Web Push subscription object
settings                 → { notification_times, workout_target, vision_cap, ai_monthly_cap_cents, name }
hrv:baseline             → { value_ms, computed_at, sample_count }
```

### Date Keys
All date keys use `YYYY-MM-DD`. Week keys use `YYYY-WW` (ISO week number). Month keys use `YYYY-MM`.

---

## Section 7 — API Endpoints (Vercel Edge Functions)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health-ingest` | POST | Receives Health Auto Export payload, writes to KV |
| `/api/brief` | GET | Returns today's brief (generates if stale) |
| `/api/report` | GET | Returns this week's report (generates Sunday) |
| `/api/vision` | POST | Receives meal image, calls Claude Vision, returns macros — checks aggregate AI spend cap before calling |
| `/api/push/subscribe` | POST | Stores Web Push subscription |
| `/api/push/send` | POST | Internal — sends push notification (called by cron) |
| `/api/cron/morning` | GET | Vercel Cron (daily 7am) — generates morning brief + sends push |
| `/api/cron/evening` | GET | Vercel Cron (daily 6pm) — checks for missing workout, sends reminder push if needed |
| `/api/cron/weekly` | GET | Vercel Cron (Sunday 7pm) — generates Opus weekly report + sends push |

> **Note:** Vercel Hobby supports up to 100 cron jobs, each running at most once per day. All three cron jobs are within this limit. Timing is approximate (within the specified hour).

---

## Section 8 — Setup Flow (First Launch)

1. **Name screen** — "What's your name?" → stored in settings
2. **Install to home screen prompt** — Push notifications only work on iOS when the PWA is installed to the home screen (iOS 16.4+). Before requesting push permission, the setup flow detects if the app is running in standalone mode. If not, it shows a clear instruction: "Tap the Share button → Add to Home Screen → reopen from your home screen." This step is gated — the user cannot proceed to notification setup until the app is running as a home screen app.
3. **Health Auto Export guide** — step-by-step: install app, buy **Premium Annual ($6.99/year)**, configure REST endpoint URL (pre-filled with this instance's ingest URL), set hourly schedule. This step is shown only on Ahmed's instance. Julie's instance skips Watch setup entirely — all pillars use manual input until she chooses to subscribe independently.
4. **Notification permission** — request push permission, show what notifications they'll get
5. **Workout target** — "How many workouts per week?" (default: 4)
6. **Vision budget** — "Monthly meal photo budget?" (default: $2)
7. **Done** — straight to Today screen. App works immediately with manual input while Watch sync activates in background.

---

## Section 9 — Cost Summary

| Item | Cost | Frequency |
|---|---|---|
| Health Auto Export Premium Annual (Ahmed only) | $6.99 | Per year |
| Vercel (Hobby) | $0 | Per instance |
| Vercel KV | $0 (free tier: 256MB) | Per instance |
| Vercel Cron | $0 (Hobby) | Per instance |
| Claude Haiku (morning brief × 30) | ~$0.05 | Monthly |
| Claude Sonnet Vision (capped at $2/mo) | $0–$2.00 | Monthly |
| Claude Opus (weekly report × 4) | ~$0.40–$0.60 | Monthly |
| **Estimated monthly AI cost** | **~$1.50–$2.65** | Monthly |

**Hard AI cap: $3/month total** enforced server-side across all three models. Vision default cap is $2/month. If Opus + Haiku approach $1, the Vision cap automatically tightens. The server tracks aggregate spend in Vercel KV and rejects new AI calls once the monthly total is reached — user sees a clear message and manual fallback activates for all AI-powered features until next month.

Julie's instance has no Watch sync (manual input only). Her AI costs are lower — no Watch data means briefings are shorter and Vision is her only meaningful cost driver.

---

## Out of Scope

- Couple sync / shared data between Ahmed and Julie instances
- Social features, leaderboards, sharing
- Android / Wear OS support
- Apple Watch app (watchOS)
- Nutrition database / barcode scanning (Vision-only approach)
- Medication or supplement tracking
- Doctor integrations (EHR, lab results)
