'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { BarChart3, SunMedium, Zap, AlertTriangle, Send, Loader2 } from 'lucide-react'
import { useChat } from '@/features/chat/useChat'
import ChatLayout from '@/features/chat/ChatLayout'
import { useRagSettings } from '@/features/settings/useRagSettings'

type ConnectionState = 'unknown' | 'ok' | 'error'

export default function ChatPanel() {
  const router = useRouter()
  const { messages, isLoading, error, sendMessage, resetChat } = useChat()
  const { topK, debug, ragModel } = useRagSettings()
  const [connection, setConnection] = useState<ConnectionState>('unknown')
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // You can wire a real health endpoint later.
    setConnection('ok')
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
      handleSubmit(e as any)
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
        {/* Left side - Logo */}
        <Image
          src="/RAGEvalLogo.png"
          alt="RAG Eval Logo"
          width={180}
          height={100}
          className="flex-shrink-0"
          style={{ width: 'auto', height: 'auto' }}
          priority
        />

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
          className="flex-1 min-h-0"
          style={{
            paddingTop: '2rem',
            paddingBottom: '2rem',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {messages.length === 0 ? (
            /* Home screen when no messages */
            <div
              className="mx-auto max-w-3xl"
              style={{
                paddingLeft: '2rem',
                paddingRight: '2rem',
                paddingTop: '8rem',
                paddingBottom: '4rem',
              }}
            >
              {/* Title + subtitle */}
              <div className="text-center" style={{ marginBottom: '1rem' }}>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                  What can I help with?
                </h2>
                <p className="text-sm text-slate-600">
                  Ask questions about your ingested documents.
                </p>
              </div>

              {/* Centered pill buttons */}
              <div className="flex flex-col items-center" style={{ gap: '2rem' }}>
                {/* Info text */}
                <p className="text-sm text-slate-600 text-center" style={{ marginBottom: '1rem' }}>
                  We have added some documents about RAG, so you can see functionality by just
                  clicking one of the example queries
                </p>

                {/* Example Queries Section */}
                <div className="flex flex-col items-center gap-6">
                  <div className="flex items-center gap-2 text-slate-900">
                    <SunMedium className="h-5 w-5" />
                    <span className="text-lg font-semibold">Example Queries</span>
                  </div>
                  <div className="flex flex-col items-center gap-3">
                    {/* First row */}
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50"
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
                        className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50"
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
                        className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50"
                        onClick={() => handleExampleClick('What documents have been ingested?')}
                        disabled={isLoading}
                      >
                        What documents have been ingested?
                      </Button>
                    </div>
                    {/* Second row */}
                    <div
                      className="flex flex-wrap justify-center gap-2"
                      style={{ marginTop: '0.5rem' }}
                    >
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50"
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
                        className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50"
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
                        className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50"
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
                <div className="flex flex-col items-center gap-6">
                  <div className="flex items-center gap-2 text-slate-900">
                    <Zap className="h-5 w-5" />
                    <span className="text-lg font-semibold">Capabilities</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50"
                      disabled
                    >
                      Query your ingested documents using natural language
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50"
                      disabled
                    >
                      Retrieve relevant context using semantic search
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50"
                      disabled
                    >
                      Generate answers augmented with retrieved knowledge
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50"
                      disabled
                    >
                      View citations and metadata for transparency
                    </Button>
                  </div>
                </div>

                {/* Limitations Section */}
                <div className="flex flex-col items-center gap-6">
                  <div className="flex items-center gap-2 text-slate-900">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="text-lg font-semibold">Limitations</span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50"
                      disabled
                    >
                      May occasionally generate incorrect information
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50"
                      disabled
                    >
                      Quality depends on ingested document accuracy
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50"
                      disabled
                    >
                      Retrieval accuracy depends on embedding quality
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full px-4 py-2 h-auto text-sm font-normal hover:bg-slate-50"
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
