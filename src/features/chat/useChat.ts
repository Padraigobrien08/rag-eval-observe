'use client'

import { useState, useRef, useCallback } from 'react'
import { v4 as uuid } from 'uuid'
import type { ChatMessage, Citation } from './types'
import { toast } from 'sonner'
import { ragQuery, ragQueryStream } from '@/lib/api/client'
import { estimateChatMessageCostUsd } from '@/lib/openai-pricing'

function mapCitations(raw: unknown): Citation[] {
  return ((raw as unknown[]) || []).map((cit: unknown) => {
    const citation = cit as Record<string, unknown>
    return {
      chunk_id: (citation.chunk_id || citation.chunkId || '') as string,
      document_id: (citation.document_id || citation.documentId || '') as string,
      title: (citation.title || null) as string | null,
      source: (citation.source || '') as string,
      chunk_index: (citation.chunk_index || citation.chunkIndex || 0) as number,
    }
  })
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setUserError = useCallback((message: string) => {
    setError(message)
    toast.error(message)
  }, [])
  /** While streaming: retrieval UI until first token, then generating UI */
  const [streamPhase, setStreamPhase] = useState<'idle' | 'retrieval' | 'generating'>('idle')
  const streamDeltaStartedRef = useRef(false)
  const streamAbortRef = useRef<AbortController | null>(null)

  const stopStreaming = useCallback(() => {
    streamAbortRef.current?.abort()
  }, [])

  const sendMessage = useCallback(
    async (
      text: string,
      options?: {
        topK?: number
        debug?: boolean
        filters?: Record<string, unknown>
        rag_model?: string
        stream?: boolean
      }
    ) => {
      setError(null)
      streamAbortRef.current?.abort()

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

        const useStream = options?.stream !== false

        if (useStream) {
          const assistantId = uuid()
          const ac = new AbortController()
          streamAbortRef.current = ac
          streamDeltaStartedRef.current = false
          setStreamPhase('retrieval')

          setMessages(prev => [
            ...prev,
            {
              id: assistantId,
              role: 'assistant',
              content: '',
              metadata: { streaming: true },
            },
          ])

          await ragQueryStream(
            requestBody,
            {
              onDelta: fragment => {
                if (!streamDeltaStartedRef.current) {
                  streamDeltaStartedRef.current = true
                  setStreamPhase('generating')
                }
                setMessages(prev => {
                  const i = prev.findIndex(m => m.id === assistantId)
                  if (i === -1) return prev
                  const next = [...prev]
                  const cur = next[i]
                  if (cur.role !== 'assistant') return prev
                  next[i] = { ...cur, content: cur.content + fragment }
                  return next
                })
              },
              onDone: data => {
                const citations = mapCitations(data.citations)
                const metadata: Record<string, unknown> = {
                  ...((data.metadata ?? data.telemetry ?? {}) as Record<string, unknown>),
                  streaming: false,
                }
                const retrievedCount = data.retrieved_chunk_count
                if (typeof retrievedCount === 'number') {
                  metadata.retrieved_chunk_count = retrievedCount
                }
                const dbg = data.debug as { retrieved?: unknown } | undefined
                if (dbg?.retrieved) {
                  metadata.debug = { retrieved: dbg.retrieved }
                }
                setMessages(prev => {
                  const i = prev.findIndex(m => m.id === assistantId)
                  if (i === -1) return prev
                  const next = [...prev]
                  const cur = next[i]
                  if (cur.role !== 'assistant') return prev
                  next[i] = {
                    ...cur,
                    content:
                      (typeof data.answer === 'string' && data.answer) ||
                      cur.content ||
                      'No answer returned.',
                    latencyMs: data.latency_ms as number | undefined,
                    costUsd: estimateChatMessageCostUsd(
                      data.token_usage as Record<string, number> | undefined
                    ),
                    ragModel: data.rag_model as string | undefined,
                    citations: citations.length > 0 ? citations : undefined,
                    metadata: { ...cur.metadata, ...metadata },
                  }
                  return next
                })
              },
              onError: msg => {
                setMessages(prev => {
                  const i = prev.findIndex(m => m.id === assistantId)
                  if (i === -1) return prev
                  const cur = prev[i]
                  if (cur.role !== 'assistant') return prev
                  if (!cur.content.trim()) {
                    return prev.filter(m => m.id !== assistantId)
                  }
                  const next = [...prev]
                  next[i] = {
                    ...cur,
                    metadata: { ...cur.metadata, streaming: false },
                  }
                  return next
                })
                if (msg.toLowerCase().includes('rate limit')) {
                  setUserError('Rate limit exceeded. Please wait a moment and try again.')
                } else {
                  setUserError(msg)
                }
              },
              onAbort: () => {
                setMessages(prev => {
                  const i = prev.findIndex(m => m.id === assistantId)
                  if (i === -1) return prev
                  const cur = prev[i]
                  if (cur.role !== 'assistant') return prev
                  if (!cur.content.trim()) {
                    return prev.filter(m => m.id !== assistantId)
                  }
                  const next = [...prev]
                  next[i] = {
                    ...cur,
                    metadata: { ...cur.metadata, streaming: false },
                  }
                  return next
                })
                setError(null)
              },
            },
            ac.signal
          )
          streamAbortRef.current = null
          setStreamPhase('idle')
        } else {
          const resp = await ragQuery(requestBody)
          const citations = mapCitations(resp.citations)

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
            costUsd: estimateChatMessageCostUsd(resp.token_usage ?? resp.tokenUsage),
            ragModel: resp.rag_model ?? resp.ragModel,
            citations: citations.length > 0 ? citations : undefined,
            metadata,
          }

          setMessages(prev => [...prev, assistantMessage])
        }
      } catch (err: unknown) {
        const error = err as Error & { status?: number }
        if (error.status === 429) {
          setUserError('Rate limit exceeded. Please wait a moment and try again.')
        } else if (error.message) {
          setUserError(error.message)
        } else {
          setUserError('Failed to query backend. Please try again.')
        }
      } finally {
        streamAbortRef.current = null
        setStreamPhase('idle')
        setIsLoading(false)
      }
    },
    [setUserError]
  )

  const resetChat = useCallback(() => {
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    setStreamPhase('idle')
    setMessages([])
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    resetChat,
    stopStreaming,
    streamPhase,
  }
}
