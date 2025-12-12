'use client'

import type { ChatMessage } from '@/features/chat/types'

export default function UserMessage({ message }: { message: ChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="inline-block max-w-xl rounded-2xl bg-slate-200 px-4 py-3 text-sm text-slate-900 whitespace-pre-wrap break-words">
        {message.content}
      </div>
    </div>
  )
}
