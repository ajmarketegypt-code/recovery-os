export const config = { runtime:'edge' }
export default async function handler(req) {
  const s = req.headers.get('x-vercel-cron-secret')??req.headers.get('authorization')?.replace('Bearer ','')
  if (s!==process.env.CRON_SECRET) return new Response('Unauthorized',{status:401})
  const origin = new URL(req.url).origin
  const report = await fetch(`${origin}/api/report?force=1`,{headers:{'x-cron-secret':process.env.CRON_SECRET}}).then(r=>r.json())
  if (report?.summary && !report?.skipped) {
    await fetch(`${origin}/api/push/send`,{method:'POST',
      headers:{'content-type':'application/json','x-cron-secret':process.env.CRON_SECRET},
      body:JSON.stringify({title:'Your Weekly Report is Ready',body:report.win||'Tap to see your week',url:'/history'})})
  }
  return new Response(JSON.stringify({ok:true,report_generated:!!report?.summary,skipped:!!report?.skipped}),{headers:{'content-type':'application/json'}})
}
