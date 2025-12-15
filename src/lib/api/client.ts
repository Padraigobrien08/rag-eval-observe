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
  const res = await fetch(`${API_BASE_URL}/api/v1/documents?limit=${limit}&offset=${offset}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `List documents failed with status ${res.status}`)
  }

  return res.json()
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
