// src/lib/cost.test.js
import { describe, it, expect, vi } from 'vitest'
import { withAIBudget, OverBudgetError, AI_CAP_CENTS } from './cost.js'

// Mock kv.js isoMonth
vi.mock('./kv.js', () => ({ isoMonth: () => '2026-05' }))

const expireMock = () => vi.fn().mockResolvedValue(1)
const makeKV = (returnVal) => ({
  incrbyfloat: vi.fn().mockResolvedValue(returnVal),
  expire: expireMock(),
})

describe('withAIBudget', () => {
  it('throws OverBudgetError when projected spend exceeds cap', async () => {
    const kv = makeKV(310) // $3.10 after reserve — over $3.00 cap
    await expect(
      withAIBudget(kv, 'brief', 10, async () => 8)
    ).rejects.toThrow(OverBudgetError)
    // Should release the reservation
    expect(kv.incrbyfloat).toHaveBeenCalledTimes(2)
    expect(kv.incrbyfloat).toHaveBeenNthCalledWith(2, 'ai:spend:2026-05', -10)
  })

  it('releases reservation on fn() error', async () => {
    const kv = { incrbyfloat: vi.fn().mockResolvedValueOnce(50).mockResolvedValueOnce(40), expire: expireMock() }
    await expect(
      withAIBudget(kv, 'brief', 10, async () => { throw new Error('Claude failed') })
    ).rejects.toThrow('Claude failed')
    expect(kv.incrbyfloat).toHaveBeenCalledTimes(2)
    expect(kv.incrbyfloat).toHaveBeenNthCalledWith(2, 'ai:spend:2026-05', -10)
  })

  it('settles delta when actual differs from estimate', async () => {
    const kv = { incrbyfloat: vi.fn().mockResolvedValueOnce(50).mockResolvedValueOnce(43), expire: expireMock() }
    await withAIBudget(kv, 'brief', 15, async () => 8)
    // delta = 8 - 15 = -7
    expect(kv.incrbyfloat).toHaveBeenNthCalledWith(2, 'ai:spend:2026-05', -7)
  })

  it('does not call settle when actual equals estimate', async () => {
    const kv = { incrbyfloat: vi.fn().mockResolvedValueOnce(50), expire: expireMock() }
    await withAIBudget(kv, 'brief', 10, async () => 10)
    expect(kv.incrbyfloat).toHaveBeenCalledTimes(1) // only the reserve call
  })
})
