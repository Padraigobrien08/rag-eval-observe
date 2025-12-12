'use client'

import type { UserChatMessage } from '@/features/chat/types'

interface UserMessageProps {
  message: UserChatMessage
}

export default function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="inline-block max-w-xl rounded-2xl bg-slate-200 px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap break-words">
        {message.content}
      </div>
    </div>
  )
}
