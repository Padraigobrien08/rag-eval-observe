'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group'
import {
  BarChart3,
  SunMedium,
  Zap,
  AlertTriangle,
  Send,
  Loader2,
  Square,
  PanelLeft,
} from 'lucide-react'
import { useChat } from '@/features/chat/useChat'
import ChatLayout from '@/features/chat/ChatLayout'
import { useRagSettings } from '@/features/settings/useRagSettings'
import { checkHealth } from '@/lib/api/client'

type ConnectionState = 'unknown' | 'ok' | 'error'

interface ChatPanelProps {
  setSidebarOpen?: (open: boolean) => void
  activeThreadId: string | null
  setActiveThreadId: (id: string | null) => void
  onThreadsChanged?: () => void
}

export default function ChatPanel({
  setSidebarOpen,
  activeThreadId,
  setActiveThreadId,
  onThreadsChanged,
}: ChatPanelProps) {
  const router = useRouter()
  const { messages, isLoading, error, sendMessage, resetChat, stopStreaming, streamPhase } =
    useChat(activeThreadId, setActiveThreadId, onThreadsChanged)
  const { topK, debug, ragModel, streamResponses } = useRagSettings()
  const [connection, setConnection] = useState<ConnectionState>('unknown')
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Check health on mount
    const checkConnection = async () => {
      try {
        const health = await checkHealth()
        setConnection(health.ok && health.db ? 'ok' : 'error')
      } catch (error) {
        setConnection('error')
      }
    }

    void checkConnection()

    // Poll health every 30 seconds
    const interval = setInterval(() => {
      void checkConnection()
    }, 30000)

    return () => clearInterval(interval)
  }, [])

  const handleSend = (content: string) => {
    void sendMessage(content, {
      topK,
      debug,
      filters: undefined,
      rag_model: ragModel,
      stream: streamResponses,
    })
  }

  const handleExampleClick = async (prompt: string) => {
    // Always send immediately for examples
    await sendMessage(prompt, {
      topK,
      debug,
      rag_model: ragModel,
      stream: streamResponses,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    handleSend(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const formEvent = e as unknown as React.FormEvent<HTMLFormElement>
      handleSubmit(formEvent)
    }
  }

  const badgeLabel =
    connection === 'ok' ? 'Connected' : connection === 'error' ? 'Disconnected' : 'Checking…'

  return (
    <div
      className="flex flex-col bg-slate-50 overflow-hidden"
      style={{ height: '100%', flex: '1 1 0%' }}
    >
      {/* Header */}
      <header
        className="shrink-0 border-b border-slate-200 bg-white px-4 py-2 flex items-center justify-between"
        style={{ flexShrink: 0 }}
      >
        {/* Left side — mobile drawer + logo */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 md:hidden"
            aria-label="Open documents and chats"
            onClick={() => setSidebarOpen?.(true)}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <Image
            src="/RAGEvalLogo.png"
            alt="RAG Eval Logo"
            width={180}
            height={100}
            className="flex-shrink-0"
            style={{ width: 'auto', height: 'auto' }}
            priority
          />
        </div>

        {/* Right side - Metrics, New chat, and Connected badge */}
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" type="button" onClick={() => router.push('/metrics')}>
            <BarChart3 className="mr-1 h-4 w-4" />
            Metrics
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={() => resetChat()}>
            New chat
          </Button>
          <Badge
            className="text-xs"
            variant="outline"
            style={{
              backgroundColor: connection === 'ok' ? '#dcfce7' : '#fee2e2',
              color: connection === 'ok' ? '#15803d' : '#991b1b',
              borderColor: connection === 'ok' ? '#bbf7d0' : '#fecaca',
            }}
          >
            {badgeLabel}
          </Badge>
        </div>
      </header>

      {/* Chat region: home cards + messages + input */}
      <div
        className="flex flex-col bg-slate-50 overflow-hidden"
        style={{ flex: '1 1 0%', minHeight: 0, height: '100%' }}
      >
        {/* Content area - scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-[clamp(0.75rem,1.8vw,1.5rem)]">
          {messages.length === 0 ? (
            /* Home screen when no messages */
            <div className="mx-auto w-full max-w-4xl px-[clamp(12px,3vw,28px)] pb-[clamp(0.5rem,1.5vw,0.875rem)] pt-[clamp(0.75rem,2vw,1.25rem)]">
              {/* Title + subtitle */}
              <div className="mb-[clamp(0.75rem,2vw,1.125rem)] text-center">
                <h2 className="mb-[clamp(0.375rem,1.2vw,0.625rem)] text-balance font-semibold leading-tight text-slate-900 text-[clamp(17px,1.85vw,22px)]">
                  What can I help with?
                </h2>
                <p className="text-xs leading-snug text-slate-600">
                  Ask questions about your ingested documents.
                </p>
              </div>

              {/* Centered pill buttons */}
              <div className="flex flex-col items-center gap-[clamp(0.75rem,1.6vw,1.125rem)]">
                {/* Info text */}
                <p className="mb-[clamp(0.5rem,1.2vw,0.75rem)] max-w-prose text-center text-xs leading-relaxed text-slate-600">
                  We have added some documents about RAG, so you can see functionality by just
                  clicking one of the example queries
                </p>

                {/* Example Queries Section */}
                <div className="flex w-full max-w-3xl flex-col items-center gap-[clamp(0.625rem,1.4vw,0.875rem)]">
                  <div className="flex items-center gap-2 text-slate-900">
                    <SunMedium className="h-4 w-4" />
                    <span
                      className="font-semibold"
                      style={{
                        fontSize: 'clamp(14px, 1.5vw, 18px)',
                        lineHeight: '1.3',
                      }}
                    >
                      Example Queries
                    </span>
                  </div>
                  <div className="flex w-full flex-col gap-[clamp(0.625rem,1.4vw,0.875rem)]">
                    {/* Top row - 3 pills */}
                    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto min-h-[44px] min-w-0 max-w-full flex-1 basis-[min(100%,17rem)] rounded-full px-4 py-2 text-xs font-normal whitespace-normal hover:bg-slate-50 sm:max-w-[calc(33.333%-0.5rem)]"
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
                        className="h-auto min-h-[44px] min-w-0 max-w-full flex-1 basis-[min(100%,17rem)] rounded-full px-4 py-2 text-xs font-normal whitespace-normal hover:bg-slate-50 sm:max-w-[calc(33.333%-0.5rem)]"
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
                        className="h-auto min-h-[44px] min-w-0 max-w-full flex-1 basis-[min(100%,17rem)] rounded-full px-4 py-2 text-xs font-normal whitespace-normal hover:bg-slate-50 sm:max-w-[calc(33.333%-0.5rem)]"
                        onClick={() => handleExampleClick('What documents have been ingested?')}
                        disabled={isLoading}
                      >
                        What documents have been ingested?
                      </Button>
                    </div>
                    {/* Bottom row - 3 pills */}
                    <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto min-h-[44px] min-w-0 max-w-full flex-1 basis-[min(100%,17rem)] rounded-full px-4 py-2 text-xs font-normal whitespace-normal hover:bg-slate-50 sm:max-w-[calc(33.333%-0.5rem)]"
                        onClick={() =>
                          handleExampleClick('How does RAG improve language model responses?')
                        }
                        disabled={isLoading}
                      >
                        How does RAG improve language model responses?
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto min-h-[44px] min-w-0 max-w-full flex-1 basis-[min(100%,17rem)] rounded-full px-4 py-2 text-xs font-normal whitespace-normal hover:bg-slate-50 sm:max-w-[calc(33.333%-0.5rem)]"
                        onClick={() =>
                          handleExampleClick('What are the key components of a RAG system?')
                        }
                        disabled={isLoading}
                      >
                        What are the key components of a RAG system?
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-auto min-h-[44px] min-w-0 max-w-full flex-1 basis-[min(100%,17rem)] rounded-full px-4 py-2 text-xs font-normal whitespace-normal hover:bg-slate-50 sm:max-w-[calc(33.333%-0.5rem)]"
                        onClick={() =>
                          handleExampleClick('Compare keyword search vs semantic search')
                        }
                        disabled={isLoading}
                      >
                        Compare keyword search vs semantic search
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Capabilities Section */}
                <div className="flex w-full max-w-3xl flex-col items-center gap-[clamp(0.625rem,1.4vw,0.875rem)]">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Zap className="h-4 w-4" />
                    <span
                      className="font-semibold"
                      style={{
                        fontSize: 'clamp(14px, 1.5vw, 18px)',
                        lineHeight: '1.3',
                      }}
                    >
                      Capabilities
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto max-w-md rounded-full px-4 py-2 text-xs font-normal whitespace-normal hover:bg-slate-50"
                      disabled
                    >
                      Query your ingested documents using natural language
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto max-w-md rounded-full px-4 py-2 text-xs font-normal whitespace-normal hover:bg-slate-50"
                      disabled
                    >
                      Retrieve relevant context using semantic search
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto max-w-md rounded-full px-4 py-2 text-xs font-normal whitespace-normal hover:bg-slate-50"
                      disabled
                    >
                      Generate answers augmented with retrieved knowledge
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto max-w-md rounded-full px-4 py-2 text-xs font-normal whitespace-normal hover:bg-slate-50"
                      disabled
                    >
                      View citations and metadata for transparency
                    </Button>
                  </div>
                </div>

                {/* Limitations Section */}
                <div className="flex w-full max-w-3xl flex-col items-center gap-[clamp(0.625rem,1.4vw,0.875rem)]">
                  <div className="flex items-center gap-2 text-slate-900">
                    <AlertTriangle className="h-4 w-4" />
                    <span
                      className="font-semibold"
                      style={{
                        fontSize: 'clamp(14px, 1.5vw, 18px)',
                        lineHeight: '1.3',
                      }}
                    >
                      Limitations
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto max-w-md rounded-full px-4 py-2 text-xs font-normal whitespace-normal hover:bg-slate-50"
                      disabled
                    >
                      May occasionally generate incorrect information
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto max-w-md rounded-full px-4 py-2 text-xs font-normal whitespace-normal hover:bg-slate-50"
                      disabled
                    >
                      Quality depends on ingested document accuracy
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto max-w-md rounded-full px-4 py-2 text-xs font-normal whitespace-normal hover:bg-slate-50"
                      disabled
                    >
                      Retrieval accuracy depends on embedding quality
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto max-w-md rounded-full px-4 py-2 text-xs font-normal whitespace-normal hover:bg-slate-50"
                      disabled
                    >
                      Costs may vary based on query complexity
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Messages when they exist */
            <ChatLayout
              messages={messages}
              isLoading={isLoading}
              onSend={handleSend}
              showInput={false}
              ragModel={ragModel}
              answerStreaming={streamPhase === 'generating'}
            />
          )}
        </div>

        {/* Input bar - always visible at bottom */}
        <div
          className="shrink-0 border-t border-slate-200/70 bg-slate-50"
          style={{ flexShrink: 0 }}
        >
          <div className="mx-auto w-full max-w-4xl px-[clamp(12px,3vw,28px)] py-[clamp(0.625rem,1.8vw,0.875rem)]">
            <form onSubmit={handleSubmit} className="w-full min-w-0">
              <InputGroup className="h-auto min-h-0 items-end gap-2 rounded-none border-0 bg-transparent shadow-none ring-0 [&:has([data-slot=input-group-control]:focus-visible)]:ring-0">
                <InputGroupTextarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message RAG Eval..."
                  rows={1}
                  className="max-h-40 min-h-[44px] flex-1 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-300/50"
                  disabled={isLoading}
                />
                <InputGroupAddon
                  align="inline-end"
                  className="items-end gap-1.5 border-0 bg-transparent py-1 pl-0 pr-0"
                >
                  {isLoading && streamResponses ? (
                    <InputGroupButton
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="shrink-0 rounded-full border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                      title="Stop generation"
                      onClick={() => stopStreaming()}
                    >
                      <Square className="h-4 w-4 fill-current" />
                    </InputGroupButton>
                  ) : null}
                  <InputGroupButton
                    type="submit"
                    variant="outline"
                    size="icon-sm"
                    className="shrink-0 rounded-full border-slate-200 bg-white text-slate-900 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40"
                    disabled={isLoading || !input.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-slate-900" />
                    ) : (
                      <Send className="h-5 w-5 text-slate-900" />
                    )}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </form>
            {error && (
              <p className="text-sm text-destructive mt-2 px-0.5" role="status">
                {typeof error === 'string' ? error : 'Something went wrong'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
