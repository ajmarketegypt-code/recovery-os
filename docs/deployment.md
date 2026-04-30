# Deployment Guide

## Prerequisites
- Vercel account (Hobby tier is sufficient)
- Two separate Vercel projects: `ahmed-health` and `julie-health`
- One Vercel KV store per project (created separately)

## Generate VAPID keys (one-time, shared between both instances)
```bash
npx web-push generate-vapid-keys
```
Save the output — use the SAME keys in both Vercel projects.

## Environment Variables

Set these in each project's Vercel dashboard → Settings → Environment Variables:

### Ahmed's project (`ahmed-health`)
| Variable | Value |
|---|---|
| `USER_NAME` | `ahmed` |
| `VITE_USER_NAME` | `ahmed` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `VAPID_PUBLIC_KEY` | From `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | From `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | `mailto:ahmed.sobhy3696@gmail.com` |
| `VITE_VAPID_PUBLIC_KEY` | Same as `VAPID_PUBLIC_KEY` |
| `CRON_SECRET` | Random 32-char string |
| `INGEST_SECRET` | Random 32-char string (for Health Auto Export) |

### Julie's project (`julie-health`)
Same as above, but:
| Variable | Value |
|---|---|
| `USER_NAME` | `julie` |
| `VITE_USER_NAME` | `julie` |
| `VAPID_SUBJECT` | `mailto:your-email@example.com` |
| *(no `INGEST_SECRET` needed — Julie uses manual input)* | |

## Deploy

### Ahmed's instance
```bash
vercel link   # Link to ahmed-health project
vercel --prod
```

### Julie's instance
```bash
# In a separate directory or using --project flag
vercel link   # Link to julie-health project
vercel --prod
```

## Vercel KV Setup (per project)
1. Vercel dashboard → Storage → Create KV
2. Name: `ahmed-health-kv` (or `julie-health-kv`)
3. Link to the project
4. The `KV_REST_API_URL` and `KV_REST_API_TOKEN` env vars are added automatically

## Health Auto Export Setup (Ahmed only)
1. Install **Health Auto Export** from the App Store on your iPhone
2. Purchase Premium Annual ($6.99/yr) — required for REST API export
3. Configure a new automation:
   - **Type:** REST API
   - **URL:** `https://ahmed-health.vercel.app/api/health-ingest`
   - **Method:** POST
   - **Header:** `X-Ingest-Secret: <your INGEST_SECRET value>`
   - **Schedule:** Hourly + On workout completion
4. Enable these metrics: Sleep, HRV (Heart Rate Variability), Resting Heart Rate, Workouts, Activity Rings

## Cron Jobs
Already configured in `vercel.json`:
- `0 7 * * *` → `/api/cron/morning` — Morning brief + push notification
- `0 18 * * *` → `/api/cron/evening` — Evening workout reminder
- `0 19 * * 0` → `/api/cron/weekly` — Sunday weekly report

## First Launch
1. Open the app in Safari on your iPhone
2. Complete the 7-step setup flow (Ahmed) or 6-step flow (Julie)
3. **Add to Home Screen** is required for push notifications (iOS 16.4+)
4. Once installed, open from the home screen icon

## Monthly AI Budget
- Total cap: $3.00/month per instance
- Morning brief (Haiku): ~$0.002/day → ~$0.06/month
- Vision meal analysis (Sonnet): ~$0.015/photo, capped at $1.50/month
- Weekly report (Opus): ~$0.75-$1.50/month (worst case)
- Monitor spend in Settings → AI Budget
