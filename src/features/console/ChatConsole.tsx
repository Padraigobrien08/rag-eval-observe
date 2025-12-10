'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@/features/chat/useChat'
import type { IngestResponse } from '@/lib/api/types'
import Drawer from '@/components/Drawer'
import IngestForm from '@/features/ingest/IngestForm'
import { ToastContainer as UIToastContainer, useToast } from '@/components/ui/Toast'
import UserMessage from '@/features/chat/UserMessage'
import AssistantMessage from '@/features/chat/AssistantMessage'
import EmptyState from '@/features/chat/EmptyState'
import LoadingSkeleton from '@/features/chat/LoadingSkeleton'
import { copyTranscript, downloadTranscript } from '@/lib/utils/transcript'
import { health } from '@/lib/api/client'
import { useRagSettings } from '@/features/settings/useRagSettings'

interface ChatConsoleProps {
  onIngestSuccess?: () => void
}

export default function ChatConsole({ onIngestSuccess }: ChatConsoleProps = {}) {
  const router = useRouter()
  const { messages, isLoading, error, sendMessage, resetChat, retryLastMessage } = useChat()
  const [inputText, setInputText] = useState('')
  const { settings } = useRagSettings()
  const { topK, debug: debugMode, filters } = settings
  // Note: setFilters is available but not used in this component

  const [ingestDrawerOpen, setIngestDrawerOpen] = useState(false)
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set())
  const [connectionStatus, setConnectionStatus] = useState<{ ok: boolean; db?: boolean } | null>(
    null
  )
  const chatEndRef = useRef<HTMLDivElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)

  // Check connection status
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthData = await health()
        setConnectionStatus({ ok: healthData.ok, db: healthData.db })
      } catch {
        setConnectionStatus({ ok: false, db: false })
      }
    }
    checkHealth()
    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  // Check if user is at bottom of transcript
  const checkIfAtBottom = useCallback(() => {
    if (!transcriptRef.current) return false
    const { scrollTop, scrollHeight, clientHeight } = transcriptRef.current
    // Allow 50px threshold for "at bottom"
    return scrollHeight - scrollTop - clientHeight < 50
  }, [])

  // Handle scroll events to track if user is at bottom
  useEffect(() => {
    const transcript = transcriptRef.current
    if (!transcript) return

    const handleScroll = () => {
      setIsAtBottom(checkIfAtBottom())
    }

    transcript.addEventListener('scroll', handleScroll)
    return () => transcript.removeEventListener('scroll', handleScroll)
  }, [checkIfAtBottom])

  // Auto-scroll to bottom when new assistant messages arrive (only if user was at bottom)
  useEffect(() => {
    if (!transcriptRef.current || !chatEndRef.current) return

    // Check if the last message is from assistant
    const lastMessage = messages[messages.length - 1]
    if (lastMessage && lastMessage.role === 'assistant') {
      // Only auto-scroll if user was at bottom or this is the first message
      if (isAtBottom || messages.length === 1) {
        chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
        setIsAtBottom(true)
      }
    } else if (lastMessage && lastMessage.role === 'user') {
      // Always scroll when user sends a message
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
      setIsAtBottom(true)
    }
  }, [messages, isAtBottom])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isLoading) return

    const text = inputText.trim()
    setInputText('')

    await sendMessage(text, {
      topK,
      filters: filters.source || filters.title ? filters : undefined,
      debug: debugMode,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const toggleCitation = (citationId: string) => {
    const newExpanded = new Set(expandedCitations)
    if (newExpanded.has(citationId)) {
      newExpanded.delete(citationId)
    } else {
      newExpanded.add(citationId)
    }
    setExpandedCitations(newExpanded)
  }

  const { toasts, showToast, dismissToast } = useToast()

  const handleIngestSuccess = useCallback(
    (response: IngestResponse, _source: string, _title?: string) => {
      setIngestDrawerOpen(false)
      showToast(
        `Document ingested successfully! ${response.chunks_created} chunks created.`,
        'success'
      )
      onIngestSuccess?.()
    },
    [onIngestSuccess, showToast]
  )

  const handleUseAsFilter = useCallback((_source: string, _title?: string) => {
    setIngestDrawerOpen(false)
    // This will be handled by the parent layout
  }, [])

  const handleExamplePrompt = (prompt: string) => {
    setInputText(prompt)
    // Focus the textarea
    setTimeout(() => {
      const textarea = document.querySelector('textarea')
      textarea?.focus()
    }, 100)
  }

  const handleCopyTranscript = async () => {
    if (messages.length === 0) {
      showToast('No messages to copy', 'info')
      return
    }

    try {
      await copyTranscript(messages)
      showToast('Transcript copied to clipboard', 'success')
    } catch (err) {
      console.error('Failed to copy transcript:', err)
      showToast('Failed to copy transcript', 'error')
    }
  }

  const handleDownloadTranscript = () => {
    if (messages.length === 0) {
      showToast('No messages to download', 'info')
      return
    }

    try {
      downloadTranscript(messages)
      showToast('Transcript downloaded', 'success')
    } catch (err) {
      console.error('Failed to download transcript:', err)
      showToast('Failed to download transcript', 'error')
    }
  }

  const handleCopyAnswer = (_text: string) => {
    showToast('Answer copied to clipboard', 'success')
  }

  const handleIngestError = useCallback(
    (error: { status?: number; message: string }) => {
      showToast(`Failed to ingest document: ${error.message}`, 'error')
    },
    [showToast]
  )

  // Debug borders - always show for debugging (remove after fixing)
  const debugStyles = {
    root: { border: '2px solid red' },
    transcript: { border: '2px solid green' },
    input: { border: '2px solid blue' },
  }

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden" style={{ height: '100%', ...debugStyles.root }}>
      <UIToastContainer toasts={toasts} onDismiss={dismissToast} />
      <Drawer
        isOpen={ingestDrawerOpen}
        onClose={() => setIngestDrawerOpen(false)}
        title="Ingest Document"
      >
        <IngestForm
          onSuccess={handleIngestSuccess}
          onError={handleIngestError}
          showSampleButton={process.env.NODE_ENV === 'development'}
          onUseAsFilter={handleUseAsFilter}
        />
      </Drawer>

      {/* Top Header */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">RAG Eval</h1>
          {connectionStatus && (
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                connectionStatus.ok && connectionStatus.db
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  connectionStatus.ok && connectionStatus.db ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              {connectionStatus.ok && connectionStatus.db ? 'Connected' : 'Disconnected'}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/ingest')}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            title="Ingest documents"
          >
            Ingest
          </button>
          <button
            onClick={() => router.push('/metrics')}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            title="View metrics"
          >
            Metrics
          </button>
          {messages.length > 0 && (
            <>
              <button
                onClick={handleCopyTranscript}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Copy transcript"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
              <button
                onClick={handleDownloadTranscript}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Download transcript"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
              </button>
            </>
          )}
          <button
            onClick={resetChat}
            disabled={messages.length === 0}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            New chat
          </button>
        </div>
      </div>

      {/* Chat Transcript - Scrollable */}
      <div
        ref={transcriptRef}
        className="flex-1 min-h-0 overflow-y-auto bg-neutral-50/50 w-full"
        style={{ flex: '1 1 0%', minHeight: 0, scrollBehavior: 'smooth', ...debugStyles.transcript }}
      >
        {messages.length === 0 && !isLoading ? (
          <div className="min-h-full flex items-center justify-center w-full">
            <div className="max-w-5xl w-full mx-auto px-6 py-6">
              <EmptyState onSelectPrompt={handleExamplePrompt} />
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="max-w-5xl w-full mx-auto px-6 py-6">
              <div className="space-y-8">
                {messages.map((message, index) => {
                  // Group messages by turn (user + assistant)
                  const prevMessage = index > 0 ? messages[index - 1] : null
                  const isNewTurn = !prevMessage || prevMessage.role !== message.role
                  const showSpacing = isNewTurn && index > 0

                  return (
                    <div key={message.id} className={showSpacing ? 'pt-4' : ''}>
                      {message.role === 'user' ? (
                        <UserMessage message={message} />
                      ) : (
                        <AssistantMessage
                          message={message}
                          expandedCitations={expandedCitations}
                          onToggleCitation={toggleCitation}
                          debugMode={debugMode}
                          onRetry={retryLastMessage}
                          onCopyAnswer={handleCopyAnswer}
                        />
                      )}
                    </div>
                  )
                })}
                {isLoading && <LoadingSkeleton />}
                <div ref={chatEndRef} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area - Sticky to bottom */}
      <div className="shrink-0 border-t border-gray-200 bg-white/80 backdrop-blur" style={debugStyles.input}>
        <form onSubmit={handleSubmit} className="w-full">
          <div className="max-w-5xl w-full mx-auto px-6 py-4">
            <div className="flex items-end gap-3">
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                placeholder="Message RAG Eval..."
                disabled={isLoading}
                style={{ maxHeight: '144px' }}
                onInput={e => {
                  const target = e.target as HTMLTextAreaElement
                  target.style.height = 'auto'
                  // 6 lines max: line-height ~24px * 6 = 144px
                  target.style.height = `${Math.min(target.scrollHeight, 144)}px`
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !inputText.trim()}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
              {isLoading ? (
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
              </button>
            </div>
            {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
          </div>
        </form>
      </div>
    </div>
  )
}
