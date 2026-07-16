/**
 * Pure comparison logic for two eval runs — the core of the "compare by
 * `case_id`" surface. Extracted from the client component so it can be unit
 * tested in isolation and reused: the alignment, classification, and verdict
 * here mirror the backend CI gate (`backend/eval/compare_eval.py`), which is
 * what makes the in-app verdict and the merge-blocking gate agree.
 */

import type { EvalCaseResult, EvalRunDetail } from '@/lib/api/client'

// Mirror the CI gate (compare_eval.py): Hit@5 and MRR are gated; ±0.02 tolerance.
export const TOLERANCE = 0.02
export const EPS = 1e-6

export type RowStatus =
  | 'same'
  | 'hit5-regressed'
  | 'hit5-improved'
  | 'mrr-down'
  | 'mrr-up'
  | 'only-a'
  | 'only-b'

export type DiffRow = {
  caseId: string
  ca: EvalCaseResult | undefined
  cb: EvalCaseResult | undefined
  status: RowStatus
  dMrr: number | null
}

export function classifyRow(
  ca: EvalCaseResult | undefined,
  cb: EvalCaseResult | undefined
): RowStatus {
  if (ca && !cb) return 'only-a'
  if (!ca && cb) return 'only-b'
  if (!ca || !cb) return 'same'
  if (ca.hit_at_5 && !cb.hit_at_5) return 'hit5-regressed'
  if (!ca.hit_at_5 && cb.hit_at_5) return 'hit5-improved'
  const d = cb.mrr - ca.mrr
  if (d < -EPS) return 'mrr-down'
  if (d > EPS) return 'mrr-up'
  return 'same'
}

// Severity order — regressions first, so the debugging payload is at the top.
export const STATUS_ORDER: Record<RowStatus, number> = {
  'hit5-regressed': 0,
  'mrr-down': 1,
  'only-a': 2,
  'hit5-improved': 3,
  'mrr-up': 4,
  'only-b': 5,
  same: 6,
}

export function buildCaseIdAlignment(a: EvalRunDetail, b: EvalRunDetail) {
  const mapA = new Map(a.cases.map(c => [c.case_id, c]))
  const mapB = new Map(b.cases.map(c => [c.case_id, c]))
  const seen = new Set<string>()
  const order: string[] = []
  for (const c of [...a.cases, ...b.cases]) {
    if (!seen.has(c.case_id)) {
      seen.add(c.case_id)
      order.push(c.case_id)
    }
  }
  const rows: DiffRow[] = order.map(caseId => {
    const ca = mapA.get(caseId)
    const cb = mapB.get(caseId)
    return { caseId, ca, cb, status: classifyRow(ca, cb), dMrr: ca && cb ? cb.mrr - ca.mrr : null }
  })
  // "changed" is real metric movement only — coverage-only rows (a case present
  // in one run) are surfaced separately so they don't masquerade as regressions.
  const changeStatuses: RowStatus[] = ['hit5-regressed', 'mrr-down', 'hit5-improved', 'mrr-up']
  const changed = rows
    .filter(r => changeStatuses.includes(r.status))
    .sort((x, y) => STATUS_ORDER[x.status] - STATUS_ORDER[y.status])
  const onlyA = rows.filter(r => r.status === 'only-a').length
  const onlyB = rows.filter(r => r.status === 'only-b').length
  return { rows, changed, onlyA, onlyB }
}

/** Rank (1-based) of an expected source within a retrieved list, mirroring the
 * harness's case-insensitive substring match; null when it was not retrieved. */
export function rankOf(retrieved: string[], expected: string): number | null {
  const e = expected.toLowerCase()
  const i = retrieved.findIndex(s => {
    const t = s.toLowerCase()
    return t.includes(e) || e.includes(t)
  })
  return i === -1 ? null : i + 1
}

// Worst-to-best score: lower rank is better; "not retrieved" (null) is worst of all.
export const rankScore = (r: number | null, scale: number) => (r == null ? scale + 1 : r)

export type Verdict = {
  kind: 'regression' | 'improvement' | 'stable'
  dHit5: number
  dMrr: number
}

export function computeVerdict(a: EvalRunDetail, b: EvalRunDetail): Verdict {
  const dHit5 = b.hit_at_5 - a.hit_at_5
  const dMrr = b.mrr - a.mrr
  if (dHit5 < -TOLERANCE || dMrr < -TOLERANCE) return { kind: 'regression', dHit5, dMrr }
  if (dHit5 > TOLERANCE || dMrr > TOLERANCE) return { kind: 'improvement', dHit5, dMrr }
  return { kind: 'stable', dHit5, dMrr }
}

export const signedPp = (d: number) => `${d > 0 ? '+' : ''}${(d * 100).toFixed(1)}pp`
export const signedMrr = (d: number) => `${d > 0 ? '+' : ''}${d.toFixed(3)}`
