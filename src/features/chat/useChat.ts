'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { v4 as uuid } from 'uuid'
import type { ChatMessage, Citation } from './types'
import { toast } from 'sonner'
import {
  ragQuery,
  ragQueryStream,
  createChatThread,
  listChatMessages,
  appendChatMessage,
  type PersistedChatMessage,
} from '@/lib/api/client'
import { estimateChatMessageCostUsd } from '@/lib/openai-pricing'

function mapCitations(raw: unknown): Citation[] {
  return ((raw as unknown[]) || []).map((cit: unknown) => {
    const citation = cit as Record<string, unknown>
    return {
      chunk_id: (citation.chunk_id || citation.chunkId || '') as string,
      document_id: (citation.document_id || citation.documentId || '') as string,
      title: (citation.title ?? null) as string | null,
      source: (citation.source || '') as string,
      chunk_index: (citation.chunk_index || citation.chunkIndex || 0) as number,
    }
  })
}

function citationsForApi(citations: Citation[]): Record<string, unknown>[] {
  return citations.map(c => ({
    chunk_id: c.chunk_id,
    document_id: c.document_id,
    title: c.title,
    source: c.source,
    chunk_index: c.chunk_index,
  }))
}

function apiMsgToChat(m: PersistedChatMessage): ChatMessage {
  const cites = mapCitations(m.citations)
  return {
    id: m.id,
    role: m.role as ChatMessage['role'],
    content: m.content,
    latencyMs: m.latency_ms ?? undefined,
    costUsd: m.cost_usd ?? undefined,
    ragModel: m.rag_model ?? undefined,
    citations: cites.length > 0 ? cites : undefined,
    metadata: { ...(m.metadata || {}) },
    requestId: m.request_id ?? undefined,
    queryLogId: m.query_log_id ?? undefined,
    evalRunId: m.eval_run_id ?? undefined,
    evalCaseId: m.eval_case_id ?? undefined,
  }
}

async function reloadThreadMessages(threadId: string): Promise<ChatMessage[]> {
  const rows = await listChatMessages(threadId)
  return rows.map(apiMsgToChat)
}

export function useChat(
  activeThreadId: string | null,
  setActiveThreadId: (id: string | null) => void,
  onThreadsChanged?: () => void
) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setUserError = useCallback((message: string) => {
    setError(message)
    toast.error(message)
  }, [])

  const [streamPhase, setStreamPhase] = useState<'idle' | 'retrieval' | 'generating'>('idle')
  const streamDeltaStartedRef = useRef(false)
  const streamAbortRef = useRef<AbortController | null>(null)
  /** Accumulates assistant tokens when streaming; used if done payload omits full answer. */
  const streamAssistantBufferRef = useRef('')

  const stopStreaming = useCallback(() => {
    streamAbortRef.current?.abort()
  }, [])

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const next = await reloadThreadMessages(activeThreadId)
        if (!cancelled) setMessages(next)
      } catch (err) {
        if (!cancelled) {
          console.error(err)
          toast.error('Could not load chat history')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeThreadId])

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

      setIsLoading(true)
      try {
        let tid = activeThreadId
        if (!tid) {
          const thread = await createChatThread({
            title: text.trim().slice(0, 72) || null,
          })
          tid = thread.id
          setActiveThreadId(tid)
        }

        await appendChatMessage(tid, { role: 'user', content: text })
        onThreadsChanged?.()
        const synced = await reloadThreadMessages(tid)
        setMessages(synced)

        const requestBody = {
          query: text,
          topK: options?.topK,
          debug: options?.debug,
          filters: options?.filters,
          rag_model: options?.rag_model,
        }

        const useStream = options?.stream !== false
        const currentThreadId = tid

        if (useStream) {
          const assistantId = uuid()
          const ac = new AbortController()
          streamAbortRef.current = ac
          streamDeltaStartedRef.current = false
          streamAssistantBufferRef.current = ''
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
                streamAssistantBufferRef.current += fragment
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
                const streamTu = data.token_usage as Record<string, number> | undefined
                if (streamTu && typeof streamTu === 'object') {
                  metadata.token_usage = streamTu
                }
                const answer = typeof data.answer === 'string' ? data.answer.trim() : ''
                const streamed = streamAssistantBufferRef.current.trim()
                const finalContent = answer || streamed || 'No answer returned.'

                const latencyMs = data.latency_ms as number | undefined
                const tokenUsage = data.token_usage as Record<string, number> | undefined
                const ragModel = data.rag_model as string | undefined
                const costUsd = estimateChatMessageCostUsd(tokenUsage)

                setMessages(prev => {
                  const i = prev.findIndex(m => m.id === assistantId)
                  if (i === -1) return prev
                  const next = [...prev]
                  const cur = next[i]
                  if (cur.role !== 'assistant') return prev
                  next[i] = {
                    ...cur,
                    content: finalContent,
                    latencyMs,
                    costUsd,
                    ragModel,
                    citations: citations.length > 0 ? citations : undefined,
                    metadata: { ...cur.metadata, ...metadata },
                    requestId:
                      typeof data.request_id === 'string' ? data.request_id : cur.requestId,
                    queryLogId:
                      typeof data.query_log_id === 'string' ? data.query_log_id : cur.queryLogId,
                  }
                  return next
                })

                void (async () => {
                  try {
                    await appendChatMessage(currentThreadId, {
                      role: 'assistant',
                      content: finalContent,
                      citations: citations.length > 0 ? citationsForApi(citations) : undefined,
                      metadata,
                      latency_ms: latencyMs,
                      cost_usd: costUsd,
                      rag_model: ragModel,
                      request_id: typeof data.request_id === 'string' ? data.request_id : undefined,
                      query_log_id:
                        typeof data.query_log_id === 'string' ? data.query_log_id : undefined,
                    })
                    onThreadsChanged?.()
                    const rows = await reloadThreadMessages(currentThreadId)
                    setMessages(rows)
                  } catch (e) {
                    console.error(e)
                    toast.error('Assistant reply could not be saved to history.')
                  }
                })()
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
          const restTu = (resp.token_usage ?? resp.tokenUsage) as Record<string, number> | undefined
          if (restTu && typeof restTu === 'object') {
            metadata.token_usage = restTu
          }

          const assistantContent = resp.answer ?? resp.output ?? 'No answer field returned.'
          const latencyMs = resp.latency_ms ?? resp.latencyMs
          const ragModel = resp.rag_model ?? resp.ragModel
          const costUsd = estimateChatMessageCostUsd(resp.token_usage ?? resp.tokenUsage)
          const obs = resp as { request_id?: string; query_log_id?: string }

          await appendChatMessage(currentThreadId, {
            role: 'assistant',
            content: assistantContent,
            citations: citations.length > 0 ? citationsForApi(citations) : undefined,
            metadata,
            latency_ms: latencyMs,
            cost_usd: costUsd,
            rag_model: ragModel,
            request_id: typeof obs.request_id === 'string' ? obs.request_id : undefined,
            query_log_id: typeof obs.query_log_id === 'string' ? obs.query_log_id : undefined,
          })
          onThreadsChanged?.()
          const rows = await reloadThreadMessages(currentThreadId)
          setMessages(rows)
        }
      } catch (err: unknown) {
        const e = err as Error & { status?: number }
        if (e.status === 429) {
          setUserError('Rate limit exceeded. Please wait a moment and try again.')
        } else if (e.message) {
          setUserError(e.message)
        } else {
          setUserError('Failed to query backend. Please try again.')
        }
      } finally {
        streamAbortRef.current = null
        setStreamPhase('idle')
        setIsLoading(false)
      }
    },
    [activeThreadId, setActiveThreadId, onThreadsChanged, setUserError]
  )

  const resetChat = useCallback(() => {
    streamAbortRef.current?.abort()
    streamAbortRef.current = null
    setStreamPhase('idle')
    setMessages([])
    setError(null)
    setActiveThreadId(null)
  }, [setActiveThreadId])

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
