'use client'

import { API_BASE_URL, encodePathSegment, ensureBrowser, throwForStatus } from './http'

/** Mirrors the backend's `routes/chat.py` — the Postgres-backed thread store. */

/** Postgres-backed chat thread (sidebar). */
export interface ChatThreadSummary {
  id: string
  title: string | null
  created_at: string | null
  updated_at: string | null
  message_count: number
}

/** Message row from GET /chat/threads/:id/messages */
export interface PersistedChatMessage {
  id: string
  thread_id: string
  role: string
  content: string
  citations: unknown[]
  metadata: Record<string, unknown>
  latency_ms: number | null
  cost_usd: number | null
  rag_model: string | null
  seq: number
  created_at: string | null
  request_id?: string | null
  query_log_id?: string | null
  eval_run_id?: string | null
  eval_case_id?: string | null
}

export async function createChatThread(body?: {
  title?: string | null
}): Promise<ChatThreadSummary> {
  ensureBrowser()
  const res = await fetch(`${API_BASE_URL}/api/v1/chat/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (!res.ok) await throwForStatus(res)
  return res.json() as Promise<ChatThreadSummary>
}

export async function updateChatThread(
  threadId: string,
  body: { title: string }
): Promise<ChatThreadSummary> {
  ensureBrowser()
  const id = encodePathSegment(threadId)
  const res = await fetch(`${API_BASE_URL}/api/v1/chat/threads/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) await throwForStatus(res)
  return res.json() as Promise<ChatThreadSummary>
}

export async function listChatThreads(limit = 50): Promise<ChatThreadSummary[]> {
  ensureBrowser()
  const res = await fetch(`${API_BASE_URL}/api/v1/chat/threads?limit=${limit}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) await throwForStatus(res)
  const data = (await res.json()) as { threads: ChatThreadSummary[] }
  return data.threads ?? []
}

export async function listChatMessages(threadId: string): Promise<PersistedChatMessage[]> {
  ensureBrowser()
  const id = encodePathSegment(threadId)
  const res = await fetch(`${API_BASE_URL}/api/v1/chat/threads/${id}/messages`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) await throwForStatus(res)
  const data = (await res.json()) as { messages: PersistedChatMessage[] }
  return data.messages ?? []
}

export async function appendChatMessage(
  threadId: string,
  body: {
    role: 'user' | 'assistant' | 'system'
    content: string
    citations?: Record<string, unknown>[]
    metadata?: Record<string, unknown>
    latency_ms?: number
    cost_usd?: number
    rag_model?: string
    request_id?: string | null
    query_log_id?: string | null
    eval_run_id?: string | null
    eval_case_id?: string | null
  }
): Promise<PersistedChatMessage> {
  ensureBrowser()
  const id = encodePathSegment(threadId)
  const res = await fetch(`${API_BASE_URL}/api/v1/chat/threads/${id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) await throwForStatus(res)
  return res.json() as Promise<PersistedChatMessage>
}

export async function deleteChatThread(threadId: string): Promise<void> {
  ensureBrowser()
  const id = encodePathSegment(threadId)
  const res = await fetch(`${API_BASE_URL}/api/v1/chat/threads/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) await throwForStatus(res)
}

export async function deleteAllChatThreads(): Promise<{ deleted_count: number }> {
  ensureBrowser()
  const res = await fetch(`${API_BASE_URL}/api/v1/chat/threads`, {
    method: 'DELETE',
  })
  if (!res.ok) await throwForStatus(res)
  return res.json() as Promise<{ deleted_count: number }>
}
