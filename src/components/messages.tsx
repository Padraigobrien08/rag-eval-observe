'use client'

import type { UseChatHelpers } from '@ai-sdk/react'
import equal from 'fast-deep-equal'
import { ArrowDownIcon } from 'lucide-react'
import { memo } from 'react'
import { useMessages } from '@/hooks/use-messages'
import type { ChatMessage } from '@/lib/types'
import { Greeting } from './greeting'
import { PreviewMessage, ThinkingMessage } from './message'

type MessagesProps = {
  chatId: string
  status: UseChatHelpers<ChatMessage>['status']
  messages: ChatMessage[]
  setMessages: UseChatHelpers<ChatMessage>['setMessages']
  regenerate: UseChatHelpers<ChatMessage>['regenerate']
  isReadonly: boolean
}

function PureMessages({
  chatId,
  status,
  messages,
  setMessages,
  regenerate,
  isReadonly,
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    isAtBottom,
    scrollToBottom,
    hasSentMessage,
  } = useMessages({ status })

  return (
    <div className="relative flex-1 touch-pan-y overflow-y-auto" ref={messagesContainerRef}>
      <div className="mx-auto flex min-w-0 max-w-4xl flex-col gap-4 px-2 py-4 md:gap-6 md:px-4">
        {messages.length === 0 && <Greeting />}

        {messages.map((message, index) => (
          <PreviewMessage
            chatId={chatId}
            isLoading={status === 'streaming' && messages.length - 1 === index}
            isReadonly={isReadonly}
            key={message.id}
            message={message}
            regenerate={regenerate}
            requiresScrollPadding={hasSentMessage && index === messages.length - 1}
            setMessages={setMessages}
          />
        ))}

        {status === 'submitted' && <ThinkingMessage />}

        <div className="min-h-[24px] min-w-[24px] shrink-0" ref={messagesEndRef} />
      </div>

      {!isAtBottom && (
        <button
          aria-label="Scroll to bottom"
          className="-translate-x-1/2 absolute bottom-40 left-1/2 z-10 rounded-full border bg-background p-2 shadow-lg transition-colors hover:bg-muted"
          onClick={() => scrollToBottom('smooth')}
          type="button"
        >
          <ArrowDownIcon className="size-4" />
        </button>
      )}
    </div>
  )
}

export const Messages = memo(PureMessages, (prev, next) => {
  if (prev.status !== next.status) return false
  if (prev.messages.length !== next.messages.length) return false
  if (!equal(prev.messages, next.messages)) return false
  return true
})
