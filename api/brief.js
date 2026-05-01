import Anthropic from '@anthropic-ai/sdk'
import { kv } from '@vercel/kv'
import { getBrief, setBrief, getHealthData, getHRVBaseline, isoDate } from '../src/lib/kv.js'
import { buildBriefPrompt } from '../src/lib/prompts.js'
import { withAIBudget, COST_ESTIMATES } from '../src/lib/cost.js'
import { computeBaselineStats } from '../src/lib/hrv.js'

export const config = { runtime:'edge' }
const anthropic = new Anthropic({ apiKey:process.env.ANTHROPIC_API_KEY })

export default async function handler(req) {
  const today = isoDate()
  const cached = await getBrief(today)
  if (cached?.generated_at?.startsWith(today)) {
    return new Response(JSON.stringify(cached),{headers:{'content-type':'application/json'}})
  }
  const [sleep,hrv,movement,energy,tags] = await Promise.all([
    getHealthData(today,'sleep'), getHealthData(today,'hrv'), getHealthData(today,'movement'),
    getHealthData(today,'energy'), getHealthData(today,'tags'),
  ])

  // Cost guard: don't burn Claude tokens generating a brief about nothing.
  // Need at least sleep OR hrv data to produce anything meaningful.
  if (!sleep && !hrv?.hrv_ms) {
    return new Response(JSON.stringify({
      skipped: true,
      reason: 'no_data',
      message: 'No sleep or HRV data yet — connect Apple Watch to get your daily brief.',
    }), { headers: { 'content-type': 'application/json' } })
  }
  const baseline = await getHRVBaseline()
  const baselineStats = computeBaselineStats(baseline?.samples??[])
  const settings = await kv.get('settings')
  const { system, messages } = buildBriefPrompt({
    sleep, movement, energy, tags:tags??[],
    hrv:{...hrv, regime:baselineStats.regime, baseline:baselineStats},
    name: settings?.name || process.env.USER_NAME || 'Ahmed',
  })
  let brief
  try {
    await withAIBudget(kv,'brief',COST_ESTIMATES.brief, async () => {
      const r = await anthropic.messages.create({model:'claude-haiku-4-5',max_tokens:500,system,messages})
      brief = JSON.parse(r.content[0].text)
      return Math.round((r.usage.input_tokens*0.0008+r.usage.output_tokens*0.004)/10)
    })
  } catch(err) {
    if (err.constructor.name==='OverBudgetError') {
      return new Response(JSON.stringify({error:'budget_exceeded'}),{status:402,headers:{'content-type':'application/json'}})
    }
    throw err
  }
  const result = {...brief, generated_at:new Date().toISOString()}
  await setBrief(today, result)
  return new Response(JSON.stringify(result),{headers:{'content-type':'application/json'}})
}
