'use client'

import type { ChatMessage } from '@/features/chat/types'
import UserMessage from './UserMessage'
import AssistantMessage from './AssistantMessage'

export default function MessageList({
  messages,
  isLoading,
}: {
  messages: ChatMessage[]
  isLoading: boolean
}) {
  return (
    <div className="space-y-6">
      {messages.map(msg =>
        msg.role === 'user' ? (
          <UserMessage key={msg.id} message={msg} />
        ) : (
          <AssistantMessage key={msg.id} message={msg} />
        )
      )}
      {isLoading && <div className="text-xs text-slate-500">Thinking…</div>}
    </div>
  )
}
