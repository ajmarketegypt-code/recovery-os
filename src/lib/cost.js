// src/lib/cost.js
import { isoMonth } from './kv.js'

export const AI_CAP_CENTS = 300 // $3.00

export const COST_ESTIMATES = {
  brief:  2,   // Haiku ~$0.002
  vision: 15,  // Sonnet Vision ~$0.015
  report: 150, // Opus ~$1.50 worst case
}

export class OverBudgetError extends Error {
  constructor() { super('Monthly AI budget reached') }
}

/**
 * Reserve → call fn() → settle to actual cost.
 * fn() must return actualCents (number).
 * Uses atomic incrbyfloat: reserve first, check returned total, release if over cap.
 */
export async function withAIBudget(kv, model, estimatedCents, fn) {
  const key = `ai:spend:${isoMonth()}`
  const afterReserve = await kv.incrbyfloat(key, estimatedCents)

  if (afterReserve > AI_CAP_CENTS) {
    await kv.incrbyfloat(key, -estimatedCents)
    throw new OverBudgetError()
  }

  if (afterReserve > AI_CAP_CENTS * 0.7) {
    console.warn(`[cost] AI spend at ${afterReserve}/${AI_CAP_CENTS} cents (${Math.round(afterReserve/AI_CAP_CENTS*100)}%)`)
  }

  let actualCents
  try {
    actualCents = await fn()
  } catch (err) {
    await kv.incrbyfloat(key, -estimatedCents)
    throw err
  }

  const delta = actualCents - estimatedCents
  if (delta !== 0) await kv.incrbyfloat(key, delta)

  return actualCents
}
