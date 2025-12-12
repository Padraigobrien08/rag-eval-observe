'use client'

import type { ChatMessage } from './types'

export default function UserBubble({ message }: { message: ChatMessage }) {
  const timestamp = new Date((message as any).createdAt ?? message.id).toLocaleTimeString()

  return (
    <div className="flex justify-end">
      <div>
        <div className="max-w-xl rounded-2xl bg-blue-600 text-white px-4 py-3 shadow-sm text-sm">
          {message.content}
        </div>
        <div className="mt-1 text-[11px] text-slate-400">{timestamp}</div>
      </div>
    </div>
  )
}
