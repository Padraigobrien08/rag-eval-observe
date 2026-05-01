'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'
import MessageBubble from './MessageBubble'
import RetrievalStatus from './RetrievalStatus'
import type { ChatMessage } from './types'

interface ChatLayoutProps {
  messages: ChatMessage[]
  isLoading: boolean
  onSend: (content: string) => void
  showInput?: boolean
  ragModel?: string
  /** Show compact status while the model streams after retrieval */
  answerStreaming?: boolean
}

export default function ChatLayout({
  messages,
  isLoading,
  onSend,
  showInput = true,
  ragModel = 'vector-similarity',
  answerStreaming = false,
}: ChatLayoutProps) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    onSend(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const formEvent = e as unknown as React.FormEvent<HTMLFormElement>
      handleSubmit(formEvent)
    }
  }

  return (
    <div className="flex flex-col h-full" style={{ height: '100%' }} data-testid="chat-layout">
      {/* Messages area - scrollable, fills available space */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          minHeight: 0,
          maxHeight: '100%',
          overflowY: 'auto',
        }}
      >
        <div
          className="mx-auto w-full"
          style={{
            maxWidth: '1100px',
            paddingLeft: 'clamp(12px, 3vw, 32px)',
            paddingRight: 'clamp(12px, 3vw, 32px)',
            paddingTop: 'clamp(1rem, 2vw, 1.5rem)',
            paddingBottom: 'clamp(1rem, 2vw, 1.5rem)',
          }}
        >
          <div className="flex flex-col" style={{ gap: 'clamp(1rem, 3vw, 2rem)' }}>
            {messages.map((message, index) => {
              const previousMessage = index > 0 ? messages[index - 1] : null
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  previousMessage={previousMessage}
                />
              )
            })}
            {isLoading && (
              <RetrievalStatus
                ragModel={ragModel}
                isLoading={isLoading}
                answerStreaming={answerStreaming}
              />
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input bar - fixed at bottom with padding */}
      {showInput && (
        <div
          className="shrink-0 border-t border-slate-200 bg-white/80 backdrop-blur"
          style={{ flexShrink: 0 }}
        >
          <div
            className="mx-auto w-full"
            style={{
              maxWidth: '1100px',
              paddingLeft: 'clamp(12px, 3vw, 32px)',
              paddingRight: 'clamp(12px, 3vw, 32px)',
              paddingTop: 'clamp(0.75rem, 2vw, 1rem)',
              paddingBottom: 'clamp(0.75rem, 2vw, 1rem)',
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
      )}
    </div>
  )
}
