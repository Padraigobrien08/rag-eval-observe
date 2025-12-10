'use client'

import type { UserChatMessage } from './types'

interface UserMessageProps {
  message: UserChatMessage
}

export default function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="flex items-start gap-3 flex-row-reverse">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
      <div className="flex-1 text-right">
        <div className="inline-block rounded-lg px-4 py-3 max-w-2xl bg-blue-600 text-white">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          <p className="text-xs mt-2 opacity-70">
            {new Intl.DateTimeFormat('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            }).format(message.createdAt)}
          </p>
        </div>
      </div>
    </div>
  )
}
