import { kv } from '@vercel/kv'
export const config = { runtime:'edge' }
export default async function handler(req) {
  const { searchParams } = new URL(req.url)
  const pillar = searchParams.get('pillar')||'sleep'
  const days = parseInt(searchParams.get('days')||'30')
  const today = new Date()
  const dates = Array.from({length:days},(_,i)=>{
    const d=new Date(today); d.setDate(d.getDate()-(days-1-i)); return d.toISOString().slice(0,10)
  })
  const results = await Promise.all(dates.map(date=>kv.get(`health:${date}:${pillar}`)))
  return new Response(JSON.stringify(dates.map((date,i)=>({date,...(results[i]??{})}))),
    {headers:{'content-type':'application/json'}})
}
