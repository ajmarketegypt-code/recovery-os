import { kv } from '@vercel/kv'
import { isoDate } from '../src/lib/kv.js'
export const config = { runtime:'edge' }
export default async function handler(req) {
  if (req.method!=='POST') return new Response('Method Not Allowed',{status:405})
  const { type, date=isoDate(), data } = await req.json()
  const ex = 60*60*24*90
  if (type==='tags') await kv.set(`health:${date}:tags`,data,{ex})
  else if (type==='subjective') {
    const cur=(await kv.get(`health:${date}:subjective`))??{}
    await kv.set(`health:${date}:subjective`,{...cur,...data},{ex})
  }
  else if (type==='weight') await kv.set(`health:${date}:weight`,{kg:data.kg,source:'manual'},{ex})
  else if (type==='sets') {
    const cur=(await kv.get(`health:${date}:strength`))??{workouts:[],weekly_count:0,score:0,sets:[]}
    await kv.set(`health:${date}:strength`,{...cur,sets:data.sets},{ex})
  }
  else return new Response('Unknown type',{status:400})
  return new Response(JSON.stringify({ok:true}),{headers:{'content-type':'application/json'}})
}
