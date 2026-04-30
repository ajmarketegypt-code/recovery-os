import Anthropic from '@anthropic-ai/sdk'
import { kv } from '@vercel/kv'
import { isoDate, isoMonth } from '../src/lib/kv.js'
import { buildVisionPrompt } from '../src/lib/prompts.js'
import { withAIBudget } from '../src/lib/cost.js'

export const config = { runtime:'edge' }
const anthropic = new Anthropic({ apiKey:process.env.ANTHROPIC_API_KEY })

export default async function handler(req) {
  if (req.method!=='POST') return new Response('Method Not Allowed',{status:405})
  const month = isoMonth()
  const budget = (await kv.get(`vision:budget:${month}`))??{used_cents:0,cap_cents:150,call_count:0}
  if (budget.used_cents>=budget.cap_cents) {
    return new Response(JSON.stringify({error:'vision_budget_exceeded'}),{status:402,headers:{'content-type':'application/json'}})
  }
  const form = await req.formData()
  const file = form.get('image')
  if (!file) return new Response('Missing image',{status:400})
  const base64 = btoa(String.fromCharCode(...new Uint8Array(await file.arrayBuffer())))
  const { system, messages } = buildVisionPrompt()
  messages[0].content = [
    {type:'image',source:{type:'base64',media_type:file.type||'image/jpeg',data:base64}},
    ...messages[0].content,
  ]
  let macros, actualCents=0
  try {
    await withAIBudget(kv,'vision',15, async () => {
      const r = await anthropic.messages.create({model:'claude-sonnet-4-5',max_tokens:300,system,messages})
      macros = JSON.parse(r.content[0].text)
      actualCents = Math.round((r.usage.input_tokens*0.003+r.usage.output_tokens*0.015)/10)
      return actualCents
    })
  } catch(err) {
    if (err.constructor.name==='OverBudgetError') return new Response(JSON.stringify({error:'budget_exceeded'}),{status:402,headers:{'content-type':'application/json'}})
    throw err
  }
  await kv.set(`vision:budget:${month}`,{used_cents:budget.used_cents+actualCents,cap_cents:budget.cap_cents,call_count:budget.call_count+1})
  const today=isoDate()
  const existing=(await kv.get(`health:${today}:nutrition`))??{meals:[],totals:{protein_g:0,carbs_g:0,fat_g:0,calories:0}}
  const meal={id:Date.now(),macros,quality_score:macros.quality_score,comment:macros.comment,logged_at:new Date().toISOString()}
  const totals={
    protein_g:existing.totals.protein_g+(macros.protein_g??0),
    carbs_g:existing.totals.carbs_g+(macros.carbs_g??0),
    fat_g:existing.totals.fat_g+(macros.fat_g??0),
    calories:existing.totals.calories+(macros.calories??0),
  }
  await kv.set(`health:${today}:nutrition`,{meals:[...existing.meals,meal],totals},{ex:60*60*24*90})
  return new Response(JSON.stringify({macros,meal_id:meal.id}),{headers:{'content-type':'application/json'}})
}
