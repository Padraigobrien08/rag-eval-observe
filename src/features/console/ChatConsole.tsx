'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from '@/features/chat/useChat'
import type { IngestResponse } from '@/lib/api/types'
import Drawer from '@/components/Drawer'
import IngestForm from '@/features/ingest/IngestForm'
import { ToastContainer, type Toast } from '@/components/Toast'
import { ToastContainer as UIToastContainer, useToast } from '@/components/ui/Toast'
import UserMessage from '@/features/chat/UserMessage'
import AssistantMessage from '@/features/chat/AssistantMessage'
import EmptyState from '@/features/chat/EmptyState'
import LoadingSkeleton from '@/features/chat/LoadingSkeleton'
import { loadPlaygroundSettings } from '@/lib/storage/playgroundSettings'
import { copyTranscript, downloadTranscript } from '@/lib/utils/transcript'
import { health } from '@/lib/api/client'

interface ChatConsoleProps {
  settings?: {
    topK: number
    debug: boolean
    filterSource: string
    filterTitle: string
  }
  onIngestSuccess?: () => void
}

export default function ChatConsole({
  settings: propsSettings,
  onIngestSuccess,
}: ChatConsoleProps = {}) {
  const { messages, isLoading, error, sendMessage, resetChat, retryLastMessage } = useChat()
  const [inputText, setInputText] = useState('')
  
  // Use provided settings or load from localStorage
  const settings = propsSettings || loadPlaygroundSettings()
  const { topK, debug: debugMode, filterSource, filterTitle } = settings
  
  const [ingestDrawerOpen, setIngestDrawerOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set())
  const [connectionStatus, setConnectionStatus] = useState<{ ok: boolean; db?: boolean } | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Check connection status
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const healthData = await health()
        setConnectionStatus({ ok: healthData.ok, db: healthData.db })
      } catch (err) {
        setConnectionStatus({ ok: false, db: false })
      }
    }
    checkHealth()
    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isLoading) return

    const text = inputText.trim()
    setInputText('')

    await sendMessage(text, {
      topK,
      filters:
        filterSource || filterTitle
          ? {
              ...(filterSource && { source: filterSource }),
              ...(filterTitle && { title: filterTitle }),
            }
          : undefined,
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

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts(prev => [...prev, { ...toast, id }])
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  const handleIngestSuccess = (response: IngestResponse, source: string, title?: string) => {
    setIngestDrawerOpen(false)
    addToast({
      message: `Document ingested successfully! ${response.chunks_created} chunks created.`,
      type: 'success',
    })
    onIngestSuccess?.()
  }

  const handleUseAsFilter = (source: string, title?: string) => {
    setIngestDrawerOpen(false)
    // This will be handled by the parent layout
  }

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

  const handleCopyAnswer = (text: string) => {
    showToast('Answer copied to clipboard', 'success')
  }

  const handleIngestError = (error: { status?: number; message: string }) => {
    addToast({
      message: `Failed to ingest document: ${error.message}`,
      type: 'error',
    })
  }

  const { toasts: uiToasts, showToast, dismissToast } = useToast()

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      <UIToastContainer toasts={uiToasts} onDismiss={dismissToast} />
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
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
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

      {/* Chat Transcript */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {messages.length === 0 && !isLoading ? (
          <EmptyState onSelectPrompt={handleExamplePrompt} />
        ) : (
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {messages.map(message => {
              if (message.role === 'user') {
                return <UserMessage key={message.id} message={message} />
              } else {
                return (
                  <AssistantMessage
                    key={message.id}
                    message={message}
                    expandedCitations={expandedCitations}
                    onToggleCitation={toggleCitation}
                    debugMode={debugMode}
                    onRetry={retryLastMessage}
                    onCopyAnswer={handleCopyAnswer}
                  />
                )
              }
            })}
            {isLoading && <LoadingSkeleton />}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex items-end gap-2">
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Message RAG Eval..."
              disabled={isLoading}
              style={{ maxHeight: '200px' }}
              onInput={e => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = `${Math.min(target.scrollHeight, 200)}px`
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !inputText.trim()}
              className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        </form>
      </div>
    </>
  )
}

