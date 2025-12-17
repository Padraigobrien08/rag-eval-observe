'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { BarChart3, SunMedium, Zap, AlertTriangle, Send, Loader2, Menu } from 'lucide-react'
import { useChat } from '@/features/chat/useChat'
import ChatLayout from '@/features/chat/ChatLayout'
import { useRagSettings } from '@/features/settings/useRagSettings'
import { checkHealth } from '@/lib/api/client'

type ConnectionState = 'unknown' | 'ok' | 'error'

interface ChatPanelProps {
  sidebarOpen?: boolean
  setSidebarOpen?: (open: boolean) => void
}

export default function ChatPanel({ sidebarOpen, setSidebarOpen }: ChatPanelProps = {}) {
  const router = useRouter()
  const { messages, isLoading, error, sendMessage, resetChat } = useChat()
  const { topK, debug, ragModel } = useRagSettings()
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
        console.error('[ChatPanel] Health check failed:', error)
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

  useEffect(() => {
    console.log('[ChatPanel] ragModel changed:', ragModel)
  }, [ragModel])

  const handleSend = (content: string) => {
    console.log('[ChatPanel] handleSend called', {
      ragModel,
      topK,
      debug,
    })
    void sendMessage(content, {
      topK,
      debug,
      filters: undefined,
      rag_model: ragModel,
    })
  }

  const handleExampleClick = async (prompt: string) => {
    console.log('[ChatPanel] handleExampleClick called', {
      ragModel,
      topK,
      debug,
    })
    // Always send immediately for examples
    await sendMessage(prompt, {
      topK,
      debug,
      rag_model: ragModel,
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
        {/* Left side - Menu button (mobile) + Logo */}
        <div className="flex items-center gap-3">
          {/* Hamburger menu button - only visible on mobile */}
          {setSidebarOpen && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
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
        <div
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
          style={{
            paddingTop: 'clamp(1rem, 2vw, 2rem)',
            paddingBottom: 'clamp(1rem, 2vw, 2rem)',
          }}
        >
          {messages.length === 0 ? (
            /* Home screen when no messages */
            <div
              className="mx-auto w-full"
              style={{
                maxWidth: '1100px',
                paddingLeft: 'clamp(12px, 3vw, 32px)',
                paddingRight: 'clamp(12px, 3vw, 32px)',
                paddingTop: 'clamp(2rem, 8vw, 4rem)',
                paddingBottom: 'clamp(1rem, 4vw, 2rem)',
              }}
            >
              {/* Title + subtitle */}
              <div className="text-center" style={{ marginBottom: 'clamp(1rem, 3vw, 1.5rem)' }}>
                <h2
                  className="font-semibold text-slate-900"
                  style={{
                    fontSize: 'clamp(20px, 2.2vw, 32px)',
                    lineHeight: '1.2',
                    marginBottom: 'clamp(0.5rem, 1.5vw, 0.75rem)',
                  }}
                >
                  What can I help with?
                </h2>
                <p className="text-sm text-slate-600">
                  Ask questions about your ingested documents.
                </p>
              </div>

              {/* Centered pill buttons */}
              <div
                className="flex flex-col items-center"
                style={{ gap: 'clamp(1.5rem, 3vw, 2.5rem)' }}
              >
                {/* Info text */}
                <p
                  className="text-center text-sm text-slate-600"
                  style={{ marginBottom: 'clamp(1rem, 2vw, 1.5rem)' }}
                >
                  We have added some documents about RAG, so you can see functionality by just
                  clicking one of the example queries
                </p>

                {/* Example Queries Section */}
                <div
                  className="flex flex-col items-center"
                  style={{ gap: 'clamp(1rem, 2.5vw, 1.5rem)' }}
                >
                  <div className="flex items-center gap-2 text-slate-900">
                    <SunMedium className="h-5 w-5" />
                    <span
                      className="font-semibold"
                      style={{
                        fontSize: 'clamp(16px, 1.8vw, 20px)',
                        lineHeight: '1.3',
                      }}
                    >
                      Example Queries
                    </span>
                  </div>
                  <div
                    className="flex flex-wrap justify-center gap-3"
                    style={{ maxWidth: '900px', margin: '0 auto' }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50 whitespace-normal max-w-full"
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
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50 whitespace-normal max-w-full"
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
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50 whitespace-normal max-w-full"
                      onClick={() => handleExampleClick('What documents have been ingested?')}
                      disabled={isLoading}
                    >
                      What documents have been ingested?
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50 whitespace-normal max-w-full"
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
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50 whitespace-normal max-w-full"
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
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50 whitespace-normal max-w-full"
                      onClick={() =>
                        handleExampleClick('Compare keyword search vs semantic search')
                      }
                      disabled={isLoading}
                    >
                      Compare keyword search vs semantic search
                    </Button>
                  </div>
                </div>

                {/* Capabilities Section */}
                <div
                  className="flex flex-col items-center"
                  style={{ gap: 'clamp(1rem, 2.5vw, 1.5rem)' }}
                >
                  <div className="flex items-center gap-2 text-slate-900">
                    <Zap className="h-5 w-5" />
                    <span
                      className="font-semibold"
                      style={{
                        fontSize: 'clamp(16px, 1.8vw, 20px)',
                        lineHeight: '1.3',
                      }}
                    >
                      Capabilities
                    </span>
                  </div>
                  <div
                    className="flex flex-wrap justify-center gap-3"
                    style={{ maxWidth: '900px', margin: '0 auto' }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50 whitespace-normal max-w-full"
                      disabled
                    >
                      Query your ingested documents using natural language
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50 whitespace-normal max-w-full"
                      disabled
                    >
                      Retrieve relevant context using semantic search
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50 whitespace-normal max-w-full"
                      disabled
                    >
                      Generate answers augmented with retrieved knowledge
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50 whitespace-normal max-w-full"
                      disabled
                    >
                      View citations and metadata for transparency
                    </Button>
                  </div>
                </div>

                {/* Limitations Section */}
                <div
                  className="flex flex-col items-center"
                  style={{ gap: 'clamp(1rem, 2.5vw, 1.5rem)' }}
                >
                  <div className="flex items-center gap-2 text-slate-900">
                    <AlertTriangle className="h-5 w-5" />
                    <span
                      className="font-semibold"
                      style={{
                        fontSize: 'clamp(16px, 1.8vw, 20px)',
                        lineHeight: '1.3',
                      }}
                    >
                      Limitations
                    </span>
                  </div>
                  <div
                    className="flex flex-wrap justify-center gap-3"
                    style={{ maxWidth: '900px', margin: '0 auto' }}
                  >
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50 whitespace-normal max-w-full"
                      disabled
                    >
                      May occasionally generate incorrect information
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50 whitespace-normal max-w-full"
                      disabled
                    >
                      Quality depends on ingested document accuracy
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50 whitespace-normal max-w-full"
                      disabled
                    >
                      Retrieval accuracy depends on embedding quality
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50 whitespace-normal max-w-full"
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
            />
          )}
          {error && messages.length === 0 && (
            <div className="mx-auto max-w-3xl px-4 pb-4">
              <p className="text-sm text-red-600">
                {typeof error === 'string' ? error : 'Something went wrong'}
              </p>
            </div>
          )}
        </div>

        {/* Input bar - always visible at bottom */}
        <div
          className="shrink-0 border-t border-slate-200 bg-white/80 backdrop-blur"
          style={{ flexShrink: 0 }}
        >
          <div
            className="mx-auto max-w-3xl"
            style={{
              paddingLeft: '4rem',
              paddingRight: '4rem',
              paddingTop: '1.5rem',
              paddingBottom: '1.5rem',
            }}
          >
            <form onSubmit={handleSubmit} className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message RAG Eval..."
                rows={1}
                className="flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm focus-visible:ring-2 focus-visible:ring-slate-400/60 focus-visible:border-transparent"
              />
              <Button
                type="submit"
                variant="default"
                size="icon"
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
