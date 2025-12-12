'use client'

import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { ChatMessage } from './types'
import { ragQuery } from '@/lib/api/client'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = async (
    text: string,
    options?: { topK?: number; debug?: boolean; filters?: Record<string, unknown> }
  ) => {
    setError(null)
    const userMessage: ChatMessage = {
      id: uuid(),
      role: 'user',
      content: text,
    }
    setMessages(prev => [...prev, userMessage])

    setIsLoading(true)
    try {
      const resp = await ragQuery({
        query: text,
        topK: options?.topK,
        debug: options?.debug,
        filters: options?.filters,
      })

      const assistantMessage: ChatMessage = {
        id: uuid(),
        role: 'assistant',
        content: resp.answer ?? resp.output ?? 'No answer field returned.',
        metadata: resp.metadata ?? resp.telemetry ?? {},
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err: any) {
      console.error(err)
      setError(err.message ?? 'Failed to query backend')
    } finally {
      setIsLoading(false)
    }
  }

  const resetChat = () => {
    setMessages([])
    setError(null)
  }

  return { messages, isLoading, error, sendMessage, resetChat }
}
