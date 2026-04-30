import Anthropic from '@anthropic-ai/sdk'
import { kv } from '@vercel/kv'
import { getReport, setReport, isoWeek } from '../src/lib/kv.js'
import { buildReportPrompt } from '../src/lib/prompts.js'
import { withAIBudget, COST_ESTIMATES } from '../src/lib/cost.js'

export const config = { runtime:'edge' }
const anthropic = new Anthropic({ apiKey:process.env.ANTHROPIC_API_KEY })

export default async function handler(req) {
  const week = isoWeek()
  const cached = await getReport(week)
  if (cached) return new Response(JSON.stringify(cached),{headers:{'content-type':'application/json'}})

  const isSunday = new Date().getDay()===0
  const isForced = new URL(req.url).searchParams.get('force')==='1' &&
    (req.headers.get('x-cron-secret')===process.env.CRON_SECRET)
  if (!isSunday && !isForced) {
    return new Response(JSON.stringify({available:false,message:'Report generates Sunday evening'}),{headers:{'content-type':'application/json'}})
  }

  const today = new Date()
  const week_data = await Promise.all(Array.from({length:7},(_,i)=>{
    const d=new Date(today); d.setDate(d.getDate()-(6-i))
    const date=d.toISOString().slice(0,10)
    const pillars=['sleep','hrv','strength','movement','energy','nutrition','tags','subjective']
    return Promise.all(pillars.map(p=>kv.get(`health:${date}:${p}`))).then(results=>({
      date,...Object.fromEntries(pillars.map((p,j)=>[p,results[j]]))
    }))
  }))

  const settings = await kv.get('settings')
  const { system, messages } = buildReportPrompt({ week_data, name:settings?.name||process.env.USER_NAME||'Ahmed' })
  let report
  try {
    await withAIBudget(kv,'report',COST_ESTIMATES.report, async () => {
      const r = await anthropic.messages.create({model:'claude-opus-4-5',max_tokens:1000,system,messages})
      report = JSON.parse(r.content[0].text)
      return Math.round((r.usage.input_tokens*0.015+r.usage.output_tokens*0.075)/10)
    })
  } catch(err) {
    if (err.constructor.name==='OverBudgetError') return new Response(JSON.stringify({error:'budget_exceeded'}),{status:402,headers:{'content-type':'application/json'}})
    throw err
  }
  const result = {...report, generated_at:new Date().toISOString(), week}
  await setReport(week, result)
  return new Response(JSON.stringify(result),{headers:{'content-type':'application/json'}})
}
