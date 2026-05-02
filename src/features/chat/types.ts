export type Role = 'user' | 'assistant' | 'system'

export interface Citation {
  chunk_id: string
  document_id: string
  title: string | null
  source: string
  chunk_index: number
}

export interface ChatMessage {
  id: string
  role: Role
  content: string
  latencyMs?: number
  costUsd?: number
  ragModel?: string
  citations?: Citation[]
  metadata?: Record<string, unknown>
  /** Mirrors HTTP ``X-Request-ID`` / ``queries.request_id`` when persisted */
  requestId?: string | null
  /** ``queries.id`` for the RAG audit row tied to this assistant turn */
  queryLogId?: string | null
  evalRunId?: string | null
  evalCaseId?: string | null
}
