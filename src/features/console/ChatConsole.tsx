'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useChat } from '@/features/chat/useChat'
import type { IngestResponse } from '@/lib/api/types'
import Drawer from '@/components/Drawer'
import IngestForm from '@/features/ingest/IngestForm'
import { ToastContainer as UIToastContainer, useToast } from '@/components/ui/Toast'
import Alert from '@/components/ui/Alert'
import UserMessage from '@/features/chat/UserMessage'
import AssistantMessage from '@/features/chat/AssistantMessage'
import EmptyState from '@/features/chat/EmptyState'
import LoadingSkeleton from '@/features/chat/LoadingSkeleton'
import { copyTranscript, downloadTranscript } from '@/lib/utils/transcript'
import { health } from '@/lib/api/client'
import { useRagSettings } from '@/features/settings/useRagSettings'

interface ChatConsoleProps {
  sessionId?: string
  onSessionSwitch?: (sessionId: string) => void
  onIngestSuccess?: () => void
}

export default function ChatConsole({
  sessionId,
  onSessionSwitch,
  onIngestSuccess,
}: ChatConsoleProps = {}) {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    resetChat,
    retryLastMessage,
    telemetry,
    sessionId: currentSessionId,
  } = useChat(sessionId)
  const [inputText, setInputText] = useState('')
  const { settings, setFilters, clearDocumentSelection } = useRagSettings()
  const { topK, debug: debugMode, filters } = settings
  // Note: setFilters is available but not used in this component

  // Sync session switching with parent
  useEffect(() => {
    if (onSessionSwitch && currentSessionId && currentSessionId !== sessionId) {
      onSessionSwitch(currentSessionId)
    }
  }, [currentSessionId, sessionId, onSessionSwitch])

  // Handle new chat - creates new session
  const handleNewChat = useCallback(() => {
    resetChat()
    // resetChat already creates a new session, so currentSessionId will update
    // and the useEffect above will notify the parent
  }, [resetChat])

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

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden" style={{ height: '100%' }}>
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

      {/* Minimal Header - Only show when there are messages */}
      {messages.length > 0 && (
        <div className="sticky top-0 z-10 shrink-0 bg-white/80 backdrop-blur-sm border-b border-gray-100">
          <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {connectionStatus && (
                <div
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus.ok && connectionStatus.db ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  title={connectionStatus.ok && connectionStatus.db ? 'Connected' : 'Disconnected'}
                />
              )}
              <span className="text-xs text-gray-500">
                {telemetry.total_tokens > 0 && `${telemetry.total_tokens.toLocaleString()} tokens`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyTranscript}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
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
                onClick={handleNewChat}
                className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
              >
                New chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Transcript - Clean Scrollable Area */}
      <div
        ref={transcriptRef}
        className="flex-1 min-h-0 overflow-y-auto w-full bg-white"
        style={{ flex: '1 1 0%', minHeight: 0, scrollBehavior: 'smooth' }}
      >
        {messages.length === 0 && !isLoading ? (
          <div className="w-full h-full flex items-center justify-center px-4">
            <EmptyState onSelectPrompt={handleExamplePrompt} />
          </div>
        ) : (
          <div className="w-full">
            <div className="max-w-3xl w-full mx-auto px-4 py-8">
              <div className="space-y-8">
                {messages.map((message, index) => {
                  const prevMessage = index > 0 ? messages[index - 1] : null
                  const isNewTurn = !prevMessage || prevMessage.role !== message.role
                  const showSpacing = isNewTurn && index > 0

                  return (
                    <div key={message.id} className={showSpacing ? 'pt-6' : ''}>
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

      {/* Input Area - Clean and Centered */}
      <div className="shrink-0 bg-white border-t border-gray-100">
        <form onSubmit={handleSubmit} className="w-full">
          <div className="max-w-3xl w-full mx-auto px-4 py-4">
            <div className="relative">
              <div className="flex items-end gap-2 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow transition-shadow focus-within:border-gray-300 focus-within:shadow-md">
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  className="flex-1 w-full px-4 py-3 pr-12 bg-transparent border-0 rounded-2xl resize-none text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none disabled:opacity-50"
                  placeholder="Message RAG Eval..."
                  disabled={isLoading}
                  style={{ maxHeight: '200px', minHeight: '48px' }}
                  onInput={e => {
                    const target = e.target as HTMLTextAreaElement
                    target.style.height = 'auto'
                    target.style.height = `${Math.min(target.scrollHeight, 200)}px`
                  }}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputText.trim()}
                  className="absolute right-2 bottom-2 flex items-center justify-center w-8 h-8 bg-gray-900 text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Send message"
                >
                  {isLoading ? (
                    <svg
                      className="w-4 h-4 animate-spin"
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
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            </div>
            {error && (
              <div className="mt-3">
                <Alert variant="error" title="Request failed" description={error} />
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
