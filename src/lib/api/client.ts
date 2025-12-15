const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export async function ragQuery(body: {
  query: string
  topK?: number
  debug?: boolean
  filters?: Record<string, unknown>
}) {
  const res = await fetch(`${API_BASE_URL}/api/v1/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Query failed with status ${res.status}`)
  }

  return res.json()
}

export async function ingestDocument(body: {
  source: string
  title?: string
  text: string
  is_markdown?: boolean
}) {
  const res = await fetch(`${API_BASE_URL}/api/v1/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `Ingest failed with status ${res.status}`)
  }

  return res.json()
}

export async function listDocuments(limit = 100, offset = 0) {
  const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now()

  try {
    // Add timeout to prevent hanging
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    if (typeof console !== 'undefined' && console.log) {
      console.log('[listDocuments] Starting fetch to', `${API_BASE_URL}/api/v1/documents`)
    }

    const res = await fetch(`${API_BASE_URL}/api/v1/documents?limit=${limit}&offset=${offset}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const fetchTime = typeof performance !== 'undefined' ? performance.now() : Date.now()

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(text || `List documents failed with status ${res.status}`)
    }

    const data = await res.json()
    const parseTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const totalTime = parseTime - startTime

    if (typeof console !== 'undefined' && console.log) {
      console.log('[listDocuments] Timing:', {
        fetch_ms: fetchTime - startTime,
        parse_ms: parseTime - fetchTime,
        total_ms: totalTime,
        document_count: data.documents?.length || 0,
      })
    }

    return data
  } catch (error: any) {
    const errorTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
    const elapsed = errorTime - startTime

    if (typeof console !== 'undefined' && console.error) {
      if (error.name === 'AbortError') {
        console.error('[listDocuments] Request timed out after', elapsed, 'ms')
      } else {
        console.error('[listDocuments] Error after', elapsed, 'ms:', error)
      }
    }

    // Provide more helpful error message
    if (error.name === 'AbortError') {
      throw new Error(
        `Request timed out after ${elapsed}ms. Is the backend running at ${API_BASE_URL}?`
      )
    }

    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      throw new Error(
        `Cannot connect to backend at ${API_BASE_URL}. Is the backend server running?`
      )
    }

    throw error
  }
}

export async function deleteDocument(documentId: string) {
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
