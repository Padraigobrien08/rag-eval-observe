'use client'

import { useState, useCallback, useRef } from 'react'
import { queryRag } from '@/lib/api/client'
import type { QueryRequest, ApiError } from '@/lib/api/types'
import type { ChatMessage, ChatOptions, UserChatMessage, AssistantChatMessage } from './types'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Store last message and options for retry
  const lastMessageRef = useRef<{ text: string; options: ChatOptions } | null>(null)

  const sendMessage = useCallback(
    async (text: string, options: ChatOptions = {}) => {
      if (!text.trim() || isLoading) return

      // Store for potential retry
      lastMessageRef.current = { text: text.trim(), options }

      const userMessage: UserChatMessage = {
        id: `user-${Date.now()}-${Math.random()}`,
        role: 'user',
        content: text.trim(),
        createdAt: new Date(),
      }

      // Append user message immediately
      setMessages(prev => [...prev, userMessage])
      setIsLoading(true)
      setError(null)

      let requestId: string | undefined

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

        setMessages(prev => [...prev, assistantMessage])
      } catch (err) {
        // Extract error details
        let errorMessage = 'An unknown error occurred'
        let status: number | undefined
        let requestIdFromError: string | undefined

        if (err && typeof err === 'object' && 'message' in err) {
          errorMessage = (err as ApiError).message || errorMessage
          status = (err as ApiError).status
          // Try to extract request ID from error details
          if ((err as ApiError).details) {
            const details = (err as ApiError).details as any
            requestIdFromError = details.request_id || details.requestId
          }
        } else if (err instanceof Error) {
          errorMessage = err.message
        }

        // Log error for debugging
        console.error('Chat error:', {
          message: errorMessage,
          status,
          requestId: requestIdFromError,
          error: err,
        })

        setError(errorMessage)

        // Add error message to chat
        const errorMessageObj: AssistantChatMessage = {
          id: `error-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          content: '', // Empty content, error will be shown via meta.error
          createdAt: new Date(),
          meta: {
            error: {
              message: errorMessage,
              requestId: requestIdFromError,
              status,
            },
          },
        }
        setMessages(prev => [...prev, errorMessageObj])
      } finally {
        setIsLoading(false)
      }
    },
    [isLoading]
  )

  const retryLastMessage = useCallback(() => {
    if (lastMessageRef.current) {
      sendMessage(lastMessageRef.current.text, lastMessageRef.current.options)
    }
  }, [sendMessage])

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
    retryLastMessage,
  }
}
