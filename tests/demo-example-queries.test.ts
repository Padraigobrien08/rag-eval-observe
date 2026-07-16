import { describe, it, expect } from '@jest/globals'
import { DEMO_EXAMPLE_QUERIES } from '@/lib/demo-example-queries'

describe('DEMO_EXAMPLE_QUERIES', () => {
  it('has a stable, non-empty set of suggestions', () => {
    expect(DEMO_EXAMPLE_QUERIES.length).toBeGreaterThanOrEqual(5)
  })

  it('uses unique ids', () => {
    const ids = DEMO_EXAMPLE_QUERIES.map(q => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('fills every display field (label/prompt/topic) for layout + retrieval', () => {
    for (const q of DEMO_EXAMPLE_QUERIES) {
      expect(q.id.trim().length).toBeGreaterThan(0)
      expect(q.label.trim().length).toBeGreaterThan(0)
      expect(q.topic.trim().length).toBeGreaterThan(0)
      // The prompt is what actually gets sent, so it should be the fuller text.
      expect(q.prompt.length).toBeGreaterThanOrEqual(q.label.length)
    }
  })
})
