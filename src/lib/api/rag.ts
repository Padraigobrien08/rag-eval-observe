'use client'

import { API_BASE_URL, combineAbortSignals, ensureBrowser, messageFromErrorResponse } from './http'

/** Mirrors the backend's `routes/query.py`. */

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
