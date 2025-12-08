/**
 * TypeScript types for API requests and responses
 */

export interface IngestRequest {
  source: string
  title?: string
  text: string
  is_markdown?: boolean
}

export interface IngestResponse {
  document_id: string
  chunks_created: number
}

export interface QueryRequest {
  query: string
  top_k?: number
  filters?: {
    source?: string
    title?: string
  }
  debug?: boolean
}

export interface Citation {
  document_id: string
  title?: string
  source?: string
  chunk_index?: number
  chunk_id?: string
}

export interface RetrievedChunkDebug {
  chunk_id: string
  score: number
  content_snippet: string
  title?: string
  source?: string
  chunk_index?: number
}

export interface QueryResponse {
  answer: string
  citations: Citation[]
  used_chunk_ids?: string[]
  latency_ms?: number
  token_usage?: any
  debug?: {
    retrieved: RetrievedChunkDebug[]
  }
}

export interface MetricsResponse {
  [k: string]: any
}

export interface HealthResponse {
  ok: boolean
  db?: boolean
  version?: string
}

export interface ApiError {
  message: string
  status: number
  details?: any
}

