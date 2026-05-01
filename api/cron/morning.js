import { kv } from '@vercel/kv'
export const config = { runtime:'edge' }
export default async function handler(req) {
  const s = req.headers.get('x-vercel-cron-secret')??req.headers.get('authorization')?.replace('Bearer ','')
  if (s!==process.env.CRON_SECRET) return new Response('Unauthorized',{status:401})
  const origin = new URL(req.url).origin
  const brief = await fetch(`${origin}/api/brief`).then(r=>r.json())
  // Skip the push if brief was skipped (no data) or returned no headline
  if (brief?.headline && !brief?.skipped) {
    await fetch(`${origin}/api/push/send`,{method:'POST',
      headers:{'content-type':'application/json','x-cron-secret':process.env.CRON_SECRET},
      body:JSON.stringify({title:'Health',body:brief.headline,url:'/'})})
  }
  return new Response(JSON.stringify({ok:true,brief_generated:!!brief?.headline,skipped:!!brief?.skipped}),{headers:{'content-type':'application/json'}})
}
