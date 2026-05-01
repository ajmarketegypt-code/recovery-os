import { kv } from '@vercel/kv'
import { isoMonth } from '../src/lib/kv.js'
export const config = { runtime:'edge' }
const DEFAULTS = {name:'Ahmed',notification_times:{morning:'07:00',evening:'18:00'},
  workout_target:4,vision_cap_cents:150,ai_monthly_cap_cents:300,
  weight_unit:'kg',cycle_length_days:28,last_period_start:null,
  // Per-pillar targets (Wave 1)
  sleep_target_hours:8, hrv_target_ms:45, daylight_target_min:30,
  protein_target_g:140}
export default async function handler(req) {
  if (req.method==='GET') {
    const s=(await kv.get('settings'))??DEFAULTS
    const month=isoMonth()
    const aiSpend=(await kv.get(`ai:spend:${month}`))??0
    const visionBudget=(await kv.get(`vision:budget:${month}`))??{used_cents:0,cap_cents:s.vision_cap_cents}
    return new Response(JSON.stringify({...s,aiSpend,visionBudget}),{headers:{'content-type':'application/json'}})
  }
  if (req.method==='POST') {
    const cur=(await kv.get('settings'))??DEFAULTS
    const merged={...cur,...(await req.json())}
    await kv.set('settings',merged)
    return new Response(JSON.stringify(merged),{headers:{'content-type':'application/json'}})
  }
  return new Response('Method Not Allowed',{status:405})
}
