// AI spend guard. Reserve estimate atomically → run call → settle to actual.
//
// Guarantees:
//   - Cap check happens BEFORE the AI call; over-budget short-circuits.
//   - Spend key auto-expires 40 days after first write (≥ longest month +
//     buffer) so leaked reservations from killed Edge functions don't
//     accumulate forever — they reset cleanly each month.
//   - On refund failure (e.g. KV transient outage between try and catch),
//     emit a structured warn the heartbeat can surface later.
import { isoMonth } from './kv.js'

export const AI_CAP_CENTS = 300 // $3.00

export const COST_ESTIMATES = {
  brief:  2,
  vision: 15,
  report: 150,
}

export class OverBudgetError extends Error {
  constructor() { super('Monthly AI budget reached') }
}

const TTL_40D = 60 * 60 * 24 * 40

export async function withAIBudget(kv, model, estimatedCents, fn) {
  const key = `ai:spend:${isoMonth()}`
  const afterReserve = await kv.incrbyfloat(key, estimatedCents)

  // First write of the month — set TTL so leaked reservations don't outlive the month.
  // (incrbyfloat doesn't take an EX arg; expire is idempotent so calling each time is cheap.)
  await kv.expire(key, TTL_40D).catch(() => {})

  if (afterReserve > AI_CAP_CENTS) {
    await refund(kv, key, estimatedCents)
    throw new OverBudgetError()
  }

  if (afterReserve > AI_CAP_CENTS * 0.7) {
    console.warn(`[cost] AI spend at ${afterReserve}/${AI_CAP_CENTS} cents (${Math.round(afterReserve/AI_CAP_CENTS*100)}%)`)
  }

  let actualCents
  try {
    actualCents = await fn()
  } catch (err) {
    await refund(kv, key, estimatedCents)
    throw err
  }

  const delta = actualCents - estimatedCents
  if (delta !== 0) {
    try { await kv.incrbyfloat(key, delta) }
    catch (e) { console.warn(`[cost] settle failed for ${model}: ${e.message}`) }
  }

  return actualCents
}

async function refund(kv, key, cents) {
  try { await kv.incrbyfloat(key, -cents) }
  catch (e) { console.warn(`[cost] REFUND FAILED for ${cents}c: ${e.message}`) }
}
