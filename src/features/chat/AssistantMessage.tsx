'use client'

import { useState } from 'react'
import type { AssistantChatMessage } from './types'
import { Card } from '@/components/ui/Card'
import ErrorMessage from './ErrorMessage'

interface AssistantMessageProps {
  message: AssistantChatMessage
  expandedCitations: Set<string>
  onToggleCitation: (id: string) => void
  debugMode: boolean
  onRetry?: () => void
  onCopyAnswer?: (text: string) => void
}

// Estimate cost based on token usage (rough estimates for GPT-4)
function estimateCost(tokenUsage?: {
  total_tokens?: number
  prompt_tokens?: number
  completion_tokens?: number
}): string | null {
  if (!tokenUsage) return null

  // Rough estimates (as of 2024):
  // GPT-4 Turbo: ~$0.01 per 1K input tokens, ~$0.03 per 1K output tokens
  const inputCostPer1K = 0.01
  const outputCostPer1K = 0.03

  const inputTokens = tokenUsage.prompt_tokens || 0
  const outputTokens = tokenUsage.completion_tokens || 0

  const cost = (inputTokens / 1000) * inputCostPer1K + (outputTokens / 1000) * outputCostPer1K

  if (cost < 0.001) return null // Don't show if less than $0.001

  return `$${cost.toFixed(4)}`
}

export default function AssistantMessage({
  message,
  expandedCitations,
  onToggleCitation,
  debugMode,
  onRetry,
  onCopyAnswer,
}: AssistantMessageProps) {
  const [copiedCitationId, setCopiedCitationId] = useState<string | null>(null)
  const [copiedAnswer, setCopiedAnswer] = useState(false)
  const [citationsExpanded, setCitationsExpanded] = useState(false)

  const handleCopyAnswer = async () => {
    if (!message.content) return

    try {
      await navigator.clipboard.writeText(message.content)
      setCopiedAnswer(true)
      setTimeout(() => setCopiedAnswer(false), 2000)
      onCopyAnswer?.(message.content)
    } catch (err) {
      console.error('Failed to copy answer:', err)
    }
  }

  // If this is an error message, render error UI
  if (message.meta?.error) {
    return (
      <div className="flex items-start gap-3 animate-message-in">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
          <svg
            className="w-5 h-5 text-slate-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
        <div className="flex-1 max-w-3xl">
          <Card variant="outlined" padding="md" className="rounded-2xl">
            <ErrorMessage
              message={message.meta.error.message}
              requestId={message.meta.error.requestId}
              status={message.meta.error.status}
              onRetry={onRetry}
            />
          </Card>
        </div>
      </div>
    )
  }

  const copyCitation = async (citation: {
    title?: string
    source?: string
    chunk_index?: number
    document_id?: string
  }) => {
    const citationText = `Title: ${citation.title || 'Untitled'}\nSource: ${citation.source || 'Unknown'}\nChunk Index: ${citation.chunk_index ?? 'N/A'}\nDocument ID: ${citation.document_id || 'N/A'}`

    try {
      await navigator.clipboard.writeText(citationText)
      const citationId = citation.document_id || 'unknown'
      setCopiedCitationId(citationId)
      setTimeout(() => setCopiedCitationId(null), 2000)
    } catch (err) {
      console.error('Failed to copy citation:', err)
    }
  }

  return (
    <div className="flex items-start gap-3 animate-message-in">
      {/* Bot Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
        <span className="text-sm font-semibold text-slate-700">A</span>
      </div>

      {/* Message Content */}
      <div className="flex-1 max-w-3xl">
        {/* Message Bubble */}
        <div className="bg-white border border-gray-200/70 shadow-sm rounded-2xl px-4 py-3 mb-2 relative group">
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopyAnswer}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Copy answer"
            >
              {copiedAnswer ? (
                <svg
                  className="w-4 h-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>
          </div>
          <div className="prose prose-sm max-w-none pr-8">
            <p className="text-sm leading-relaxed text-gray-900 whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        </div>

        {/* Metadata Pills */}
        {message.meta && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {message.meta.latencyMs !== undefined && (
              <span className="inline-flex items-center rounded-full bg-slate-100 text-xs text-gray-600 px-2 py-0.5">
                Latency: {message.meta.latencyMs}ms
              </span>
            )}
            {message.meta.tokenUsage?.total_tokens && (
              <span className="inline-flex items-center rounded-full bg-slate-100 text-xs text-gray-600 px-2 py-0.5">
                Tokens: {message.meta.tokenUsage.total_tokens.toLocaleString()}
              </span>
            )}
            {estimateCost(message.meta.tokenUsage) && (
              <span className="inline-flex items-center rounded-full bg-slate-100 text-xs text-gray-600 px-2 py-0.5">
                Est. Cost: {estimateCost(message.meta.tokenUsage)}
              </span>
            )}
          </div>
        )}

        {/* Citations Section */}
        {message.meta?.citations && message.meta.citations.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setCitationsExpanded(!citationsExpanded)}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
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
              <div className="mt-2 space-y-1.5">
                {message.meta.citations.map((citation, idx) => {
                  const citationId =
                    citation.chunk_id || `${citation.document_id}-${citation.chunk_index || idx}`
                  const isExpanded = expandedCitations.has(citationId)
                  const debugChunk = citation.chunk_id
                    ? message.meta?.debugRetrieved?.find(c => c.chunk_id === citation.chunk_id)
                    : undefined

                  const snippet = debugChunk?.content_snippet || 'No snippet available'

                  return (
                    <Card
                      key={citationId}
                      variant="outlined"
                      padding="sm"
                      className="bg-slate-50 rounded-lg"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => onToggleCitation(citationId)}
                          className="flex-1 text-left"
                          disabled={!snippet || snippet === 'No snippet available'}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="text-xs font-medium text-gray-900">
                                {citation.title || 'Untitled'}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {citation.source}
                                {citation.chunk_index !== undefined &&
                                  ` • Chunk ${citation.chunk_index}`}
                              </div>
                            </div>
                            {snippet && snippet !== 'No snippet available' && (
                              <svg
                                className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5 transform transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
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
                            )}
                          </div>
                        </button>
                        <button
                          onClick={() => copyCitation(citation)}
                          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                          title="Copy citation"
                        >
                          {copiedCitationId === citation.document_id ? (
                            <svg
                              className="w-3.5 h-3.5 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                      {isExpanded && snippet && snippet !== 'No snippet available' && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          {debugChunk && (
                            <div className="text-xs text-gray-600 mb-1.5">
                              <span className="font-medium">Score:</span>{' '}
                              {debugChunk.score.toFixed(4)}
                            </div>
                          )}
                          <div className="text-xs text-gray-700 bg-white p-1.5 rounded border border-gray-200 font-mono">
                            {snippet}
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Debug: Retrieved Context */}
        {debugMode && message.meta?.debugRetrieved && message.meta.debugRetrieved.length > 0 && (
          <Card variant="outlined" padding="sm" className="mt-2 rounded-lg">
            <details className="group">
              <summary className="cursor-pointer text-xs font-semibold text-gray-900 mb-2 list-none">
                <div className="flex items-center justify-between">
                  <span>Retrieved Context ({message.meta.debugRetrieved.length})</span>
                  <svg
                    className="w-3.5 h-3.5 text-gray-400 transform transition-transform group-open:rotate-180"
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
                </div>
              </summary>
              <div className="space-y-1.5 mt-2">
                {message.meta.debugRetrieved.map(chunk => (
                  <Card key={chunk.chunk_id} variant="outlined" padding="sm" className="bg-slate-50 rounded-lg">
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-900">
                          {chunk.title || 'Untitled'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {chunk.source}
                          {chunk.chunk_index !== undefined && ` • Chunk ${chunk.chunk_index}`}
                        </div>
                      </div>
                      <div className="text-xs font-mono text-gray-600 ml-4">
                        {chunk.score.toFixed(4)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-700 bg-white p-1.5 rounded border border-gray-200 font-mono mt-1.5">
                      {chunk.content_snippet}
                    </div>
                  </Card>
                ))}
              </div>
            </details>
          </Card>
        )}
      </div>
    </div>
  )
}
