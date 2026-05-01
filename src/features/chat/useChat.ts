'use client'

import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { ChatMessage, Citation } from './types'
import { ragQuery } from '@/lib/api/client'

/**
 * Calculate cost in USD from token usage (approximate for gpt-4o-mini).
 * See OpenAI pricing: input ~$0.15 / 1M, output ~$0.60 / 1M (adjust if you change models).
 */
function calculateCost(tokenUsage?: {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}): number | undefined {
  if (!tokenUsage) return undefined

  const inputTokens = tokenUsage.prompt_tokens || 0
  const outputTokens = tokenUsage.completion_tokens || 0

  const INPUT_COST_PER_1K = 0.00015
  const OUTPUT_COST_PER_1K = 0.0006

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
      const resp = await ragQuery(requestBody)

      // Extract citations from API response
      const citations: Citation[] = ((resp.citations as unknown[]) || []).map((cit: unknown) => {
        const citation = cit as Record<string, unknown>
        return {
          chunk_id: (citation.chunk_id || citation.chunkId || '') as string,
          document_id: (citation.document_id || citation.documentId || '') as string,
          title: (citation.title || null) as string | null,
          source: (citation.source || '') as string,
          chunk_index: (citation.chunk_index || citation.chunkIndex || 0) as number,
        }
      })

      // Store debug data (including content snippets) in metadata for hover previews
      const metadata: Record<string, unknown> = {
        ...((resp.metadata ?? resp.telemetry ?? {}) as Record<string, unknown>),
      }

      const retrievedCount =
        typeof resp.retrieved_chunk_count === 'number'
          ? resp.retrieved_chunk_count
          : typeof (resp as { retrievedChunkCount?: number }).retrievedChunkCount === 'number'
            ? (resp as { retrievedChunkCount: number }).retrievedChunkCount
            : undefined
      if (retrievedCount !== undefined) {
        metadata.retrieved_chunk_count = retrievedCount
      }

      // Include debug retrieved chunks if available (for hover previews)
      if (resp.debug?.retrieved) {
        metadata.debug = {
          retrieved: resp.debug.retrieved,
        }
      }

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

      setMessages(prev => [...prev, assistantMessage])
    } catch (err: unknown) {
      // Provide user-friendly error messages
      const error = err as Error & { status?: number }
      if (error.status === 429) {
        setError('Rate limit exceeded. Please wait a moment and try again.')
      } else if (error.message) {
        setError(error.message)
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
