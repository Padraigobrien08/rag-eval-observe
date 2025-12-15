'use client'

import ReactMarkdown from 'react-markdown'
import type { ChatMessage } from './types'
import CitationsDropdown from './CitationsDropdown'

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
    <div 
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
      style={{ width: '100%', paddingLeft: '2rem', paddingRight: '4rem' }}
    >
      <div className={`flex max-w-[80%] flex-col ${isUser ? 'items-end' : ''}`}>
        <div
          className={`rounded-2xl shadow-sm ${
            isUser 
              ? 'bg-white text-slate-900 border border-slate-200 shadow' 
              : 'bg-slate-100 text-slate-900'
          }`}
          style={{ 
            fontSize: '1rem', 
            paddingTop: '0.75rem',
            paddingBottom: '0.75rem',
            paddingLeft: '1rem',
            paddingRight: '1rem'
          }}
        >
          {isUser ? (
            <span className="whitespace-pre-wrap break-words">{message.content}</span>
          ) : (
            <div 
              className="prose prose-sm max-w-none"
              style={{ lineHeight: '1.8' }}
            >
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Metadata row for assistant messages only */}
        {!isUser &&
          (message.latencyMs != null ||
            message.costUsd != null ||
            (message.citations && message.citations.length > 0)) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {message.latencyMs != null && (
                <span className="whitespace-nowrap">Latency: {message.latencyMs.toLocaleString()}ms</span>
              )}
              {message.costUsd != null && (
                <span className="whitespace-nowrap">Cost: ${message.costUsd.toFixed(4)}</span>
              )}
              {message.latencyMs != null && message.costUsd != null && (
                <span className="text-slate-300">·</span>
              )}
              {message.citations && message.citations.length > 0 && (
                <>
                  {(message.latencyMs != null || message.costUsd != null) && (
                    <span className="text-slate-300">·</span>
                  )}
                  <CitationsDropdown citations={message.citations} />
                </>
              )}
            </div>
          )}
      </div>
    </div>
  )
}
