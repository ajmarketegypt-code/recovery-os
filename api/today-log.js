import { kv } from '@vercel/kv'
import { isoDate } from '../src/lib/kv.js'
import { scoreStrength } from '../src/lib/scoring.js'
export const config = { runtime:'edge' }
export default async function handler(req) {
  if (req.method!=='POST') return new Response('Method Not Allowed',{status:405})
  const { type, date=isoDate(), data } = await req.json()
  const ex = 60*60*24*90
  if (type==='tags') {
    await kv.set(`health:${date}:tags`,data,{ex})
    await kv.del(`brief:${date}`)  // brief depends on tags — regenerate
  }
  else if (type==='subjective') {
    const cur=(await kv.get(`health:${date}:subjective`))??{}
    await kv.set(`health:${date}:subjective`,{...cur,...data},{ex})
    await kv.del(`brief:${date}`)  // brief depends on feeling — regenerate
  }
  else if (type==='weight') await kv.set(`health:${date}:weight`,{kg:data.kg,source:'manual'},{ex})
  else if (type==='sets') {
    const cur = (await kv.get(`health:${date}:strength`)) ?? { workouts:[], weekly_count:0, score:0, sets:[] }
    // Promote manual set logging to count as a workout (Watch can't see sets)
    let workouts = cur.workouts
    if (workouts.length === 0 && data.sets?.length > 0) {
      workouts = [{ type: 'Manual logging', duration_min: null, calories: null, source: 'manual' }]
    }
    const settings = (await kv.get('settings')) ?? { workout_target: 4 }
    const score = scoreStrength({ weekly_workouts: workouts.length, target: settings.workout_target })
    await kv.set(`health:${date}:strength`,
      { ...cur, sets: data.sets, workouts, weekly_count: workouts.length, score }, { ex })
  }
  else if (type === 'nutrition_manual') {
    const existing = (await kv.get(`health:${date}:nutrition`)) ??
      { meals: [], totals: { protein_g: 0, carbs_g: 0, fat_g: 0, calories: 0 } }
    const meal = {
      id: Date.now(),
      macros: data,
      quality_score: data.quality_score ?? 50,
      comment: data.name ?? 'Manual entry',
      logged_at: new Date().toISOString(),
    }
    const totals = {
      protein_g: existing.totals.protein_g + (data.protein_g ?? 0),
      carbs_g:   existing.totals.carbs_g   + (data.carbs_g ?? 0),
      fat_g:     existing.totals.fat_g     + (data.fat_g ?? 0),
      calories:  existing.totals.calories  + (data.calories ?? 0),
    }
    await kv.set(`health:${date}:nutrition`, { meals: [...existing.meals, meal], totals }, { ex })
  }
  else return new Response('Unknown type',{status:400})
  return new Response(JSON.stringify({ok:true}),{headers:{'content-type':'application/json'}})
}
