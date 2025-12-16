'use client'

import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { ChatMessage, Citation } from './types'
import { ragQuery } from '@/lib/api/client'

/**
 * Calculate cost in USD from token usage.
 * Pricing for gpt-4-turbo-preview:
 * - Input: $0.01 per 1K tokens
 * - Output: $0.03 per 1K tokens
 */
function calculateCost(tokenUsage?: {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}): number | undefined {
  if (!tokenUsage) return undefined

  const inputTokens = tokenUsage.prompt_tokens || 0
  const outputTokens = tokenUsage.completion_tokens || 0

  // Pricing per 1K tokens
  const INPUT_COST_PER_1K = 0.01 // $0.01 per 1K input tokens
  const OUTPUT_COST_PER_1K = 0.03 // $0.03 per 1K output tokens

  const inputCost = (inputTokens / 1000) * INPUT_COST_PER_1K
  const outputCost = (outputTokens / 1000) * OUTPUT_COST_PER_1K

  return inputCost + outputCost
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = async (
    text: string,
    options?: {
      topK?: number
      debug?: boolean
      filters?: Record<string, unknown>
      rag_model?: string
    }
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
      const requestBody = {
        query: text,
        topK: options?.topK,
        debug: options?.debug,
        filters: options?.filters,
        rag_model: options?.rag_model,
      }
      console.log('[useChat] Sending request:', {
        query: text.substring(0, 50),
        rag_model: options?.rag_model,
        requestBody,
      })
      const resp = await ragQuery(requestBody)

      // Extract citations from API response
      const citations: Citation[] = (resp.citations || []).map((cit: any) => ({
        chunk_id: cit.chunk_id || cit.chunkId || '',
        document_id: cit.document_id || cit.documentId || '',
        title: cit.title || null,
        source: cit.source || '',
        chunk_index: cit.chunk_index || cit.chunkIndex || 0,
      }))

      // Store debug data (including content snippets) in metadata for hover previews
      const metadata: any = {
        ...(resp.metadata ?? resp.telemetry ?? {}),
      }

      // Include debug retrieved chunks if available (for hover previews)
      if (resp.debug?.retrieved) {
        metadata.debug = {
          retrieved: resp.debug.retrieved,
        }
      }

      // Log response for debugging
      console.log('[useChat] Response received:', {
        hasAnswer: !!resp.answer,
        answerLength: resp.answer?.length || 0,
        answerPreview: resp.answer?.substring(0, 100),
        hasOutput: !!resp.output,
        outputLength: resp.output?.length || 0,
        rag_model: resp.rag_model,
        ragModel: resp.ragModel,
        fullResponse: resp,
      })

      const assistantMessage: ChatMessage = {
        id: uuid(),
        role: 'assistant',
        content: resp.answer ?? resp.output ?? 'No answer field returned.',
        latencyMs: resp.latency_ms ?? resp.latencyMs,
        costUsd: calculateCost(resp.token_usage ?? resp.tokenUsage),
        ragModel: resp.rag_model ?? resp.ragModel,
        citations: citations.length > 0 ? citations : undefined,
        metadata,
      }

      console.log('[useChat] Assistant message created:', {
        contentLength: assistantMessage.content?.length || 0,
        contentPreview: assistantMessage.content?.substring(0, 100),
        ragModel: assistantMessage.ragModel,
      })
      setMessages(prev => [...prev, assistantMessage])
    } catch (err: any) {
      console.error(err)
      // Provide user-friendly error messages
      if (err.status === 429) {
        setError('Rate limit exceeded. Please wait a moment and try again.')
      } else if (err.message) {
        setError(err.message)
      } else {
        setError('Failed to query backend. Please try again.')
      }
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
