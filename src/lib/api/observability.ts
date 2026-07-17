'use client'

import { API_BASE_URL, encodePathSegment, ensureBrowser, throwForStatus } from './http'

/** Mirrors the backend's `routes/metrics.py` and `routes/analytics.py`. */

export type QueryLogDetail = {
  id: string
  query_text: string
  rag_model: string
  top_k: number | null
  request_id: string | null
  client_ip: string | null
  user_agent: string | null
  latency_ms: number | null
  token_usage: Record<string, number> | null
  cost_usd: number | null
  citations_count: number | null
  answer_length: number | null
  created_at: string | null
}

export async function getMetrics() {
  ensureBrowser()
  const res = await fetch(`${API_BASE_URL}/api/v1/metrics`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Get metrics failed with status ${res.status}`)
  }

  return res.json()
}

export async function fetchQueryLogDetail(queryId: string): Promise<QueryLogDetail> {
  ensureBrowser()
  const id = encodePathSegment(queryId)
  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/query-log/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) await throwForStatus(res)
  return res.json() as Promise<QueryLogDetail>
}

export async function fetchQueryLogsList(params?: {
  limit?: number
  offset?: number
  rag_model?: string
  start_date?: string
  end_date?: string
}): Promise<{ logs: QueryLogDetail[] }> {
  ensureBrowser()
  const q = new URLSearchParams()
  q.set('limit', String(params?.limit ?? 50))
  q.set('offset', String(params?.offset ?? 0))
  if (params?.rag_model?.trim()) q.set('rag_model', params.rag_model.trim())
  if (params?.start_date?.trim()) q.set('start_date', params.start_date.trim())
  if (params?.end_date?.trim()) q.set('end_date', params.end_date.trim())
  const res = await fetch(`${API_BASE_URL}/api/v1/analytics/query-logs?${q}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) await throwForStatus(res)
  return res.json() as Promise<{ logs: QueryLogDetail[] }>
}
