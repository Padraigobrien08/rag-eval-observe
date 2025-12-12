'use client'

import { useState } from 'react'
import type { AssistantChatMessage } from './types'
import { Card } from '@/components/ui/Card'
import ErrorMessage from './ErrorMessage'

// Simple markdown renderer component
function MarkdownRenderer({ content }: { content: string }) {
  // Split content into lines for processing
  const lines = content.split('\n')
  const elements: JSX.Element[] = []
  let currentParagraph: string[] = []
  let inCodeBlock = false
  let codeBlockContent: string[] = []
  let inList = false
  let listItems: string[] = []
  let listOrdered = false

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join('\n')
      if (text.trim()) {
        elements.push(
          <p key={`p-${elements.length}`} className="text-sm leading-relaxed text-gray-900 mb-3">
            {renderInlineMarkdown(text)}
          </p>
        )
      }
      currentParagraph = []
    }
  }

  const flushCodeBlock = () => {
    if (codeBlockContent.length > 0) {
      elements.push(
        <pre
          key={`code-${elements.length}`}
          className="bg-gray-100 border border-gray-200 rounded-lg p-3 overflow-x-auto mb-3"
        >
          <code className="text-xs font-mono text-gray-800">{codeBlockContent.join('\n')}</code>
        </pre>
      )
      codeBlockContent = []
    }
  }

  const flushList = () => {
    if (listItems.length > 0) {
      const ListTag = listOrdered ? 'ol' : 'ul'
      elements.push(
        <ListTag
          key={`list-${elements.length}`}
          className={`text-sm text-gray-900 mb-3 ${listOrdered ? 'list-decimal' : 'list-disc'} ml-6 space-y-1`}
        >
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ListTag>
      )
      listItems = []
      inList = false
    }
  }

  const renderInlineMarkdown = (text: string): (JSX.Element | string)[] => {
    const parts: (JSX.Element | string)[] = []
    let currentIndex = 0

    // Match bold **text** or __text__
    const boldRegex = /(\*\*|__)(.+?)\1/g
    // Match inline code `code`
    const codeRegex = /`([^`]+)`/g
    // Match links [text](url)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g

    const matches: Array<{
      type: 'bold' | 'italic' | 'code' | 'link'
      start: number
      end: number
      content: string
      url?: string
    }> = []

    let match
    while ((match = boldRegex.exec(text)) !== null) {
      matches.push({
        type: 'bold',
        start: match.index,
        end: match.index + match[0].length,
        content: match[2],
      })
    }
    while ((match = codeRegex.exec(text)) !== null) {
      matches.push({
        type: 'code',
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
      })
    }
    while ((match = linkRegex.exec(text)) !== null) {
      matches.push({
        type: 'link',
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
        url: match[2],
      })
    }

    // Match italic *text* or _text_ (but not **text** or __text__)
    // Process after bold/code/links to avoid conflicts
    // Use a simple approach: find single * or _ that aren't part of ** or __
    let italicIndex = 0
    while (italicIndex < text.length) {
      const char = text[italicIndex]
      if (char === '*' || char === '_') {
        // Check if it's part of a bold pattern
        const isBoldStart =
          (char === '*' && text[italicIndex + 1] === '*') ||
          (char === '_' && text[italicIndex + 1] === '_')
        const isBoldEnd =
          italicIndex > 0 &&
          ((text[italicIndex - 1] === '*' && char === '*') ||
            (text[italicIndex - 1] === '_' && char === '_'))

        if (!isBoldStart && !isBoldEnd) {
          // Find the closing delimiter
          const closingIndex = text.indexOf(char, italicIndex + 1)
          if (closingIndex > italicIndex + 1) {
            // Check if the closing delimiter is also not part of bold
            const isClosingBold = closingIndex < text.length - 1 && text[closingIndex + 1] === char
            const isClosingBoldStart = closingIndex > 0 && text[closingIndex - 1] === char

            if (!isClosingBold && !isClosingBoldStart) {
              // Check if this range overlaps with any existing match
              let overlaps = false
              for (const existingMatch of matches) {
                if (
                  (italicIndex >= existingMatch.start && italicIndex < existingMatch.end) ||
                  (closingIndex + 1 > existingMatch.start && closingIndex + 1 <= existingMatch.end)
                ) {
                  overlaps = true
                  break
                }
              }

              if (!overlaps) {
                matches.push({
                  type: 'italic',
                  start: italicIndex,
                  end: closingIndex + 1,
                  content: text.substring(italicIndex + 1, closingIndex),
                })
                italicIndex = closingIndex + 1
                continue
              }
            }
          }
        }
      }
      italicIndex++
    }
    while ((match = codeRegex.exec(text)) !== null) {
      matches.push({
        type: 'code',
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
      })
    }
    while ((match = linkRegex.exec(text)) !== null) {
      matches.push({
        type: 'link',
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
        url: match[2],
      })
    }

    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start)

    // Remove overlapping matches (keep first)
    const filteredMatches: typeof matches = []
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i]
      let overlaps = false
      for (let j = 0; j < i; j++) {
        const prev = matches[j]
        if (
          (current.start >= prev.start && current.start < prev.end) ||
          (current.end > prev.start && current.end <= prev.end)
        ) {
          overlaps = true
          break
        }
      }
      if (!overlaps) {
        filteredMatches.push(current)
      }
    }

    // Build parts
    for (const match of filteredMatches) {
      // Add text before match
      if (match.start > currentIndex) {
        parts.push(text.substring(currentIndex, match.start))
      }

      // Add matched element
      const key = `inline-${match.start}`
      switch (match.type) {
        case 'bold':
          parts.push(
            <strong key={key} className="font-semibold text-gray-900">
              {match.content}
            </strong>
          )
          break
        case 'italic':
          parts.push(
            <em key={key} className="italic">
              {match.content}
            </em>
          )
          break
        case 'code':
          parts.push(
            <code key={key} className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">
              {match.content}
            </code>
          )
          break
        case 'link':
          parts.push(
            <a
              key={key}
              href={match.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {match.content}
            </a>
          )
          break
      }

      currentIndex = match.end
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex))
    }

    return parts.length > 0 ? parts : [text]
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Check for code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock()
        inCodeBlock = false
      } else {
        flushParagraph()
        flushList()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      continue
    }

    // Check for headers
    if (trimmed.startsWith('#')) {
      flushParagraph()
      flushList()
      const level = trimmed.match(/^#+/)?.[0].length || 1
      const text = trimmed.substring(level).trim()
      const HeadingTag = `h${Math.min(level, 6)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      const headingClasses = {
        h1: 'text-lg font-semibold text-gray-900 mb-2 mt-4',
        h2: 'text-base font-semibold text-gray-900 mb-2 mt-3',
        h3: 'text-sm font-semibold text-gray-900 mb-1 mt-2',
        h4: 'text-sm font-semibold text-gray-900 mb-1 mt-2',
        h5: 'text-sm font-semibold text-gray-900 mb-1 mt-2',
        h6: 'text-sm font-semibold text-gray-900 mb-1 mt-2',
      }
      elements.push(
        <HeadingTag key={`h-${elements.length}`} className={headingClasses[HeadingTag]}>
          {renderInlineMarkdown(text)}
        </HeadingTag>
      )
      continue
    }

    // Check for list items
    const listMatch = trimmed.match(/^(\d+\.|\*|\-|\+)\s+(.+)$/)
    if (listMatch) {
      flushParagraph()
      const isOrdered = /^\d+\./.test(listMatch[1])
      if (!inList || (isOrdered && !listOrdered) || (!isOrdered && listOrdered)) {
        flushList()
        inList = true
        listOrdered = isOrdered
      }
      listItems.push(listMatch[2])
      continue
    }

    // Regular line
    if (trimmed === '') {
      flushParagraph()
      flushList()
    } else {
      if (inList) {
        flushList()
      }
      currentParagraph.push(line)
    }
  }

  // Flush remaining
  flushParagraph()
  flushList()
  flushCodeBlock()

  return <div className="markdown-content">{elements}</div>
}

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
  const [retrievedExpanded, setRetrievedExpanded] = useState(false)

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
          <div className="pr-8">
            <MarkdownRenderer content={message.content} />
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
          <div className="mt-2">
            <button
              onClick={() => setRetrievedExpanded(!retrievedExpanded)}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors mb-2"
            >
              <span>Retrieved context (top {message.meta.debugRetrieved.length})</span>
              <svg
                className={`w-3 h-3 transform transition-transform ${
                  retrievedExpanded ? 'rotate-180' : ''
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

            {retrievedExpanded && (
              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                {message.meta.debugRetrieved.map((chunk, index) => {
                  const isUsed = message.meta?.used_chunk_ids?.includes(chunk.chunk_id) || false
                  return (
                    <div
                      key={chunk.chunk_id}
                      className={`bg-white rounded-md p-2.5 border ${
                        isUsed ? 'border-blue-200 bg-blue-50/30' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Rank */}
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-gray-700">
                          {index + 1}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Score and Used Badge */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-600">
                              Score: {chunk.score.toFixed(4)}
                            </span>
                            {isUsed && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                Used
                              </span>
                            )}
                          </div>

                          {/* Snippet */}
                          <div className="text-xs text-gray-700 bg-slate-50 p-2 rounded border border-gray-200 font-mono leading-relaxed">
                            {chunk.content_snippet}
                          </div>

                          {/* Source/Title and Chunk Index */}
                          <div className="text-xs text-gray-500">
                            {chunk.title && <span className="font-medium">{chunk.title}</span>}
                            {chunk.source && (
                              <span>
                                {chunk.title ? ' • ' : ''}
                                {chunk.source}
                              </span>
                            )}
                            {chunk.chunk_index !== undefined && (
                              <span> • Chunk {chunk.chunk_index}</span>
                            )}
                          </div>
                        </div>
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
