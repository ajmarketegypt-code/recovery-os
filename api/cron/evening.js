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
      body:JSON.stringify({title:'Health',body:'No workout logged yet today — still time!',url:'/'})})
    reminded = true
  }
  return new Response(JSON.stringify({ok:true,reminded}),{headers:{'content-type':'application/json'}})
}
