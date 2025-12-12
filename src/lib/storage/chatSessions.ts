'use client'

import type { ChatMessage } from '@/features/chat/types'

const STORAGE_KEY = 'rag-chat-sessions'
const MAX_SESSIONS = 10

export interface ChatSession {
  id: string
  messages: ChatMessage[]
  createdAt: string // ISO timestamp
  updatedAt: string // ISO timestamp
  firstPrompt?: string // First user message for display
}

export interface ChatSessionsMap {
  [sessionId: string]: ChatSession
}

export function loadChatSessions(): ChatSessionsMap {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      // Convert date strings back to Date objects
      const sessions: ChatSessionsMap = {}
      for (const [id, session] of Object.entries(parsed)) {
        const s = session as any
        sessions[id] = {
          ...s,
          messages: (s.messages || []).map((msg: any) => ({
            ...msg,
            createdAt: new Date(msg.createdAt),
          })),
        }
      }
      return sessions
    }
  } catch (error) {
    console.error('Failed to load chat sessions:', error)
  }

  return {}
}

export function saveChatSession(session: ChatSession): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const sessions = loadChatSessions()

    // Add or update session
    sessions[session.id] = session

    // Sort by updatedAt (most recent first) and keep only last MAX_SESSIONS
    const sorted = Object.values(sessions).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    const limited = sorted.slice(0, MAX_SESSIONS)

    // Rebuild sessions map
    const updated: ChatSessionsMap = {}
    limited.forEach(s => {
      updated[s.id] = s
    })

    // Convert Date objects to ISO strings for storage
    const toStore: any = {}
    for (const [id, s] of Object.entries(updated)) {
      toStore[id] = {
        ...s,
        messages: s.messages.map(msg => ({
          ...msg,
          createdAt: msg.createdAt.toISOString(),
        })),
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
  } catch (error) {
    console.error('Failed to save chat session:', error)
  }
}

export function deleteChatSession(sessionId: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const sessions = loadChatSessions()
    delete sessions[sessionId]

    // Convert Date objects to ISO strings for storage
    const toStore: any = {}
    for (const [id, s] of Object.entries(sessions)) {
      toStore[id] = {
        ...s,
        messages: s.messages.map(msg => ({
          ...msg,
          createdAt: msg.createdAt.toISOString(),
        })),
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore))
  } catch (error) {
    console.error('Failed to delete chat session:', error)
  }
}

export function createNewSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
