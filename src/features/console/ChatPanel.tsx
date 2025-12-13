'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart3, SunMedium, Zap, AlertTriangle } from 'lucide-react'
import { useChat } from '@/features/chat/useChat'
import type { ChatMessage as OldChatMessage } from '@/features/chat/types'
import type { ChatMessage } from '@/features/chat/ChatLayout'
import ChatLayout from '@/features/chat/ChatLayout'
import { useRagSettings } from '@/features/settings/useRagSettings'

type ConnectionState = 'unknown' | 'ok' | 'error'

export default function ChatPanel() {
  const router = useRouter()
  const { messages: oldMessages, isLoading, error, sendMessage, resetChat } = useChat()
  const { topK, debug } = useRagSettings()
  const [connection, setConnection] = useState<ConnectionState>('unknown')

  useEffect(() => {
    // You can wire a real health endpoint later.
    setConnection('ok')
  }, [])

  // Map old messages to new ChatMessage format
  const messages: ChatMessage[] = oldMessages.map((msg: OldChatMessage) => {
    const meta = msg.metadata ?? {}
    const citations = Array.isArray(meta.citations)
      ? meta.citations.map((c: any) => ({
          label: c.title ?? c.source ?? 'Source',
          href: undefined, // Can be added later if we have document URLs
        }))
      : undefined

    return {
      id: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      latencyMs: meta.latencyMs ?? meta.latency_ms,
      costUsd: meta.estimatedCostUsd,
      citations,
    }
  })

  const handleSend = (content: string) => {
    void sendMessage(content, {
      topK,
      debug,
      filters: undefined,
    })
  }

  const handleExampleClick = async (prompt: string) => {
    // Always send immediately for examples
    await sendMessage(prompt, {
      topK,
      debug,
    })
  }

  const badgeLabel =
    connection === 'ok' ? 'Connected' : connection === 'error' ? 'Disconnected' : 'Checking…'

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
        {messages.length === 0 ? (
          /* Home screen when no messages */
          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-6 pt-12">
              {/* Title + subtitle */}
              <div className="text-center mb-8">
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
            </div>
          </div>
        ) : (
          /* Chat layout when messages exist */
          <ChatLayout
            key="chat-layout"
            messages={messages}
            isLoading={isLoading}
            onSend={handleSend}
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
    </div>
  )
}
