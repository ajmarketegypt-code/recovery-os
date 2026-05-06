import webpush from 'web-push'
import { kv } from '../../src/lib/kv.js'
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
