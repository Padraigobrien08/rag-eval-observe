'use client'

import { useState, useCallback } from 'react'
import { queryRag } from '@/lib/api/client'
import type { QueryRequest, QueryResponse } from '@/lib/api/types'
import type { ChatMessage, ChatOptions, UserChatMessage, AssistantChatMessage } from './types'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(
    async (text: string, options: ChatOptions = {}) => {
      if (!text.trim() || isLoading) return

      const userMessage: UserChatMessage = {
        id: `user-${Date.now()}-${Math.random()}`,
        role: 'user',
        content: text.trim(),
        createdAt: new Date(),
      }

      // Append user message immediately
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setError(null)

      try {
        const payload: QueryRequest = {
          query: text.trim(),
          top_k: options.topK ?? 8,
          filters: options.filters,
          debug: options.debug ?? false,
        }

        const response = await queryRag(payload)

        const assistantMessage: AssistantChatMessage = {
          id: `assistant-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          content: response.answer,
          createdAt: new Date(),
          meta: {
            citations: response.citations,
            tokenUsage: response.token_usage,
            latencyMs: response.latency_ms,
            debugRetrieved: response.debug?.retrieved,
          },
        }

        setMessages((prev) => [...prev, assistantMessage])
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unknown error occurred'
        setError(errorMessage)

        // Optionally add an error message to the chat
        const errorMessageObj: AssistantChatMessage = {
          id: `error-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          content: `Error: ${errorMessage}`,
          createdAt: new Date(),
        }
        setMessages((prev) => [...prev, errorMessageObj])
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading]
  )

  const resetChat = useCallback(() => {
    setMessages([])
    setError(null)
    setIsLoading(false)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    resetChat,
  }
}

