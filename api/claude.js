export const config = { runtime: 'edge' }

const SYSTEM_PROMPT = `You are a recovery coach AI for a 60-day health rebuilding program.
The user is rebuilding sleep, workout habit, and muscle/strength from a 5-year training gap.
Equipment: bodyweight only. Goal: sleep by 11pm, wake 7am, 4x/week workouts by phase 3, rebuild muscle and strength (not weight loss).
Respond ONLY with valid JSON matching the exact schema provided. No prose, no markdown, no extra keys.`

const SCHEMA = `{
  "sleep_target": "HH:MM (24h, when to be in bed)",
  "wake_target": "HH:MM (24h)",
  "workout": {
    "name": "string",
    "duration_min": number,
    "exercises": [{"name": "string", "reps": "string", "tempo": "string", "cue": "string"}]
  } or null,
  "anchor": "string (one habit to anchor today)",
  "ai_note": "string (1-2 sentences, direct and motivating)",
  "medical_flag": false
}`

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 })
  }

  const userMessage = buildPrompt(body)

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!anthropicRes.ok) {
    const err = await anthropicRes.text()
    return new Response(JSON.stringify({ error: 'Claude API error', detail: err }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const data = await anthropicRes.json()
  const text = data.content?.[0]?.text ?? ''

  return new Response(text, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function buildPrompt(ctx) {
  return `Generate today's recovery protocol. Respond with JSON matching this schema: ${SCHEMA}

Context:
- Phase: ${ctx.phase} (day ${ctx.dayNumber} of 60)
- Sleep goal: bed ${ctx.bedTime}, wake ${ctx.wakeTime}
- Today is a workout day: ${ctx.isWorkoutDay ? 'yes' : 'no'}
- Last 7 days energy ratings: ${JSON.stringify(ctx.recentEnergy)}
- Last 7 days sleep quality: ${JSON.stringify(ctx.recentSleepQuality)}
- Last 7 days workouts: ${JSON.stringify(ctx.recentWorkouts)}
- Available exercises this phase: ${JSON.stringify(ctx.availableExercises)}
`
}
