'use client'

// Use relative URL to proxy through Vercel API routes
// This avoids mixed content and CORS issues
const API_BASE_URL = '/api/backend'

/** Normalize FastAPI `detail` (string, object, or validation error list). */
export function formatApiErrorDetail(detail: unknown): string {
  if (detail == null) return ''
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map(item => {
        if (item && typeof item === 'object' && 'msg' in item) {
          const loc =
            'loc' in item && Array.isArray((item as { loc: unknown }).loc)
              ? `${(item as { loc: unknown[] }).loc.join('.')}: `
              : ''
          return `${loc}${String((item as { msg: unknown }).msg)}`
        }
        return JSON.stringify(item)
      })
      .join('; ')
  }
  if (typeof detail === 'object' && detail !== null && 'message' in detail) {
    return String((detail as { message: unknown }).message)
  }
  return String(detail)
}

function messageFromErrorResponse(text: string, status: number): string {
  const fallback = text.trim() || `Request failed with status ${status}`
  try {
    const data = JSON.parse(text) as { detail?: unknown; message?: unknown }
    if (data.detail !== undefined) return formatApiErrorDetail(data.detail) || fallback
    if (data.message !== undefined) return String(data.message)
  } catch {
    /* use fallback */
  }
  return fallback
}

// Helper to ensure we're in browser environment
function ensureBrowser() {
  if (typeof window === 'undefined') {
    throw new Error('API functions can only be called in the browser')
  }
}

/** Abort when any of the signals abort (DOM spec `AbortSignal.any` is not universal yet). */
function combineAbortSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (a.aborted) return a
  if (b.aborted) return b
  const merged = new AbortController()
  const onAbort = () => merged.abort()
  a.addEventListener('abort', onAbort)
  b.addEventListener('abort', onAbort)
  return merged.signal
}

export async function ragQuery(body: {
  query: string
  topK?: number
  debug?: boolean
  filters?: Record<string, unknown>
  rag_model?: string
}) {
  ensureBrowser()
  const res = await fetch(`${API_BASE_URL}/api/v1/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    const errorMessage = messageFromErrorResponse(text, res.status)

    // Create error with status code for better handling
    const error = new Error(errorMessage) as Error & { status?: number }
    error.status = res.status
    throw error
  }

  return res.json()
}

const RAG_STREAM_TIMEOUT_MS = 180_000

export async function ragQueryStream(
  body: {
    query: string
    topK?: number
    debug?: boolean
    filters?: Record<string, unknown>
    rag_model?: string
  },
  handlers: {
    onDelta: (text: string) => void
    onDone: (data: Record<string, unknown>) => void
    onError: (message: string) => void
    onAbort?: () => void
  },
  signal?: AbortSignal
): Promise<void> {
  ensureBrowser()

  let timedOut = false
  const timeoutController = new AbortController()
  const timeoutId = window.setTimeout(() => {
    timedOut = true
    timeoutController.abort()
  }, RAG_STREAM_TIMEOUT_MS)

  const combined =
    signal !== undefined
      ? combineAbortSignals(signal, timeoutController.signal)
      : timeoutController.signal

  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}/api/v1/query/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: combined,
    })
  } catch {
    window.clearTimeout(timeoutId)
    if (timedOut) {
      handlers.onError('The request timed out. Try again or turn off streaming in settings.')
      return
    }
    if (signal?.aborted) {
      handlers.onAbort?.()
      return
    }
    handlers.onError('Network error while connecting for streaming.')
    return
  }

  if (!res.ok) {
    window.clearTimeout(timeoutId)
    const text = await res.text().catch(() => '')
    handlers.onError(messageFromErrorResponse(text, res.status))
    return
  }

  const reader = res.body?.getReader()
  if (!reader) {
    window.clearTimeout(timeoutId)
    handlers.onError('No response body')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let streamFailed = false
  let sawDone = false

  const processBuffer = (): void => {
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    outer: for (const block of parts) {
      for (const line of block.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const jsonStr = trimmed.slice(5).trim()
        if (!jsonStr || jsonStr === '[DONE]') continue
        let ev: unknown
        try {
          ev = JSON.parse(jsonStr)
        } catch {
          continue
        }
        if (typeof ev !== 'object' || ev === null || !('type' in ev)) continue
        const o = ev as { type: string; text?: string; message?: string }
        if (o.type === 'delta' && typeof o.text === 'string') {
          handlers.onDelta(o.text)
        } else if (o.type === 'done') {
          sawDone = true
          handlers.onDone(ev as Record<string, unknown>)
        } else if (o.type === 'error' && typeof o.message === 'string') {
          streamFailed = true
          handlers.onError(o.message)
          break outer
        }
      }
    }
  }

  try {
    while (!streamFailed) {
      let readResult: ReadableStreamReadResult<Uint8Array>
      try {
        readResult = await reader.read()
      } catch {
        window.clearTimeout(timeoutId)
        if (timedOut) {
          handlers.onError('The request timed out while streaming.')
          return
        }
        if (signal?.aborted) {
          handlers.onAbort?.()
          return
        }
        handlers.onError('Connection lost while streaming.')
        return
      }

      const { done, value } = readResult
      if (done) {
        if (buffer.trim()) {
          buffer += '\n\n'
          processBuffer()
        }
        break
      }
      buffer += decoder.decode(value, { stream: true })
      processBuffer()
    }
  } finally {
    window.clearTimeout(timeoutId)
    try {
      reader.releaseLock()
    } catch {
      /* ignore */
    }
  }

  if (timedOut) {
    handlers.onError('The request timed out while streaming.')
    return
  }
  if (signal?.aborted) {
    handlers.onAbort?.()
    return
  }
  if (!sawDone && !streamFailed) {
    handlers.onError('Stream ended before the answer was complete. Try again.')
  }
}

export async function ingestDocument(body: {
  source: string
  title?: string
  text: string
  is_markdown?: boolean
}) {
  ensureBrowser()
  const res = await fetch(`${API_BASE_URL}/api/v1/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(messageFromErrorResponse(text, res.status))
  }

  return res.json()
}

export async function listDocuments(limit = 100, offset = 0) {
  ensureBrowser()

  try {
    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const res = await fetch(`${API_BASE_URL}/api/v1/documents?limit=${limit}&offset=${offset}`, {
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

export async function deleteDocument(documentId: string) {
  ensureBrowser()
  const res = await fetch(`${API_BASE_URL}/api/v1/documents/${documentId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Delete document failed with status ${res.status}`)
  }

  return res.json()
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

export async function getDocumentChunks(documentId: string) {
  ensureBrowser()
  const res = await fetch(`${API_BASE_URL}/api/v1/documents/${documentId}/chunks`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Get document chunks failed with status ${res.status}`)
  }

  return res.json()
}

export async function extractTextFromFile(file: File): Promise<string> {
  ensureBrowser()
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE_URL}/api/v1/extract-text`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Text extraction failed with status ${res.status}`)
  }

  const data = await res.json()
  return data.text
}

export async function checkHealth(): Promise<{ ok: boolean; db: boolean; version: string }> {
  ensureBrowser()
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      throw new Error(`Health check failed with status ${res.status}`)
    }

    return await res.json()
  } catch (error) {
    // If the request fails (network error, CORS, etc.), return unhealthy status
    throw error
  }
}
