'use client'

// Use relative URL to proxy through Vercel API routes
// This avoids mixed content and CORS issues
const API_BASE_URL = '/api/backend'

// Helper to ensure we're in browser environment
function ensureBrowser() {
  if (typeof window === 'undefined') {
    throw new Error('API functions can only be called in the browser')
  }
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
    // Try to parse error message from response
    let errorMessage = text || `Query failed with status ${res.status}`
    try {
      const errorData = JSON.parse(text)
      errorMessage = errorData.detail || errorData.message || errorMessage
    } catch {
      // If not JSON, use the text as-is
    }

    // Create error with status code for better handling
    const error = new Error(errorMessage) as Error & { status?: number }
    error.status = res.status
    throw error
  }

  return res.json()
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
    throw new Error(text || `Ingest failed with status ${res.status}`)
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
