import { describe, it, expect } from '@jest/globals'
import { STRATEGY_BENCHMARK, STRATEGY_COPY, type StrategyResult } from '@/lib/strategy-benchmark'

/**
 * The benchmark table is pinned data pasted from
 * backend/eval/benchmark_results.json. These tests guard against a bad paste
 * (missing strategy, out-of-range metric, copy/metric drift) when the numbers
 * are regenerated — the same reason the README leans on them.
 */
describe('STRATEGY_BENCHMARK', () => {
  it('describes the bundled 78-case sweep at top_k=8', () => {
    expect(STRATEGY_BENCHMARK.nCases).toBe(78)
    expect(STRATEGY_BENCHMARK.topK).toBe(8)
    expect(STRATEGY_BENCHMARK.embeddingModel).toBe('text-embedding-3-small')
    expect(STRATEGY_BENCHMARK.chatModel).toBe('gpt-4o-mini')
    expect(STRATEGY_BENCHMARK.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('ships all four retrieval strategies, each unique', () => {
    const names = STRATEGY_BENCHMARK.results.map(r => r.strategy)
    expect(names.sort()).toEqual(['hybrid-search', 'multi-query', 'reranking', 'vector-similarity'])
    expect(new Set(names).size).toBe(names.length)
  })

  it('keeps every rate metric in [0,1] and every cost/latency non-negative', () => {
    const inUnitInterval = (n: number) => n >= 0 && n <= 1
    for (const r of STRATEGY_BENCHMARK.results) {
      expect(inUnitInterval(r.hitAt1)).toBe(true)
      expect(inUnitInterval(r.hitAt5)).toBe(true)
      expect(inUnitInterval(r.mrr)).toBe(true)
      // Hit@5 recall is always >= Hit@1 precision for the same run.
      expect(r.hitAt5).toBeGreaterThanOrEqual(r.hitAt1)
      expect(r.latencyP95Ms).toBeGreaterThanOrEqual(r.latencyP50Ms)
      expect(r.costPer1kUsd).toBeGreaterThanOrEqual(0)
      expect(r.embedCalls).toBeGreaterThan(0)
      expect(r.chatCalls).toBeGreaterThanOrEqual(0)
    }
  })

  it('has editorial copy for exactly the strategies it benchmarks', () => {
    const benchKeys = STRATEGY_BENCHMARK.results.map(r => r.strategy).sort()
    const copyKeys = Object.keys(STRATEGY_COPY).sort()
    expect(copyKeys).toEqual(benchKeys)
    for (const copy of Object.values(STRATEGY_COPY)) {
      expect(copy.label.length).toBeGreaterThan(0)
      expect(copy.howItWorks.length).toBeGreaterThan(0)
      expect(copy.bestFor.length).toBeGreaterThan(0)
    }
  })

  it('reranking has the best Hit@5 recall on this corpus (the README claim)', () => {
    const byHit5 = [...STRATEGY_BENCHMARK.results].sort((a, b) => b.hitAt5 - a.hitAt5)
    expect(byHit5[0].strategy).toBe('reranking')
    // ...and vector-similarity has the best MRR.
    const byMrr = [...STRATEGY_BENCHMARK.results].sort(
      (a: StrategyResult, b: StrategyResult) => b.mrr - a.mrr
    )
    expect(byMrr[0].strategy).toBe('vector-similarity')
  })
})
