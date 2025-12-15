'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'
import MessageBubble from './MessageBubble'
import type { ChatMessage } from './types'

interface ChatLayoutProps {
  messages: ChatMessage[]
  isLoading: boolean
  onSend: (content: string) => void
  showInput?: boolean
}

export default function ChatLayout({ messages, isLoading, onSend, showInput = true }: ChatLayoutProps) {
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
      handleSubmit(e as any)
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
          overflowY: 'auto'
        }}
      >
        <div className="mx-auto max-w-3xl w-full px-4" style={{ paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
                  Thinking…
                </div>
              </div>
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
          <div className="mx-auto max-w-3xl" style={{ paddingLeft: '1rem', paddingRight: '1rem', paddingTop: '1rem', paddingBottom: '1rem' }}>
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
