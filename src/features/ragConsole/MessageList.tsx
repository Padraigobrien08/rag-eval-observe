'use client'

import { forwardRef } from 'react'
import type { ChatMessage } from '@/features/chat/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import UserMessage from './UserMessage'
import AssistantMessage from './AssistantMessage'
import EmptyState from './EmptyState'
import LoadingSkeleton from './LoadingSkeleton'

interface MessageListProps {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  onRetry: () => void
  onExamplePrompt: (prompt: string) => void
}

const MessageList = forwardRef<HTMLDivElement, MessageListProps>(
  ({ messages, isLoading, error: _error, onRetry, onExamplePrompt }, _ref) => {
    return (
      <div className="min-h-0 bg-slate-50 flex flex-col">
        <ScrollArea className="h-full flex-1">
          {messages.length === 0 && !isLoading ? (
            <div className="h-full flex items-center justify-center min-h-[calc(100vh-200px)]">
              <EmptyState onSelectPrompt={onExamplePrompt} />
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map(message => (
                <div key={message.id}>
                  {message.role === 'user' ? (
                    <UserMessage message={message} />
                  ) : (
                    <AssistantMessage message={message} onRetry={onRetry} />
                  )}
                </div>
              ))}
              {isLoading && <LoadingSkeleton />}
            </div>
          )}
        </ScrollArea>
      </div>
    )
  }
)

MessageList.displayName = 'MessageList'

export default MessageList
