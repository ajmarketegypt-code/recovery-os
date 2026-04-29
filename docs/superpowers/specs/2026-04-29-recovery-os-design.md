# Recovery OS — Design Spec
**Date:** 2026-04-29  
**Author:** Ahmed (owner) + Claude Code (design)  
**Status:** Pending user review

---

## Overview

Recovery OS is an iOS PWA that rebuilds Ahmed's health baseline in a 2-month clean-slate window. Goals: sleep by 11pm consistently, wake at 7am, work out 3–4x/week, rebuild muscle and strength (not weight loss). Minimum daily input, maximum results. No wearable for v1.

---

## Section 1 — Architecture & Tech Stack

**Platform:** Progressive Web App (PWA), installed via Safari "Add to Home Screen" on iOS 26.

**Frontend:**
- React (Vite) + Tailwind CSS
- Framer Motion for animations
- localStorage for all persistent data (no database)
- Service worker for offline support

**Backend:**
- Vercel serverless function as Claude API proxy
- Claude API key stored in Vercel environment variable only — never exposed to client
- No database, no auth, no backend state

**AI:**
- Model: Claude Haiku 4.5 (`claude-haiku-4-5`)
- 1 call per day (morning prescription)
- Cost cap: $0.05/day hard limit via localStorage call counter
- Fallback: rule-based prescription if cap hit or API fails
- Weekly recap call (every 7th journey day) — also capped under same limit

**Cost estimate:** ~$0.08/month total at 1 call/day.

**Notifications:**
- Primary: PWA push notifications (iOS 26, installed-to-home-screen state required)
- Backup: Native iOS reminders — user sets once during onboarding
- Reminder time: user-configured during setup, default 8:00am

---

## Section 2 — Screens & User Flow

**6 screens:**

1. **Home** — morning greeting, phase badge, streak, morning check-in card (energy 1–5), today's protocol preview
2. **Today** — full daily prescription: sleep target, workout card, anchor habit, Claude's note
3. **Workout** — exercise list with animated SVG demos, effort tap on completion
4. **Progress** — weekly summary (every 7th day), benchmark tracking, streak calendar
5. **Journal** — sleep quality log, notes (optional, never required)
6. **Settings** — reminder time, sleep goal, baseline benchmarks, phase info

**Navigation:** Bottom tab bar, 5 icons (Home, Today, Workout, Progress, Settings). Journal accessed from Progress tab.

**Morning flow:** Open app → energy check-in (5 taps) → Today screen auto-loads with Claude prescription → tap Workout when ready.

---

## Section 3 — Claude AI Integration

**Daily prescription call:**

Triggered once per morning when Ahmed opens the app (or manually refreshes). Blocked if already called today (localStorage timestamp check).

**Prompt context sent:**
```
Phase: {current_phase} (day {N} of 60)
Sleep goal: bed {target_bed}, wake {target_wake}
Last 7 days:
  - Sleep logs: [{quality_ratings}]
  - Energy logs: [{energy_ratings}]  
  - Workouts completed: [{workout_names_or_skipped}]
  - Anchors logged: [{anchor_completions}]
Today's workout slot: {yes/no}
```

**Response schema (JSON, validated client-side):**
```json
{
  "sleep_target": "23:30",
  "wake_target": "07:00",
  "workout": {
    "name": "Push Day A",
    "duration_min": 20,
    "exercises": [
      {"name": "Diamond Push-up", "reps": "10", "tempo": "3-1-3"}
    ]
  },
  "anchor": "No caffeine after 2pm",
  "ai_note": "Energy trending up. Push the tempo today.",
  "medical_flag": false
}
```

**Failure handling:** If response fails validation or API is unavailable, fall back to rule-based prescription. User sees the same UI — no error state shown.

**Cost cap mechanism:**
- localStorage tracks daily call count + date
- Hard stop at $0.05/day (~25 calls, but only 1–2 expected)
- Weekly recap call counts toward same daily cap

**Weekly recap (every 7th journey day):**
Context includes full 7-day summary. Response is a 2–3 sentence reflection + next-phase recommendation if approaching phase boundary.

---

## Section 4 — 2-Month Progression System

### Phase Structure

| Phase | Days | Bed Target | Wake Target | Workout Freq | Overload Mechanism |
|---|---|---|---|---|---|
| 1 — Reset | 1–14 | 11:30pm | 7:00am | 3x/week | Controlled tempo (3-1-3) |
| 2 — Build | 15–42 | 11:00pm | 7:00am | 3x/week + optional 4th | Harder movement variants |
| 3 — Groove | 43–60 | 11:00pm | 7:00am | 4x/week | AMRAP finishers, shorter rest |

**Phase gating:** Calendar-based. Automatic transition at day 15 and day 43. No test required. Phase unlock screen shown on the first open of the new phase.

**Exception:** If Ahmed logs energy 1–2 for 2+ consecutive mornings, the app suggests a deload day — not a skip permission, a structured lighter session.

### Bodyweight Progression Ladders

Claude prescribes the appropriate step based on phase and recent performance:

- **Push:** incline → standard → diamond → archer → one-arm
- **Squat:** bodyweight → split squat → Bulgarian split → pistol
- **Hinge:** glute bridge → single-leg bridge → hip thrust → single-leg RDL
- **Pull:** towel door rows → inverted rows (under table)
- **Core:** dead bug → plank → hollow body → L-sit

*Note: Pull movements are limited to towel rows and inverted rows (no bar). This caps the back/biceps ceiling but keeps the app equipment-free.*

**Treadmill:** Introduced in Phase 2 as zone-2 walks on rest days (20–30 min, conversational pace). Not a strength driver — sleep quality and recovery aid.

### Missed Days Policy

- **1 missed day:** Streak pauses (not resets)
- **2 consecutive missed:** Claude adds a light makeup session to next prescription
- **5+ missed in a phase:** "Life happened. Pick up today." No phase penalty, no guilt screen

### Accountability Loop

- **Post-workout:** Effort tap (1–5, takes 5 seconds)
- **Morning:** Energy tap (1–5) + sleep quality tap (1–5)
- **Every 7th day:** Summary screen — streak, avg effort, avg sleep quality, benchmark deltas
- **Progress photos:** Prompted at day 1, 30, 60. Always optional. Stored locally only, never uploaded.

### Day 60 Success Benchmarks

| Benchmark | Day 1 | Day 60 Target |
|---|---|---|
| Push-up max reps | User logs baseline | +8–12 reps |
| Plank hold | User logs baseline | +30–60 seconds |
| Treadmill incline walk | User logs baseline | 8% grade at 5.5 km/h |

### Moment Screens

**Day 1 onboarding (4 screens):**
1. Welcome — "Your 60 days start now. Minimum input, real results."
2. Sleep goal — bed time + wake time pickers
3. Baseline logging — push-up max, plank hold, treadmill starting point
4. Reminder setup — push notification permission + backup iOS reminder time

**Phase unlock (day 15 & 43):**
Emerald ring animation → phase name → one-line change summary ("Harder moves. Treadmill added. You're ready.") → "Let's go" CTA.

**Missed day:**
Muted screen. "Missed yesterday. Today still counts." Streak shows pause icon, not zero.

**Day 60 finale:**
Full-screen celebration — CSS confetti, before/after benchmark card, streak total, single Claude sentence. Shareable PNG card (benchmarks only, no photos).

---

## Section 5 — Visual Design

**Color palette:**
- Background: `#0d1117` (Dark Charcoal)
- Card surface: `#161b22`
- Card border: `#1f3529` (emerald-tinted)
- Primary accent: `#10b981` (Emerald)
- Highlight: `#34d399`
- Primary text: `#ecfdf5`
- Muted text: `#6b9e85`

**Typography:**
- Font: Inter (system-close, zero load time on iOS)
- Greeting/phase name: 28px bold
- Card titles: 16px medium
- Body: 13px regular
- Labels: 10px uppercase with letter-spacing

**Motion & feedback:**
- Button tap: 80ms scale to 0.96 + haptic — instant, satisfying
- Check-in submission: emerald ripple from tap point, counter micro-bounce
- Streak increment: number springs up, fire emoji pops from below
- Phase unlock: dark overlay → emerald ring expands → phase name fades in (2s hold)
- Day 60 finale: CSS confetti burst, benchmarks slide in sequentially, Claude sentence fades last

**Exercise demos:**
- SVG stick figures, 2-frame loop (position A → B, 1.2s ease-in-out)
- Emerald accent on the moving joint/muscle group
- Tap to expand: full-screen demo + coaching cue
- Loads in <50ms, works fully offline

**Component density:**
- One primary action per screen — no scroll required during morning check-in
- Cards: 16px padding, 14px border-radius, 1px emerald-tinted border
- Max 3 cards visible without scrolling
- iOS safe areas respected (notch + home bar)

---

## Out of Scope (v1)

- Wearable integration (Apple Watch, Huawei Band)
- Nutrition tracking
- Social features
- Cloud sync / multi-device
- Android support
- Weight loss programming (muscle + strength only)
- Equipment-based workouts

---

## Open Questions (resolved)

- ~~Platform: PWA (iOS Safari) — confirmed~~
- ~~Visual style: Dark Charcoal + Emerald — confirmed~~
- ~~AI model: Claude Haiku 4.5 — confirmed~~
- ~~Equipment: bodyweight only — confirmed~~
- ~~Notifications: PWA push + native iOS reminders — confirmed~~
- ~~iOS version: iOS 26 — confirmed, full PWA support~~
