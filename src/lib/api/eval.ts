'use client'

import { API_BASE_URL, encodePathSegment, ensureBrowser, throwForStatus } from './http'

/** Mirrors the backend's `routes/eval.py` — persisted harness runs. */

export type EvalRunSummary = {
  id: string
  created_at: string
  finished_at: string
  status: string
  dataset_path: string
  use_llm_judge: boolean
  total_cases: number
  successful: number
  failed: number
  hit_at_1: number
  hit_at_3: number
  hit_at_5: number
  hit_at_8: number
  mrr: number
  llm_judge_correctness_rate: number | null
  llm_judge_faithfulness_rate: number | null
  config_json: Record<string, unknown>
}

export type EvalCaseResult = {
  id: string
  case_index: number
  case_id: string
  query: string
  expected_sources: string[]
  retrieved_sources: string[]
  answer: string
  hit_at_1: boolean
  hit_at_3: boolean
  hit_at_5: boolean
  hit_at_8: boolean
  mrr: number
  llm_judge_correctness: boolean | null
  llm_judge_faithfulness: boolean | null
  llm_judge_reasoning: string | null
  error: string | null
  citations: Record<string, unknown>[]
}

export type EvalRunDetail = EvalRunSummary & {
  error_message: string | null
  cases: EvalCaseResult[]
}

export async function fetchEvalRunsList(params?: {
  limit?: number
  offset?: number
}): Promise<{ runs: EvalRunSummary[] }> {
  ensureBrowser()
  const limit = params?.limit ?? 50
  const offset = params?.offset ?? 0
  const res = await fetch(`${API_BASE_URL}/api/v1/eval/runs?limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) await throwForStatus(res)
  return res.json() as Promise<{ runs: EvalRunSummary[] }>
}

export async function fetchEvalRunDetail(runId: string): Promise<EvalRunDetail> {
  ensureBrowser()
  const id = encodePathSegment(runId)
  const res = await fetch(`${API_BASE_URL}/api/v1/eval/runs/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) await throwForStatus(res)
  return res.json() as Promise<EvalRunDetail>
}
