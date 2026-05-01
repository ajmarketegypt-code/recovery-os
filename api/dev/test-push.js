// Trigger a test push notification to the registered subscription.
// POST /api/dev/test-push
import webpush from 'web-push'
import { kv } from '@vercel/kv'
export const config = { runtime: 'nodejs' }

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sub = await kv.get('push:subscription')
  if (!sub) return res.status(200).json({ sent: false, reason: 'No subscription registered. Enable notifications first.' })

  const payload = {
    title: 'Health',
    body: '🎉 Test notification — push is working!',
    url: '/',
  }

  try {
    await webpush.sendNotification(sub, JSON.stringify(payload))
    return res.status(200).json({ sent: true })
  } catch (err) {
    if (err.statusCode === 410) await kv.del('push:subscription')
    return res.status(200).json({ sent: false, reason: err.message, code: err.statusCode })
  }
}
