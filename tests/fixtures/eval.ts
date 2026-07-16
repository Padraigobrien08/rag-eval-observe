import type { EvalCaseResult, EvalRunDetail } from '@/lib/api/client'

/** Build a single eval case result with sensible defaults; override any field. */
export function makeCase(overrides: Partial<EvalCaseResult> & { case_id: string }): EvalCaseResult {
  return {
    id: `case-${overrides.case_id}`,
    case_index: 0,
    query: `query for ${overrides.case_id}`,
    expected_sources: ['canonical.md'],
    retrieved_sources: ['canonical.md', 'other.md'],
    answer: 'an answer',
    hit_at_1: true,
    hit_at_3: true,
    hit_at_5: true,
    hit_at_8: true,
    mrr: 1,
    llm_judge_correctness: null,
    llm_judge_faithfulness: null,
    llm_judge_reasoning: null,
    error: null,
    citations: [],
    ...overrides,
  }
}

/** Build a full run detail from a list of cases; aggregate metrics can be overridden. */
export function makeRun(
  id: string,
  cases: EvalCaseResult[],
  overrides: Partial<EvalRunDetail> = {}
): EvalRunDetail {
  const total = cases.length || 1
  const rate = (key: 'hit_at_1' | 'hit_at_3' | 'hit_at_5' | 'hit_at_8') =>
    cases.filter(c => c[key]).length / total
  return {
    id,
    created_at: '2026-07-16T00:00:00Z',
    finished_at: '2026-07-16T00:01:00Z',
    status: 'completed',
    dataset_path: 'eval/dataset.jsonl',
    use_llm_judge: false,
    total_cases: cases.length,
    successful: cases.length,
    failed: 0,
    hit_at_1: rate('hit_at_1'),
    hit_at_3: rate('hit_at_3'),
    hit_at_5: rate('hit_at_5'),
    hit_at_8: rate('hit_at_8'),
    mrr: cases.reduce((s, c) => s + c.mrr, 0) / total,
    llm_judge_correctness_rate: null,
    llm_judge_faithfulness_rate: null,
    config_json: {},
    error_message: null,
    cases,
    ...overrides,
  }
}
