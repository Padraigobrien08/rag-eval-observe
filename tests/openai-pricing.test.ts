import { describe, it, expect } from '@jest/globals'
import {
  CHAT_COMPLETION_COST_PER_1K_MINI,
  CHAT_PROMPT_COST_PER_1K_MINI,
  EMBEDDING_COST_PER_1K,
  estimateChatMessageCostUsd,
  estimateDashboardTokenCostUsd,
} from '@/lib/openai-pricing'

describe('estimateChatMessageCostUsd', () => {
  it('returns undefined when there is no usage to price', () => {
    expect(estimateChatMessageCostUsd(undefined)).toBeUndefined()
  })

  it('prices prompt and completion tokens at their distinct rates', () => {
    const cost = estimateChatMessageCostUsd({ prompt_tokens: 1000, completion_tokens: 1000 })
    expect(cost).toBeCloseTo(CHAT_PROMPT_COST_PER_1K_MINI + CHAT_COMPLETION_COST_PER_1K_MINI, 12)
  })

  it('treats missing token fields as zero', () => {
    const cost = estimateChatMessageCostUsd({ prompt_tokens: 2000 })
    expect(cost).toBeCloseTo(2 * CHAT_PROMPT_COST_PER_1K_MINI, 12)
  })
})

describe('estimateDashboardTokenCostUsd', () => {
  it('sums embedding + chat prompt + chat completion costs', () => {
    const cost = estimateDashboardTokenCostUsd({
      embedding_total_tokens: 1000,
      chat_prompt_tokens: 1000,
      chat_completion_tokens: 1000,
    })
    expect(cost).toBeCloseTo(
      EMBEDDING_COST_PER_1K + CHAT_PROMPT_COST_PER_1K_MINI + CHAT_COMPLETION_COST_PER_1K_MINI,
      12
    )
  })

  it('returns zero for an empty usage object', () => {
    expect(estimateDashboardTokenCostUsd({})).toBe(0)
  })
})
