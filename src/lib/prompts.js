// src/lib/prompts.js

const JSON_SYSTEM = 'You are a personal health coach. Reply ONLY with valid JSON matching the schema provided. No markdown, no explanation.'

export function buildBriefPrompt({ sleep, hrv, movement, energy, subjective, tags = [], name = 'Ahmed' }) {
  const tagStr = tags.length ? tags.join(', ') : 'none'
  const hrvNote = hrv?.regime === 'establishing'
    ? 'HRV baseline still establishing (< 7 days data)'
    : `HRV: ${hrv?.hrv_ms ?? '?'}ms, signal: ${hrv?.signal ?? '?'}, vs baseline ${hrv?.baseline?.mean ?? '?'}ms`

  // Map 1-5 feeling to a label so Claude knows it's subjective, not a "score"
  const FEEL = { 1:'drained', 2:'off', 3:'OK', 4:'good', 5:'great' }
  const feelingNote = subjective?.feeling != null
    ? `User self-reports they feel: ${FEEL[subjective.feeling]} (${subjective.feeling}/5). TRUST THIS — if they feel drained but Watch metrics look fine, recommend rest. Subjective state matters more than HRV alone for training decisions.`
    : 'No subjective check-in yet today.'

  return {
    system: `You are ${name}'s health coach. They do body recomp, 4 workouts/week. Be direct, brief, and adapt training advice to their recovery state. Reply ONLY with valid JSON.

WRITING STYLE — STRICT:
- Headline: max 6 words. Sentence case (NOT ALL CAPS). Action or state, not flowery.
- Sub: ONE sentence, max 15 words. The single most important reason in plain English.
- Bullets: optional 2-3 items, max 12 words each. Only the *why* — skip if the sub already says enough.
- No emoji, no exclamation marks, no business-speak ("prioritize", "restoration", "compromised").
- Speak like a smart friend texting you, not a doctor writing a chart.

GOOD EXAMPLES:
- "Rest today" / "You feel drained. Trust it over the metrics."
- "Recovery solid" / "8.9h sleep, HRV stable. Train hard."
- "Light session" / "HRV down 12% from baseline — back off intensity."

BAD EXAMPLES:
- "COMPROMISED RECOVERY — Sleep quality is solid, but subjective drained signal overrides metrics; prioritize restoration today."
- "Outstanding 8.93h sleep with 94% efficiency provides solid physical recovery foundation"`,
    messages: [{
      role: 'user',
      content: `${name}'s daily snapshot:

METRICS
- Sleep: ${sleep?.total_hours ?? '?'}h, efficiency ${sleep?.efficiency ?? '?'}%, score ${sleep?.score ?? '?'}
- ${hrvNote}
- Movement: ${movement?.score ?? '?'} (move ${movement?.move_pct ?? '?'}%, exercise ${movement?.exercise_pct ?? '?'}%)
- Energy: ${energy?.score ?? '?'}

SUBJECTIVE
- ${feelingNote}
- Tags: ${tagStr}${tags.includes('sick') ? ' — sick → recommend Rest, no exceptions.' : ''}

Return JSON:
{
  "headline": "max 6 words, sentence case",
  "sub": "one sentence, ≤15 words, plain English",
  "actions": ["≤8 words, imperative", "≤8 words, imperative"],
  "bullets": ["≤12 words", "≤12 words"],
  "recommendation": "Train hard" | "Train as planned" | "Light only" | "Rest"
}

Recommendation rules:
- Drained + low HRV or sick → Rest
- Drained + decent HRV → Light only
- Feels good + good HRV → Train hard
- Otherwise → Train as planned

ACTIONS rules:
- 1-2 small concrete things to do TODAY that improve recovery for tomorrow.
- Imperative voice ('Drink 500ml water before noon', '10-min walk after lunch')
- Match the recommendation: if Rest → recovery actions (sleep, hydration, walk). If Train hard → fueling/warmup actions.
- Tiny, achievable, specific. Not 'eat better' but 'add 30g protein at breakfast'.
- No vague advice ('listen to your body', 'be mindful'). Every action must be doable in <30 min.`,
    }],
  }
}

export function buildReportPrompt({ week_data, name = 'Ahmed' }) {
  return {
    system: JSON_SYSTEM,
    messages: [{
      role: 'user',
      content: `Generate ${name}'s weekly health report.

Week data (7 days):
${JSON.stringify(week_data, null, 2)}

Return JSON:
{
  "summary": "2-3 sentence week overview",
  "win": "Top recovery win this week",
  "gap": "Top gap to address",
  "recommendation": "Specific action for next week",
  "trends": {
    "sleep": "improving" | "stable" | "declining",
    "hrv": "improving" | "stable" | "declining",
    "strength": "improving" | "stable" | "declining",
    "movement": "improving" | "stable" | "declining",
    "energy": "improving" | "stable" | "declining",
    "nutrition": "improving" | "stable" | "declining"
  },
  "correlations": "One insight about behavior tags correlating with recovery"
}`,
    }],
  }
}

export function buildVisionPrompt() {
  return {
    system: JSON_SYSTEM,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'Analyze this meal photo and estimate macros. Be conservative — underestimate portions when uncertain. Return JSON:\n{"protein_g": number, "carbs_g": number, "fat_g": number, "calories": number, "quality_score": 1-10, "comment": "one-line observation"}',
        },
      ],
    }],
  }
}
