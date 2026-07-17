'use client'

import { API_BASE_URL, ensureBrowser } from './http'

/** Mirrors the backend's `routes/health.py`. */

export async function checkHealth(): Promise<{ ok: boolean; db: boolean; version: string }> {
  ensureBrowser()
  const res = await fetch(`${API_BASE_URL}/api/v1/health`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Health check failed with status ${res.status}`)
  }

  // A network error (backend down, CORS) rejects the fetch above and propagates
  // to the caller — connection-status.tsx renders that as "disconnected".
  return res.json()
}
