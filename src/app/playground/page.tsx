'use client'

import { useState } from 'react'
import { queryRag } from '@/lib/api/client'
import type { QueryRequest, QueryResponse } from '@/lib/api/types'
import Nav from '@/components/Nav'

export default function PlaygroundPage() {
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(8)
  const [filterSource, setFilterSource] = useState('')
  const [filterTitle, setFilterTitle] = useState('')
  const [debugMode, setDebugMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [response, setResponse] = useState<QueryResponse | null>(null)
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(
    new Set()
  )
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const payload: QueryRequest = {
        query: query.trim(),
        top_k: topK,
        filters:
          filterSource || filterTitle
            ? {
                ...(filterSource && { source: filterSource }),
                ...(filterTitle && { title: filterTitle }),
              }
            : undefined,
        debug: debugMode,
      }

      const result = await queryRag(payload)
      setResponse(result)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred'
      )
    } finally {
      setLoading(false)
    }
  }

  const toggleCitation = (chunkId: string | undefined) => {
    if (!chunkId) return
    const newExpanded = new Set(expandedCitations)
    if (newExpanded.has(chunkId)) {
      newExpanded.delete(chunkId)
    } else {
      newExpanded.add(chunkId)
    }
    setExpandedCitations(newExpanded)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      if (!loading && query.trim()) {
        handleSubmit(e as any)
      }
    }
  }

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          RAG Playground
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Form */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4">
              <div>
                <label
                  htmlFor="query"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Query
                </label>
                <textarea
                  id="query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your question here... (Ctrl+Enter to submit)"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="topK"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Top K
                </label>
                <input
                  id="topK"
                  type="number"
                  min="1"
                  max="100"
                  value={topK}
                  onChange={(e) => setTopK(parseInt(e.target.value) || 8)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="border-t pt-4">
                <button
                  type="button"
                  onClick={() => setFiltersExpanded(!filtersExpanded)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <h3 className="text-sm font-medium text-gray-700">
                    Filters
                  </h3>
                  <svg
                    className={`w-5 h-5 text-gray-400 transform transition-transform ${
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
                  <div className="mt-3 space-y-3">
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
                        onChange={(e) => setFilterSource(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        onChange={(e) => setFilterTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  onChange={(e) => setDebugMode(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="debugMode"
                  className="ml-2 block text-sm text-gray-700"
                >
                  Debug mode
                </label>
              </div>

              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Querying...' : 'Submit Query'}
              </button>
            </form>
          </div>

          {/* Right Column: Results */}
          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-800 mb-1">
                  Error
                </h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">Processing query...</p>
              </div>
            )}

            {response && !loading && (
              <div className="space-y-6">
                {/* Answer */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">
                    Answer
                  </h2>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {response.answer}
                    </p>
                  </div>
                  {response.token_usage && (
                    <div className="mt-4 pt-4 border-t text-xs text-gray-500">
                      <span className="font-medium">Tokens:</span>{' '}
                      {response.token_usage.total_tokens} total (
                      {response.token_usage.prompt_tokens} prompt,{' '}
                      {response.token_usage.completion_tokens} completion) •{' '}
                      <span className="font-medium">Latency:</span>{' '}
                      {response.latency_ms}ms
                    </div>
                  )}
                </div>

                {/* Citations */}
                {response.citations.length > 0 ? (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      Citations ({response.citations.length})
                    </h2>
                    <div className="space-y-2">
                      {response.citations.map((citation, idx) => {
                        const citationKey = citation.chunk_id || `${citation.document_id}-${citation.chunk_index || idx}`
                        const isExpanded = expandedCitations.has(citationKey)
                        const debugChunk = citation.chunk_id
                          ? response.debug?.retrieved?.find(
                              (c) => c.chunk_id === citation.chunk_id
                            )
                          : undefined

                        return (
                          <div
                            key={citationKey}
                            className="border border-gray-200 rounded-md p-3"
                          >
                            <button
                              onClick={() => toggleCitation(citation.chunk_id)}
                              className="w-full text-left"
                              disabled={!citation.chunk_id && !debugChunk}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {citation.title || 'Untitled'}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {citation.source}
                                    {citation.chunk_index !== undefined && ` • Chunk ${citation.chunk_index}`}
                                  </div>
                                </div>
                                {(citation.chunk_id || debugChunk) && (
                                  <svg
                                    className={`w-5 h-5 text-gray-400 transform transition-transform ${
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
                            {isExpanded && debugChunk && (
                              <div className="mt-3 pt-3 border-t">
                                <div className="text-xs text-gray-600 mb-2">
                                  <span className="font-medium">Score:</span>{' '}
                                  {debugChunk.score.toFixed(4)}
                                </div>
                                <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                  {debugChunk.content_snippet}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      Citations
                    </h2>
                    <p className="text-sm text-gray-500">No citations found.</p>
                  </div>
                )}

                {/* Debug: Retrieved Chunks */}
                {debugMode && response.debug && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      Debug: Retrieved Chunks (
                      {response.debug.retrieved?.length || 0})
                    </h2>
                    <div className="space-y-3">
                      {(response.debug.retrieved || []).map((chunk, idx) => (
                        <div
                          key={chunk.chunk_id}
                          className="border border-gray-200 rounded-md p-3"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {chunk.title || 'Untitled'}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {chunk.source} • Chunk {chunk.chunk_index}
                              </div>
                            </div>
                            <div className="text-xs font-mono text-gray-600 ml-4">
                              Score: {chunk.score.toFixed(4)}
                            </div>
                          </div>
                          <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-2">
                            {chunk.content_snippet}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!response && !loading && !error && (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">Submit a query to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}

