// src/lib/prompts.js

const JSON_SYSTEM = 'You are a personal health coach. Reply ONLY with valid JSON matching the schema provided. No markdown, no explanation.'

export function buildBriefPrompt({ sleep, hrv, movement, energy, tags = [], name = 'Ahmed' }) {
  const tagStr = tags.length ? tags.join(', ') : 'none'
  const hrvNote = hrv?.regime === 'establishing'
    ? 'HRV baseline still establishing (< 7 days data)'
    : `HRV: ${hrv?.hrv_ms ?? '?'}ms, signal: ${hrv?.signal ?? '?'}, vs baseline ${hrv?.baseline?.mean ?? '?'}ms`

  return {
    system: JSON_SYSTEM,
    messages: [{
      role: 'user',
      content: `Generate ${name}'s morning health brief.

Health data:
- Sleep: ${sleep?.total_hours ?? '?'}h, efficiency ${sleep?.efficiency ?? '?'}%, score ${sleep?.score ?? '?'}
- ${hrvNote}
- Movement score: ${movement?.score ?? '?'} (move ${movement?.move_pct ?? '?'}%, exercise ${movement?.exercise_pct ?? '?'}%, stand ${movement?.stand_pct ?? '?'}%)
- Energy score: ${energy?.score ?? '?'}
- Yesterday's behavior tags: ${tagStr}

Return JSON:
{
  "headline": "Recovery score: [N] — [one-line summary]",
  "bullets": ["[sleep insight]", "[HRV/recovery insight]", "[energy driver]"],
  "recommendation": "Train hard" | "Train as planned" | "Rest"
}`,
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
