'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { BarChart3, Loader2, Send, SunMedium, Zap, AlertTriangle } from 'lucide-react'
import { useChat } from '@/features/chat/useChat'
import type { ChatMessage } from '@/features/chat/types'
import { useRagSettings } from '@/features/settings/useRagSettings'
import { clsx } from 'clsx'
import ReactMarkdown from 'react-markdown'

type ConnectionState = 'unknown' | 'ok' | 'error'

export default function ChatPanel() {
  const router = useRouter()
  const { messages, isLoading, error, sendMessage, resetChat } = useChat()
  const { topK, debug } = useRagSettings()
  const [input, setInput] = useState('')
  const [connection, setConnection] = useState<ConnectionState>('unknown')
  const transcriptEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // You can wire a real health endpoint later.
    setConnection('ok')
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    void sendMessage(text, {
      topK,
      debug,
      filters: undefined, // Can be added later if needed
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit(e as any)
    }
    // Enter alone inserts newline (default behavior)
  }

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-grow textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newHeight = Math.min(textareaRef.current.scrollHeight, 160) // max ~5-6 lines
      textareaRef.current.style.height = `${newHeight}px`
    }
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as any)
    }
  }

  const handleExampleClick = async (prompt: string) => {
    if (messages.length === 0) {
      // No messages yet - send immediately with settings
      await sendMessage(prompt, {
        topK,
        debug,
      })
    } else {
      // Messages exist - pre-fill the input
      setInput(prompt)
      // Focus the textarea
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }

  const badgeLabel =
    connection === 'ok' ? 'Connected' : connection === 'error' ? 'Disconnected' : 'Checking…'

  const hasMessages = messages.length > 0

  return (
    <div className="flex-1 flex flex-col h-screen min-h-0 bg-slate-50">
      {/* Header */}
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-2 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">RAG Eval</h1>
          <p className="text-xs text-slate-500">RAG evaluation console</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connection === 'ok' ? 'outline' : 'destructive'} className="text-xs">
            {badgeLabel}
          </Badge>
          <Button variant="outline" size="sm" type="button" onClick={() => router.push('/metrics')}>
            <BarChart3 className="mr-1 h-4 w-4" />
            Metrics
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={() => resetChat()}>
            New chat
          </Button>
        </div>
      </header>

      {/* Chat region: home cards + messages + input */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {/* Scrollable area for messages + (optional) home cards */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full px-6 flex flex-col gap-8 pt-12">
            {/* Home cards section (if present) */}
            {!hasMessages && (
              <>
                {/* Title + subtitle */}
                <div className="text-center">
                  <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                    What can I help with?
                  </h2>
                  <p className="text-sm text-slate-600">
                    Ask questions about your ingested documents.
                  </p>
                </div>

                {/* THREE COLUMNS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Column 1 – Examples */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-slate-700 font-medium mb-1">
                      <SunMedium className="h-4 w-4" />
                      <span>Examples</span>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() =>
                        handleExampleClick('Explain vector similarity search in simple terms')
                      }
                      disabled={isLoading}
                    >
                      Explain vector similarity search in simple terms
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() =>
                        handleExampleClick('Summarize the main topics in my knowledge base')
                      }
                      disabled={isLoading}
                    >
                      Summarize the main topics in my knowledge base
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => handleExampleClick('What documents have been ingested?')}
                      disabled={isLoading}
                    >
                      What documents have been ingested?
                    </Button>
                  </div>

                  {/* Column 2 – Capabilities */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-slate-700 font-medium mb-1">
                      <Zap className="h-4 w-4" />
                      <span>Capabilities</span>
                    </div>

                    <div className="rounded-lg bg-white px-4 py-3 border border-slate-200 text-sm text-slate-700">
                      Query your ingested documents using natural language
                    </div>
                    <div className="rounded-lg bg-white px-4 py-3 border border-slate-200 text-sm text-slate-700">
                      Retrieve relevant context using semantic search
                    </div>
                    <div className="rounded-lg bg-white px-4 py-3 border border-slate-200 text-sm text-slate-700">
                      Generate answers augmented with retrieved knowledge
                    </div>
                    <div className="rounded-lg bg-white px-4 py-3 border border-slate-200 text-sm text-slate-700">
                      View citations and metadata for transparency
                    </div>
                  </div>

                  {/* Column 3 – Limitations */}
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-slate-700 font-medium mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Limitations</span>
                    </div>

                    <div className="rounded-lg bg-white px-4 py-3 border border-slate-200 text-sm text-slate-700">
                      May occasionally generate incorrect information
                    </div>
                    <div className="rounded-lg bg-white px-4 py-3 border border-slate-200 text-sm text-slate-700">
                      Quality depends on ingested document accuracy
                    </div>
                    <div className="rounded-lg bg-white px-4 py-3 border border-slate-200 text-sm text-slate-700">
                      Retrieval accuracy depends on embedding quality
                    </div>
                    <div className="rounded-lg bg-white px-4 py-3 border border-slate-200 text-sm text-slate-700">
                      Costs may vary based on query complexity
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Message list */}
            <div className="flex flex-col gap-4 py-4">
              {messages.map((m, idx) => {
                const isUser = m.role === 'user'
                const meta = m.metadata ?? {}

                return (
                  <div
                    key={m.id ?? idx}
                    className={isUser ? 'flex justify-end' : 'flex justify-start'}
                  >
                    <div className="flex flex-col">
                      <div
                        className={
                          isUser
                            ? 'max-w-[80%] rounded-2xl bg-blue-500 text-white px-4 py-2 shadow-sm'
                            : 'max-w-[80%] rounded-2xl bg-slate-100 text-slate-900 px-4 py-2 shadow-sm'
                        }
                      >
                        {isUser ? (
                          <span className="whitespace-pre-wrap break-words">{m.content}</span>
                        ) : (
                          <div className="prose prose-sm max-w-none">
                            <ReactMarkdown>{m.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                      {!isUser &&
                        (meta.latencyMs != null ||
                          meta.tokensTotal != null ||
                          meta.estimatedCostUsd != null ||
                          (Array.isArray(meta.citations) && meta.citations.length > 0)) && (
                          <div className="mt-1 text-[11px] text-slate-500 flex flex-wrap gap-2">
                            {meta.latencyMs != null && <span>Latency: {meta.latencyMs}ms</span>}
                            {meta.tokensTotal != null && <span>Tokens: {meta.tokensTotal}</span>}
                            {meta.estimatedCostUsd != null && (
                              <span>Cost: ${meta.estimatedCostUsd.toFixed(4)}</span>
                            )}
                            {Array.isArray(meta.citations) && meta.citations.length > 0 && (
                              <>
                                <span className="font-medium">
                                  Citations ({meta.citations.length}):
                                </span>
                                {meta.citations.map((c: any, i: number) => (
                                  <span key={i}>
                                    {c.title ?? c.source ?? 'Source'}
                                    {c.chunk_index != null ? ` · chunk ${c.chunk_index}` : ''}
                                  </span>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                )
              })}
              {isLoading && <div className="text-xs text-slate-500">Thinking…</div>}
              <div ref={transcriptEndRef} />
            </div>

            {/* Input bar */}
            <div className="sticky bottom-0 bg-white pb-6">
              <form onSubmit={handleSubmit} className="flex items-end gap-2">
                <div className="flex-1 flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleTextareaInput}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Message RAG Eval..."
                    className="w-full resize-none border-none bg-transparent outline-none text-sm max-h-32"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
              {error && (
                <p className="text-sm text-red-600 mt-2">
                  {typeof error === 'string' ? error : 'Something went wrong'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
