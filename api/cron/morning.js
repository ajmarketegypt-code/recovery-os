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
