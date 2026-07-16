import { describe, it, expect } from '@jest/globals'
import {
  TOLERANCE,
  buildCaseIdAlignment,
  classifyRow,
  computeVerdict,
  rankOf,
  rankScore,
  signedMrr,
  signedPp,
} from '@/lib/eval-compare'
import { makeCase, makeRun } from './fixtures/eval'

describe('classifyRow', () => {
  it('flags a Hit@5 loss as a regression regardless of MRR', () => {
    const a = makeCase({ case_id: 'q1', hit_at_5: true, mrr: 0.5 })
    const b = makeCase({ case_id: 'q1', hit_at_5: false, mrr: 0.9 })
    expect(classifyRow(a, b)).toBe('hit5-regressed')
  })

  it('flags a Hit@5 gain as an improvement', () => {
    const a = makeCase({ case_id: 'q1', hit_at_5: false })
    const b = makeCase({ case_id: 'q1', hit_at_5: true })
    expect(classifyRow(a, b)).toBe('hit5-improved')
  })

  it('reports MRR movement when Hit@5 is unchanged', () => {
    const a = makeCase({ case_id: 'q1', hit_at_5: true, mrr: 1 })
    const b = makeCase({ case_id: 'q1', hit_at_5: true, mrr: 0.5 })
    expect(classifyRow(a, b)).toBe('mrr-down')
    expect(classifyRow(b, a)).toBe('mrr-up')
  })

  it('treats a sub-epsilon MRR wobble as unchanged', () => {
    const a = makeCase({ case_id: 'q1', mrr: 1 })
    const b = makeCase({ case_id: 'q1', mrr: 1 + 1e-9 })
    expect(classifyRow(a, b)).toBe('same')
  })

  it('marks coverage-only cases as only-a / only-b', () => {
    const c = makeCase({ case_id: 'q1' })
    expect(classifyRow(c, undefined)).toBe('only-a')
    expect(classifyRow(undefined, c)).toBe('only-b')
  })
})

describe('buildCaseIdAlignment', () => {
  it('aligns by case_id, not by row order', () => {
    // Same two cases, opposite order in each run; a naive zip would mis-pair them.
    const a = makeRun('A', [
      makeCase({ case_id: 'q1', mrr: 1 }),
      makeCase({ case_id: 'q2', mrr: 1 }),
    ])
    const b = makeRun('B', [
      makeCase({ case_id: 'q2', mrr: 1 }),
      makeCase({ case_id: 'q1', mrr: 0.5 }),
    ])
    const { rows, changed } = buildCaseIdAlignment(a, b)
    const q1 = rows.find(r => r.caseId === 'q1')!
    // q1 in A had mrr 1, in B had mrr 0.5 — correctly paired despite the flip.
    expect(q1.status).toBe('mrr-down')
    expect(q1.dMrr).toBeCloseTo(-0.5)
    expect(changed.map(r => r.caseId)).toEqual(['q1'])
  })

  it('sorts changed rows regressions-first', () => {
    const a = makeRun('A', [
      makeCase({ case_id: 'reg', hit_at_5: true }),
      makeCase({ case_id: 'imp', hit_at_5: false }),
      makeCase({ case_id: 'mrrdn', hit_at_5: true, mrr: 1 }),
    ])
    const b = makeRun('B', [
      makeCase({ case_id: 'reg', hit_at_5: false }),
      makeCase({ case_id: 'imp', hit_at_5: true }),
      makeCase({ case_id: 'mrrdn', hit_at_5: true, mrr: 0.4 }),
    ])
    const { changed } = buildCaseIdAlignment(a, b)
    expect(changed.map(r => r.status)).toEqual(['hit5-regressed', 'mrr-down', 'hit5-improved'])
  })

  it('counts only-A / only-B coverage and keeps them out of changed', () => {
    const a = makeRun('A', [makeCase({ case_id: 'shared' }), makeCase({ case_id: 'gone' })])
    const b = makeRun('B', [makeCase({ case_id: 'shared' }), makeCase({ case_id: 'new' })])
    const { changed, onlyA, onlyB } = buildCaseIdAlignment(a, b)
    expect(onlyA).toBe(1)
    expect(onlyB).toBe(1)
    expect(changed).toHaveLength(0)
  })
})

describe('rankOf / rankScore', () => {
  it('returns a 1-based rank via case-insensitive substring match', () => {
    expect(rankOf(['Intro.md', 'Canonical.md', 'x.md'], 'canonical.md')).toBe(2)
  })

  it('returns null when the expected source was not retrieved', () => {
    expect(rankOf(['a.md', 'b.md'], 'canonical.md')).toBeNull()
  })

  it('scores a miss as worse than any real rank', () => {
    const scale = 8
    expect(rankScore(null, scale)).toBeGreaterThan(rankScore(scale, scale))
    expect(rankScore(1, scale)).toBeLessThan(rankScore(3, scale))
  })
})

describe('computeVerdict', () => {
  it('fires a regression when a gated metric drops beyond tolerance', () => {
    const a = makeRun('A', [makeCase({ case_id: 'q1' })], { hit_at_5: 0.95, mrr: 0.84 })
    const b = makeRun('B', [makeCase({ case_id: 'q1' })], { hit_at_5: 0.95, mrr: 0.8 })
    expect(computeVerdict(a, b).kind).toBe('regression')
  })

  it('stays stable for a drop within tolerance', () => {
    const a = makeRun('A', [makeCase({ case_id: 'q1' })], { hit_at_5: 0.95, mrr: 0.84 })
    const b = makeRun('B', [makeCase({ case_id: 'q1' })], {
      hit_at_5: 0.95,
      mrr: 0.84 - TOLERANCE / 2,
    })
    expect(computeVerdict(a, b).kind).toBe('stable')
  })

  it('reports an improvement when a gated metric rises beyond tolerance', () => {
    const a = makeRun('A', [makeCase({ case_id: 'q1' })], { hit_at_5: 0.9, mrr: 0.8 })
    const b = makeRun('B', [makeCase({ case_id: 'q1' })], { hit_at_5: 0.95, mrr: 0.8 })
    expect(computeVerdict(a, b).kind).toBe('improvement')
  })
})

describe('signed formatters', () => {
  it('prefixes positive deltas with + and renders pp / mrr precision', () => {
    expect(signedPp(0.038)).toBe('+3.8pp')
    expect(signedPp(-0.02)).toBe('-2.0pp')
    expect(signedMrr(0.009)).toBe('+0.009')
    expect(signedMrr(-0.5)).toBe('-0.500')
  })
})
