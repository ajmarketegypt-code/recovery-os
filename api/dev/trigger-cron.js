// Manually trigger the morning cron (brief generation + alert checks +
// pushes). Useful for verifying the alerting pipeline works end-to-end
// without waiting for 7am UTC.
export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('POST only', { status: 405 })

  const origin = new URL(req.url).origin
  const r = await fetch(`${origin}/api/cron/morning`, {
    headers: { 'x-vercel-cron-secret': process.env.CRON_SECRET },
  })
  const text = await r.text()

  return new Response(JSON.stringify({
    ok: r.ok,
    status: r.status,
    body: (() => { try { return JSON.parse(text) } catch { return text } })(),
  }), { headers: { 'content-type': 'application/json' } })
}
