'use client'

import ReactMarkdown from 'react-markdown'
import type { ChatMessage } from './ChatLayout'

interface MessageBubbleProps {
  message: ChatMessage
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <p className="text-xs text-slate-400">{message.content}</p>
      </div>
    )
  }

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="flex max-w-[80%] flex-col">
        <div
          className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
            isUser ? 'bg-blue-600 text-white shadow' : 'bg-slate-100 text-slate-900'
          }`}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap break-words">{message.content}</span>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Metadata row for assistant messages only */}
        {!isUser &&
          (message.latencyMs != null ||
            message.costUsd != null ||
            (message.citations && message.citations.length > 0)) && (
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
              {message.latencyMs != null && <span>Latency: {message.latencyMs} ms</span>}
              {message.costUsd != null && <span>Cost: ${message.costUsd.toFixed(4)}</span>}
              {message.latencyMs != null && message.costUsd != null && <span>·</span>}
              {message.citations &&
                message.citations.map((citation, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (citation.href) {
                        window.open(citation.href, '_blank')
                      }
                    }}
                    className="rounded-full border border-slate-200 px-2 py-0.5 text-[11px] hover:bg-slate-50"
                  >
                    {citation.label}
                  </button>
                ))}
            </div>
          )}
      </div>
    </div>
  )
}
