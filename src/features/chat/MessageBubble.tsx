'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ChatMessage } from './types'
import CitationsDropdown from './CitationsDropdown'
import InlineCitation from './InlineCitation'
import CitationDetailDialog from './CitationDetailDialog'
import { splitTextWithCitations } from './citationParser'
import { useLocalStorage } from '@/features/settings/useLocalStorage'
import type { Citation } from './types'

interface MessageBubbleProps {
  message: ChatMessage
  previousMessage?: ChatMessage | null
}

/**
 * Extract summary from content by taking first 1-2 sentences
 */
function extractSummary(content: string): { summary: string; body: string } {
  // Remove markdown headers and code blocks for sentence detection
  const plainText = content
    .replace(/^#+\s+/gm, '') // Remove markdown headers
    .replace(/```[\s\S]*?```/g, '') // Remove code blocks
    .replace(/`[^`]+`/g, '') // Remove inline code
    .trim()

  // Split into sentences (simple regex - looks for . ! ? followed by space or end)
  const sentences = plainText.match(/[^.!?]+[.!?]+/g) || [plainText]

  if (sentences.length <= 2) {
    // If 1-2 sentences, use first sentence as summary, rest as body
    return {
      summary: sentences[0] || content,
      body: sentences.slice(1).join(' ') || '',
    }
  }

  // Take first 1-2 sentences as summary
  const summarySentences = sentences.slice(0, 2)
  const summary = summarySentences.join(' ')
  const body = sentences.slice(2).join(' ')

  return { summary, body }
}

/**
 * Extract text content from React children (handles strings, arrays, and React elements)
 */
function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') {
    return children
  }
  if (typeof children === 'number') {
    return String(children)
  }
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('')
  }
  if (children && typeof children === 'object' && 'props' in children) {
    return extractTextFromChildren(children.props.children)
  }
  return ''
}

/**
 * Convert summary to bullet points if it contains multiple sentences or clauses
 */
function formatSummaryAsBullets(summary: string): string[] {
  // If summary has multiple sentences, try to split into bullets
  const sentences = summary.match(/[^.!?]+[.!?]+/g) || [summary]

  if (sentences.length > 1) {
    return sentences.map(s => s.trim()).filter(s => s.length > 0)
  }

  // Check for list-like patterns (numbered, bulleted, or colon-separated)
  if (summary.includes(':')) {
    const parts = summary.split(':')
    if (parts.length > 1) {
      const main = parts[0].trim()
      const details = parts.slice(1).join(':').trim()
      return [main, details]
    }
  }

  // Check for comma-separated clauses (if long enough)
  if (summary.length > 100 && summary.includes(',')) {
    const clauses = summary
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 20)
    if (clauses.length >= 2 && clauses.length <= 3) {
      return clauses
    }
  }

  // Return as single bullet point
  return [summary]
}

export default function MessageBubble({ message, previousMessage }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const [defaultExpanded] = useLocalStorage<boolean>('rag-eval-default-expanded-answers', false)
  // Always start with false to avoid hydration mismatch, then update in useEffect
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null)
  const [selectedCitationNumber, setSelectedCitationNumber] = useState<number>(1)
  const [citationDialogOpen, setCitationDialogOpen] = useState(false)

  // Reset expansion state when message changes or after hydration
  useEffect(() => {
    setIsExpanded(defaultExpanded)
  }, [message.id, defaultExpanded])

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <p className="text-xs text-slate-400">{message.content}</p>
      </div>
    )
  }

  const streamingEmpty = !isUser && Boolean(message.metadata?.streaming) && !message.content.trim()

  if (streamingEmpty) {
    return (
      <div
        className={`flex w-full justify-start`}
        style={{ width: '100%', paddingLeft: '2rem', paddingRight: '2rem' }}
      >
        <div
          className="rounded-2xl shadow-sm bg-slate-100 text-slate-600 flex items-center gap-2 animate-pulse"
          style={{
            fontSize: '0.9375rem',
            paddingTop: '0.75rem',
            paddingBottom: '0.75rem',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            maxWidth: '80%',
          }}
        >
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>Waiting for the first tokens…</span>
        </div>
      </div>
    )
  }

  // For assistant messages, extract summary and body
  let summary: string[] = []
  let body = ''
  let hasBody = false
  let hasInlineCitations = false

  if (!isUser) {
    const { summary: extractedSummary, body: extractedBody } = extractSummary(message.content)
    summary = formatSummaryAsBullets(extractedSummary)
    body = extractedBody.trim()
    hasBody = body.length > 0

    // Check if content has inline citations
    const fullContent = message.content
    const citationMatches = splitTextWithCitations(fullContent)
    hasInlineCitations = citationMatches.some(segment => typeof segment !== 'string')
  }

  // Handle citation chip click - opens dialog with the selected citation
  const handleCitationClick = (citationNumbers: number[]) => {
    if (!message.citations || message.citations.length === 0) return

    // Map citation numbers (1-indexed) to citation indices (0-indexed)
    // Find the first citation that matches any of the clicked numbers
    const citationIndex = citationNumbers
      .map(num => num - 1) // Convert to 0-indexed
      .find(idx => idx >= 0 && idx < (message.citations?.length || 0))

    if (citationIndex !== undefined && citationIndex >= 0 && message.citations) {
      setSelectedCitation(message.citations[citationIndex])
      setSelectedCitationNumber(citationIndex + 1) // Store 1-indexed number for display
      setCitationDialogOpen(true)
    }
  }

  return (
    <div
      className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
      style={{ width: '100%', paddingLeft: '2rem', paddingRight: '2rem' }}
    >
      {isUser ? (
        // User message - white pill-shaped bubble
        <div
          className="rounded-full shadow-sm bg-white border border-slate-200 inline-block"
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            paddingTop: '0.75rem',
            paddingBottom: '0.75rem',
            paddingLeft: '1rem',
            paddingRight: '1rem',
            maxWidth: '80%',
          }}
        >
          <span className="text-slate-900 whitespace-pre-wrap break-words font-semibold">
            {message.content}
          </span>
        </div>
      ) : (
        <div className="flex max-w-[80%] flex-col w-full">
          {/* Answer Content with divider separation */}
          <div className="w-full">
            {/* Divider between question and answer - only show if previous message was a question */}
            {previousMessage?.role === 'user' && (
              <div className="border-t border-slate-200 mb-3" style={{ marginTop: '0.5rem' }}></div>
            )}
            <div
              className="rounded-2xl shadow-sm bg-slate-100 text-slate-900"
              style={{
                fontSize: '1rem',
                paddingTop: '0.75rem',
                paddingBottom: '0.75rem',
                paddingLeft: '1rem',
                paddingRight: '1rem',
              }}
            >
              <div className="space-y-3">
                {typeof message.metadata?.retrieved_chunk_count === 'number' &&
                  message.metadata.retrieved_chunk_count === 0 && (
                    <p
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
                      role="status"
                    >
                      No document chunks were retrieved. Answers may be generic—use the{' '}
                      <strong className="font-semibold">+</strong> control in the documents sidebar
                      to ingest files, or rephrase your question.
                    </p>
                  )}
                {/* Summary Section */}
                {summary.length > 0 && (
                  <div className="space-y-1.5">
                    {summary.map((bullet, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-slate-600 mt-0.5">•</span>
                        <div
                          className="prose prose-sm max-w-none flex-1"
                          style={{ lineHeight: '1.6', margin: 0 }}
                        >
                          {hasInlineCitations ? (
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => {
                                  const text = extractTextFromChildren(children)
                                  const segments = splitTextWithCitations(text)
                                  return (
                                    <p>
                                      {segments.map((segment, segIdx) => {
                                        if (typeof segment === 'string') {
                                          return <span key={segIdx}>{segment}</span>
                                        }
                                        return (
                                          <InlineCitation
                                            key={segIdx}
                                            match={segment}
                                            onClick={handleCitationClick}
                                          />
                                        )
                                      })}
                                    </p>
                                  )
                                },
                              }}
                            >
                              {bullet}
                            </ReactMarkdown>
                          ) : (
                            <ReactMarkdown>{bullet}</ReactMarkdown>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Body Section - Collapsible */}
                {hasBody && (
                  <div className="space-y-2">
                    {isExpanded && (
                      <div
                        className="prose prose-sm max-w-none border-t border-slate-200 pt-3"
                        style={{ lineHeight: '1.8', margin: 0 }}
                      >
                        {hasInlineCitations ? (
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => {
                                const text = extractTextFromChildren(children)
                                const segments = splitTextWithCitations(text)
                                return (
                                  <p>
                                    {segments.map((segment, segIdx) => {
                                      if (typeof segment === 'string') {
                                        return <span key={segIdx}>{segment}</span>
                                      }
                                      return (
                                        <InlineCitation
                                          key={segIdx}
                                          match={segment}
                                          onClick={handleCitationClick}
                                        />
                                      )
                                    })}
                                  </p>
                                )
                              },
                            }}
                          >
                            {body}
                          </ReactMarkdown>
                        ) : (
                          <ReactMarkdown>{body}</ReactMarkdown>
                        )}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="h-7 text-xs text-slate-600 hover:text-slate-900 -ml-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3 mr-1" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3 mr-1" />
                          Show more
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* If no body extracted, show full content */}
                {!hasBody && summary.length === 0 && (
                  <div className="prose prose-sm max-w-none" style={{ lineHeight: '1.8' }}>
                    {hasInlineCitations ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => {
                            const text = extractTextFromChildren(children)
                            const segments = splitTextWithCitations(text)
                            return (
                              <p>
                                {segments.map((segment, segIdx) => {
                                  if (typeof segment === 'string') {
                                    return <span key={segIdx}>{segment}</span>
                                  }
                                  return (
                                    <InlineCitation
                                      key={segIdx}
                                      match={segment}
                                      onClick={handleCitationClick}
                                    />
                                  )
                                })}
                              </p>
                            )
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Metadata row for assistant messages only */}
          {(message.latencyMs != null ||
            message.costUsd != null ||
            message.ragModel != null ||
            (message.citations && message.citations.length > 0)) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              {message.ragModel != null && (
                <span className="whitespace-nowrap">
                  RAG Model:{' '}
                  {message.ragModel === 'vector-similarity'
                    ? 'Vector Similarity'
                    : message.ragModel === 'hybrid-search'
                      ? 'Hybrid Search'
                      : message.ragModel === 'reranking'
                        ? 'Reranking'
                        : message.ragModel === 'multi-query'
                          ? 'Multi-Query'
                          : message.ragModel}
                </span>
              )}
              {message.ragModel != null && message.latencyMs != null && (
                <span className="text-slate-300">·</span>
              )}
              {message.latencyMs != null && (
                <span className="whitespace-nowrap">
                  Latency: {message.latencyMs.toLocaleString()}ms
                </span>
              )}
              {(message.ragModel != null || message.latencyMs != null) &&
                message.costUsd != null && <span className="text-slate-300">·</span>}
              {message.costUsd != null && (
                <span className="whitespace-nowrap">Cost: ${message.costUsd.toFixed(4)}</span>
              )}
              {message.citations && message.citations.length > 0 && (
                <>
                  {(message.ragModel != null ||
                    message.latencyMs != null ||
                    message.costUsd != null) && <span className="text-slate-300">·</span>}
                  <CitationsDropdown citations={message.citations} />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Citation Detail Dialog - opened from inline citations */}
      {!isUser && (
        <CitationDetailDialog
          open={citationDialogOpen}
          onOpenChange={setCitationDialogOpen}
          citation={selectedCitation}
          citationNumber={selectedCitationNumber}
        />
      )}
    </div>
  )
}
