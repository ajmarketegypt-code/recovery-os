// Server-to-server push fanout to all registered devices. Auto-prunes
// dead subscriptions on 410 Gone.
//
// Auth: x-internal-secret header (separate from CRON_SECRET so a leak of
// the cron secret doesn't grant push-impersonation. Falls back to
// CRON_SECRET if INTERNAL_PUSH_SECRET isn't set, for backwards
// compatibility with the morning cron until both deploys rotate.)
import webpush from 'web-push'
import { kv } from '../../src/lib/kv.js'

export const config = { runtime: 'nodejs' }

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

const KEY = 'push:subs'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const expected = process.env.INTERNAL_PUSH_SECRET ?? process.env.CRON_SECRET
  const got = req.headers['x-internal-secret'] ?? req.headers['x-cron-secret']
  if (got !== expected) return res.status(401).end()

  const { title, body, url = '/' } = req.body ?? {}

  // Read map; fall back to legacy single-sub key during migration window
  let map = await kv.get(KEY)
  if (!map) {
    const legacy = await kv.get('push:subscription')
    if (legacy?.endpoint) {
      map = { [legacy.endpoint]: legacy }
      await kv.set(KEY, map)
    }
  }
  if (!map || !Object.keys(map).length) {
    return res.json({ sent: 0, reason: 'no_subscriptions' })
  }

  const payload = JSON.stringify({ title, body, url })
  const dead = []
  let sent = 0

  await Promise.all(Object.entries(map).map(async ([endpoint, sub]) => {
    try {
      await webpush.sendNotification(sub, payload)
      sent++
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) dead.push(endpoint)
    }
  }))

  if (dead.length) {
    for (const ep of dead) delete map[ep]
    await kv.set(KEY, map)
  }

  return res.json({ sent, devices: Object.keys(map).length, pruned: dead.length })
}
