import { kv } from '@vercel/kv'
import { isoDate } from '../src/lib/kv.js'
export const config = { runtime:'edge' }
export default async function handler(req) {
  const date = new URL(req.url).searchParams.get('date') || isoDate()
  const pillars = ['sleep','hrv','strength','movement','energy','nutrition','tags','subjective','weight']
  const results = await Promise.all(pillars.map(p => kv.get(`health:${date}:${p}`)))
  return new Response(JSON.stringify({ date, ...Object.fromEntries(pillars.map((p,i) => [p,results[i]])) }),
    { headers:{ 'content-type':'application/json' } })
}
