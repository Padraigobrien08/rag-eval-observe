'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { queryRag } from '@/lib/api/client'
import type { QueryRequest, ApiError } from '@/lib/api/types'
import type { ChatMessage, ChatOptions, UserChatMessage, AssistantChatMessage } from './types'
import {
  loadChatSessions,
  saveChatSession,
  createNewSessionId,
  type ChatSession,
} from '@/lib/storage/chatSessions'

// Estimate cost based on token usage (rough estimates for GPT-4)
function estimateCost(tokenUsage?: {
  total_tokens?: number
  prompt_tokens?: number
  completion_tokens?: number
}): number {
  if (!tokenUsage) return 0

  // Rough estimates (as of 2024):
  // GPT-4 Turbo: ~$0.01 per 1K input tokens, ~$0.03 per 1K output tokens
  const inputCostPer1K = 0.01
  const outputCostPer1K = 0.03

  const inputTokens = tokenUsage.prompt_tokens || 0
  const outputTokens = tokenUsage.completion_tokens || 0

  return (inputTokens / 1000) * inputCostPer1K + (outputTokens / 1000) * outputCostPer1K
}

export function useChat(sessionId?: string) {
  const [currentSessionId, setCurrentSessionId] = useState<string>(
    () => sessionId || createNewSessionId()
  )
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Store last message and options for retry
  const lastMessageRef = useRef<{ text: string; options: ChatOptions } | null>(null)

  // Load messages when session changes
  useEffect(() => {
    if (!currentSessionId) return

    const sessions = loadChatSessions()
    const session = sessions[currentSessionId]
    if (session) {
      setMessages(session.messages)
    } else {
      setMessages([])
    }
  }, [currentSessionId])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (!currentSessionId || messages.length === 0) return

    const firstUserMessage = messages.find(msg => msg.role === 'user')
    const session: ChatSession = {
      id: currentSessionId,
      messages,
      createdAt:
        messages.length > 0 ? messages[0].createdAt.toISOString() : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      firstPrompt: firstUserMessage?.content.substring(0, 50) || undefined,
    }
    saveChatSession(session)
  }, [currentSessionId, messages])

  // Compute aggregate telemetry
  const telemetry = useMemo(() => {
    const assistantMessages = messages.filter(
      (msg): msg is AssistantChatMessage => msg.role === 'assistant' && !msg.meta?.error
    )

    let totalTokens = 0
    let totalCost = 0
    const latencies: number[] = []

    assistantMessages.forEach(msg => {
      if (msg.meta?.tokenUsage) {
        const prompt = msg.meta.tokenUsage.prompt_tokens || 0
        const completion = msg.meta.tokenUsage.completion_tokens || 0
        totalTokens += prompt + completion
        totalCost += estimateCost(msg.meta.tokenUsage)
      }
      if (msg.meta?.latencyMs !== undefined) {
        latencies.push(msg.meta.latencyMs)
      }
    })

    const avgLatency =
      latencies.length > 0 ? latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length : 0

    return {
      total_tokens: totalTokens,
      avg_latency_ms: Math.round(avgLatency),
      total_cost: totalCost,
    }
  }, [messages])

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
            used_chunk_ids: response.used_chunk_ids,
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
    // Create a new session
    const newSessionId = createNewSessionId()
    setCurrentSessionId(newSessionId)
    setMessages([])
    setError(null)
    setIsLoading(false)
  }, [])

  const switchSession = useCallback((newSessionId: string) => {
    setCurrentSessionId(newSessionId)
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
    telemetry,
    sessionId: currentSessionId,
    switchSession,
  }
}
