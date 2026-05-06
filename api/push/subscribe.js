import { kv } from '../../src/lib/kv.js'
export const config = { runtime:'edge' }
export default async function handler(req) {
  if (req.method!=='POST') return new Response('Method Not Allowed',{status:405})
  await kv.set('push:subscription', await req.json())
  return new Response(JSON.stringify({ok:true}),{headers:{'content-type':'application/json'}})
}
