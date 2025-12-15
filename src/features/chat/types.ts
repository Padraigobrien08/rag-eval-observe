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
  metadata?: any
}
