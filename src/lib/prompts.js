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
    system: `You are ${name}'s personal health coach. They are doing body recomposition (lose fat, gain muscle simultaneously) targeting 4 workouts/week. Be direct, specific, and adapt training advice to their RECOVERY state (HRV + sleep + how they feel). Reply ONLY with valid JSON matching the schema. No markdown.`,
    messages: [{
      role: 'user',
      content: `Generate ${name}'s daily brief.

OBJECTIVE METRICS:
- Sleep: ${sleep?.total_hours ?? '?'}h, efficiency ${sleep?.efficiency ?? '?'}%, score ${sleep?.score ?? '?'}
- ${hrvNote}
- Movement score: ${movement?.score ?? '?'} (move ${movement?.move_pct ?? '?'}%, exercise ${movement?.exercise_pct ?? '?'}%, stand ${movement?.stand_pct ?? '?'}%)
- Energy score: ${energy?.score ?? '?'}

SUBJECTIVE:
- ${feelingNote}
- Behavior context: ${tagStr}${tags.includes('sick') ? ' — IF SICK, hard recommendation: REST.' : ''}

Return JSON:
{
  "headline": "[recovery state] — [one-line summary tying objective + subjective]",
  "bullets": ["[insight on biggest signal today]", "[recovery/HRV note]", "[specific action — what to do today]"],
  "recommendation": "Train hard" | "Train as planned" | "Light only" | "Rest"
}

The recommendation must match BOTH the metrics AND how they feel. Drained + low HRV → Rest. Drained + good HRV → Light only. Good feeling + good HRV → Train hard or as planned.`,
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
