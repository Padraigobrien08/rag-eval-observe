'use client'

import { API_BASE_URL, encodePathSegment, ensureBrowser, throwForStatus } from './http'

/** Mirrors the backend's `routes/documents.py` and `routes/ingest.py`. */

export interface IngestPreprocessingSummary {
  original_character_count: number
  normalized_character_count: number
  character_delta: number
  steps_applied: string[]
  warnings: string[]
}

export interface IngestChunkingSummary {
  chunks_before_merge: number
  chunks_created: number
  undersized_chunk_merges: number
  chunk_target_size: number
  chunk_overlap: number
  adaptive_chunking: boolean
  config_chunk_size: number
  config_chunk_overlap: number
  estimated_target_chunks: number
  min_chunk_characters_applied: number
  merged_chunk_soft_cap_chars: number
  chunk_length_min: number
  chunk_length_max: number
  chunk_length_mean: number
  chunk_length_median: number
}

export interface IngestResponsePayload {
  document_id: string
  chunks_created: number
  replaced_existing: boolean
  preprocessing: IngestPreprocessingSummary
  chunking: IngestChunkingSummary
}

/** Single-document metadata from GET /documents/{id} (used for accurate PDF preview flag). */
export interface DocumentDetailPayload {
  id: string
  source: string
  title?: string | null
  created_at?: string | null
  original_available: boolean
}

export async function ingestDocument(body: {
  source: string
  title?: string
  text: string
  is_markdown?: boolean
  /** Optional PDF bytes as standard base64 (enables original preview in the UI). */
  original_file_base64?: string
  original_media_type?: 'application/pdf'
}): Promise<IngestResponsePayload> {
  ensureBrowser()
  const res = await fetch(`${API_BASE_URL}/api/v1/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) await throwForStatus(res)

  return res.json() as Promise<IngestResponsePayload>
}

export async function listDocuments(limit = 100, offset = 0, includeTotal = false) {
  ensureBrowser()

  try {
    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    })
    if (includeTotal) params.set('include_total', 'true')

    const res = await fetch(`${API_BASE_URL}/api/v1/documents?${params}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `List documents failed with status ${res.status}`)
    }

    const data = await res.json()
    return data
  } catch (error: unknown) {
    // Provide more helpful error message
    const err = error as { name?: string; message?: string }
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out. Is the backend running at ${API_BASE_URL}?`)
    }

    if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
      throw new Error(
        `Cannot connect to backend at ${API_BASE_URL}. Is the backend server running?`
      )
    }

    throw error
  }
}

export async function getDocument(documentId: string): Promise<DocumentDetailPayload> {
  ensureBrowser()
  const id = encodePathSegment(documentId)
  const res = await fetch(`${API_BASE_URL}/api/v1/documents/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) await throwForStatus(res)

  const raw = (await res.json()) as Record<string, unknown>
  const originalAvailableFlag = raw.original_available === true || raw.originalAvailable === true

  return {
    id: String(raw.id ?? ''),
    source: String(raw.source ?? ''),
    title: raw.title != null ? String(raw.title) : null,
    created_at: raw.created_at != null ? String(raw.created_at) : null,
    original_available: originalAvailableFlag,
  }
}

export async function deleteDocument(documentId: string) {
  ensureBrowser()
  const id = encodePathSegment(documentId)
  const res = await fetch(`${API_BASE_URL}/api/v1/documents/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) await throwForStatus(res)

  return res.json()
}

export async function getDocumentChunks(documentId: string) {
  ensureBrowser()
  const id = encodePathSegment(documentId)
  const res = await fetch(`${API_BASE_URL}/api/v1/documents/${id}/chunks`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Get document chunks failed with status ${res.status}`)
  }

  return res.json()
}

/** Proxied URL for inline PDF preview (`<iframe src={...} />`). */
export function documentOriginalUrl(documentId: string): string {
  const id = encodePathSegment(documentId)
  return `${API_BASE_URL}/api/v1/documents/${id}/original`
}
