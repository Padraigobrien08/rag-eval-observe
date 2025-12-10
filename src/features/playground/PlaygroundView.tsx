'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from '@/features/chat/useChat'
import type { IngestResponse } from '@/lib/api/types'
import Drawer from '@/components/Drawer'
import IngestForm from '@/features/ingest/IngestForm'
import { ToastContainer, type Toast } from '@/components/Toast'
import UserMessage from '@/features/chat/UserMessage'
import AssistantMessage from '@/features/chat/AssistantMessage'

export default function PlaygroundView() {
  const router = useRouter()
  const { messages, isLoading, error, sendMessage, resetChat } = useChat()
  const [inputText, setInputText] = useState('')
  const [topK, setTopK] = useState(8)
  const [filterSource, setFilterSource] = useState('')
  const [filterTitle, setFilterTitle] = useState('')
  const [debugMode, setDebugMode] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const [ingestDrawerOpen, setIngestDrawerOpen] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set())
  const chatEndRef = useRef<HTMLDivElement>(null)

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
      action: {
        label: 'Use as filter',
        onClick: () => {
          setFilterSource(source)
          if (title) {
            setFilterTitle(title)
          }
          if (!filtersExpanded) {
            setFiltersExpanded(true)
          }
        },
      },
    })
  }

  const handleIngestError = (error: { status?: number; message: string }) => {
    addToast({
      message: `Failed to ingest document: ${error.message}`,
      type: 'error',
    })
  }

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
      <Drawer
        isOpen={ingestDrawerOpen}
        onClose={() => setIngestDrawerOpen(false)}
        title="Ingest Document"
      >
        <IngestForm
          onSuccess={handleIngestSuccess}
          onError={handleIngestError}
          showSampleButton={process.env.NODE_ENV === 'development'}
        />
      </Drawer>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">RAG Playground</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={resetChat}
                disabled={messages.length === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                New Chat
              </button>
              <button
                onClick={() => setIngestDrawerOpen(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Ingest
              </button>
              <button
                onClick={() => router.push('/metrics')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                Metrics
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Input + Settings */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Settings */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="topK" className="block text-sm font-medium text-gray-700 mb-2">
                    Top K
                  </label>
                  <input
                    id="topK"
                    type="number"
                    min="1"
                    max="100"
                    value={topK}
                    onChange={e => setTopK(parseInt(e.target.value) || 8)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="border-t pt-4">
                  <button
                    type="button"
                    onClick={() => setFiltersExpanded(!filtersExpanded)}
                    className="flex items-center justify-between w-full text-left mb-3"
                  >
                    <h3 className="text-sm font-medium text-gray-700">Filters</h3>
                    <svg
                      className={`w-4 h-4 text-gray-400 transform transition-transform ${
                        filtersExpanded ? 'rotate-180' : ''
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
                  {filtersExpanded && (
                    <div className="space-y-3">
                      <div>
                        <label
                          htmlFor="filterSource"
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Source
                        </label>
                        <input
                          id="filterSource"
                          type="text"
                          value={filterSource}
                          onChange={e => setFilterSource(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Filter by source..."
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="filterTitle"
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Title
                        </label>
                        <input
                          id="filterTitle"
                          type="text"
                          value={filterTitle}
                          onChange={e => setFilterTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          placeholder="Filter by title..."
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center">
                  <input
                    id="debugMode"
                    type="checkbox"
                    checked={debugMode}
                    onChange={e => setDebugMode(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="debugMode" className="ml-2 block text-sm text-gray-700">
                    Debug mode
                  </label>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-200 p-4">
              <form onSubmit={handleSubmit} className="space-y-2">
                <textarea
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Enter your question here... (Ctrl+Enter to send)"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !inputText.trim()}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Sending...' : 'Send'}
                </button>
              </form>
              {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
            </div>
          </div>

          {/* Right Panel: Chat Transcript */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-gray-500 text-lg mb-2">Start a conversation</p>
                    <p className="text-gray-400 text-sm">Ask questions about your documents</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto space-y-6">
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
                        />
                      )
                    }
                  })}
                  {isLoading && (
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <div className="flex-1">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <p className="text-gray-500 text-sm">Thinking...</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
