'use client'

import { useState } from 'react'
import type { AssistantChatMessage } from '@/features/chat/types'
import { Badge } from '@/components/ui/badge'
import MarkdownRenderer from './MarkdownRenderer'

interface AssistantMessageProps {
  message: AssistantChatMessage
  onRetry?: () => void
}

// Estimate cost based on token usage
function estimateCost(tokenUsage?: {
  total_tokens?: number
  prompt_tokens?: number
  completion_tokens?: number
}): string | null {
  if (!tokenUsage) return null

  const inputCostPer1K = 0.01
  const outputCostPer1K = 0.03

  const inputTokens = tokenUsage.prompt_tokens || 0
  const outputTokens = tokenUsage.completion_tokens || 0

  const cost = (inputTokens / 1000) * inputCostPer1K + (outputTokens / 1000) * outputCostPer1K

  if (cost < 0.001) return null

  return `$${cost.toFixed(4)}`
}

export default function AssistantMessage({ message, onRetry }: AssistantMessageProps) {
  const [citationsExpanded, setCitationsExpanded] = useState(false)
  const [debugExpanded, setDebugExpanded] = useState(false)

  // If this is an error message
  if (message.meta?.error) {
    return (
      <div className="flex justify-start">
        <div className="inline-block max-w-xl rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm">
          <div className="text-red-800 font-medium mb-1">Error</div>
          <div className="text-red-700">{message.meta.error.message}</div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="inline-block max-w-xl">
        {/* Message Bubble */}
        <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-gray-900 whitespace-pre-wrap break-words">
          <div className="prose prose-sm max-w-none text-gray-900">
            <MarkdownRenderer content={message.content} />
          </div>
        </div>

        {/* Telemetry Row */}
        {message.meta && (
          <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
            {message.meta.latencyMs !== undefined && (
              <Badge variant="outline" className="text-xs">
                {message.meta.latencyMs}ms
              </Badge>
            )}
            {message.meta.tokenUsage?.total_tokens && (
              <Badge variant="outline" className="text-xs">
                {message.meta.tokenUsage.total_tokens.toLocaleString()} tokens
              </Badge>
            )}
            {estimateCost(message.meta.tokenUsage) && (
              <Badge variant="outline" className="text-xs">
                {estimateCost(message.meta.tokenUsage)}
              </Badge>
            )}
          </div>
        )}

        {/* Citations Row */}
        {message.meta?.citations && message.meta.citations.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setCitationsExpanded(!citationsExpanded)}
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Citations ({message.meta.citations.length})</span>
              <svg
                className={`w-3 h-3 transform transition-transform ${
                  citationsExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {citationsExpanded && (
              <div className="mt-2 space-y-1">
                {message.meta.citations.map((citation, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5"
                  >
                    <div className="font-medium text-slate-900">{citation.title || 'Untitled'}</div>
                    <div className="text-slate-500">{citation.source}</div>
                    {citation.chunk_index !== undefined && (
                      <div className="text-slate-400">Chunk {citation.chunk_index}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Debug: Retrieved Context */}
        {message.meta?.debugRetrieved && message.meta.debugRetrieved.length > 0 && (
          <div className="mt-2">
            <button
              onClick={() => setDebugExpanded(!debugExpanded)}
              className="text-xs text-slate-600 hover:text-slate-700 flex items-center gap-1"
            >
              <span>Retrieved context ({message.meta.debugRetrieved.length})</span>
              <svg
                className={`w-3 h-3 transform transition-transform ${
                  debugExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            {debugExpanded && (
              <div className="mt-2 space-y-1 bg-slate-50 rounded-lg px-3 py-2 text-xs">
                {message.meta.debugRetrieved.map((chunk, index) => {
                  const isUsed = message.meta?.used_chunk_ids?.includes(chunk.chunk_id) || false
                  return (
                    <div
                      key={chunk.chunk_id}
                      className={`p-1.5 rounded ${
                        isUsed ? 'bg-blue-50 border border-blue-200' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-slate-500">#{index + 1}</span>
                        <span className="text-slate-500">Score: {chunk.score.toFixed(4)}</span>
                        {isUsed && (
                          <Badge variant="secondary" className="text-xs">
                            Used
                          </Badge>
                        )}
                      </div>
                      <div className="text-slate-700 font-mono text-xs truncate">
                        {chunk.content_snippet}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
