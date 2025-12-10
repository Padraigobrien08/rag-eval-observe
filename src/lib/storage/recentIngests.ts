'use client'

const STORAGE_KEY = 'rag-recent-ingests'
const MAX_RECENT_INGESTS = 10

export interface RecentIngest {
  source: string
  title?: string
  document_id: string
  chunks_created: number
  created_at: string // ISO timestamp
}

export function loadRecentIngests(): RecentIngest[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed)) {
        return parsed.slice(0, MAX_RECENT_INGESTS)
      }
    }
  } catch (error) {
    console.error('Failed to load recent ingests:', error)
  }

  return []
}

export function saveRecentIngest(ingest: RecentIngest): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const recent = loadRecentIngests()
    // Remove any existing entry with the same document_id
    const filtered = recent.filter(i => i.document_id !== ingest.document_id)
    // Add new ingest at the beginning
    const updated = [ingest, ...filtered].slice(0, MAX_RECENT_INGESTS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to save recent ingest:', error)
  }
}

export function clearRecentIngests(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear recent ingests:', error)
  }
}
