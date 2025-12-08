'use client'

import { useState } from 'react'
import { ingestDoc } from '@/lib/api/client'
import type { IngestRequest, IngestResponse } from '@/lib/api/types'
import Nav from '@/components/Nav'

// Backend constraints (aligned with backend/app/core/config.py)
const MAX_INGEST_PAYLOAD_SIZE = 10 * 1024 * 1024 // 10MB (10,485,760 chars)

// Sample document for dev mode
const SAMPLE_DOCUMENT = {
  source: 'sample-doc-001',
  title: 'Introduction to RAG Systems',
  text: `# Introduction to Retrieval-Augmented Generation (RAG)

Retrieval-Augmented Generation, or RAG, is a technique that enhances large language models (LLMs) by providing them with access to external knowledge sources.

## How RAG Works

RAG systems typically follow these steps:

1. **Document Ingestion**: Documents are broken down into smaller chunks and embedded into a vector database.
2. **Query Processing**: When a user asks a question, the system:
   - Embeds the query into the same vector space
   - Retrieves the most relevant document chunks using similarity search
   - Passes the retrieved context along with the query to the LLM
3. **Answer Generation**: The LLM generates an answer based on both the retrieved context and its training data.

## Benefits

- **Up-to-date Information**: RAG allows LLMs to access information that wasn't in their training data.
- **Source Attribution**: Answers can be traced back to specific documents.
- **Reduced Hallucination**: By grounding responses in retrieved documents, RAG reduces the likelihood of generating incorrect information.

## Use Cases

RAG is particularly useful for:
- Question answering over private document collections
- Building chatbots with domain-specific knowledge
- Creating AI assistants that can reference documentation
- Implementing semantic search systems

This is a sample document used for testing the ingestion system.`,
}

export default function IngestPage() {
  const [source, setSource] = useState('')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<{ status?: number; message: string } | null>(
    null
  )
  const [response, setResponse] = useState<IngestResponse | null>(null)

  const validateForm = (): string | null => {
    if (!source.trim()) {
      return 'Source is required'
    }
    if (!text.trim()) {
      return 'Text content is required'
    }
    if (text.length > MAX_INGEST_PAYLOAD_SIZE) {
      return `Text exceeds maximum size of ${MAX_INGEST_PAYLOAD_SIZE.toLocaleString()} characters (current: ${text.length.toLocaleString()})`
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResponse(null)

    const validationError = validateForm()
    if (validationError) {
      setError({ message: validationError })
      return
    }

    setLoading(true)

    try {
      const payload: IngestRequest = {
        source: source.trim(),
        title: title.trim() || undefined,
        text: text.trim(),
        is_markdown: text.includes('#') || text.includes('*') || text.includes('`'),
      }

      const result = await ingestDoc(payload)
      setResponse(result)
      
      // Clear form on success
      setSource('')
      setTitle('')
      setText('')
    } catch (err) {
      // Parse error response
      let errorMessage = 'An unknown error occurred'
      let statusCode: number | undefined

      if (err instanceof Error) {
        errorMessage = err.message
        
        // Try to extract status code from error message
        const statusMatch = errorMessage.match(/HTTP (\d+)/)
        if (statusMatch) {
          statusCode = parseInt(statusMatch[1])
        }
      }

      setError({
        status: statusCode,
        message: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLoadSample = () => {
    setSource(SAMPLE_DOCUMENT.source)
    setTitle(SAMPLE_DOCUMENT.title)
    setText(SAMPLE_DOCUMENT.text)
    setError(null)
    setResponse(null)
  }

  const characterCount = text.length
  const WARNING_THRESHOLD = 100000 // 100k chars - early warning
  const isOverWarning = characterCount > WARNING_THRESHOLD
  const isNearLimit = characterCount > MAX_INGEST_PAYLOAD_SIZE * 0.9
  const isOverLimit = characterCount > MAX_INGEST_PAYLOAD_SIZE

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Ingest Document
        </h1>

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="source"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Source <span className="text-red-500">*</span>
              </label>
              <input
                id="source"
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., doc-001, article-2024-01"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Unique identifier for the document source
              </p>
            </div>

            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Title (optional)
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Document title"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="text"
                  className="block text-sm font-medium text-gray-700"
                >
                  Text Content <span className="text-red-500">*</span>
                </label>
                <div className="text-xs text-gray-500">
                  <span
                    className={
                      isOverLimit
                        ? 'text-red-600 font-medium'
                        : isNearLimit
                        ? 'text-yellow-600'
                        : isOverWarning
                        ? 'text-orange-600'
                        : ''
                    }
                  >
                    {characterCount.toLocaleString()} /{' '}
                    {MAX_INGEST_PAYLOAD_SIZE.toLocaleString()} characters
                    {isOverWarning && !isNearLimit && (
                      <span className="ml-2">(Large document)</span>
                    )}
                  </span>
                </div>
              </div>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={20}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${
                  isOverLimit
                    ? 'border-red-300 bg-red-50'
                    : isNearLimit
                    ? 'border-yellow-300 bg-yellow-50'
                    : isOverWarning
                    ? 'border-orange-200 bg-orange-50'
                    : 'border-gray-300'
                }`}
                placeholder="Enter document text content here..."
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum size: {MAX_INGEST_PAYLOAD_SIZE.toLocaleString()} characters
                {isOverLimit && (
                  <span className="text-red-600 font-medium ml-2">
                    (Exceeds limit)
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-4 pt-4 border-t">
              <button
                type="submit"
                disabled={loading || isOverLimit || !source.trim() || !text.trim()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Ingesting...' : 'Ingest Document'}
              </button>

              {process.env.NODE_ENV === 'development' && (
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Load Sample
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800 mb-1">
                  {error.status ? `Error ${error.status}` : 'Error'}
                </h3>
                <p className="text-sm text-red-600">{error.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Response */}
        {response && !loading && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-green-800 mb-2">
                  Document Ingested Successfully
                </h3>
                <div className="text-sm text-green-700 space-y-1">
                  <p>
                    <span className="font-medium">Document ID:</span>{' '}
                    <code className="bg-green-100 px-2 py-1 rounded text-xs font-mono">
                      {response.document_id}
                    </code>
                  </p>
                  <p>
                    <span className="font-medium">Chunks Created:</span>{' '}
                    {response.chunks_created}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  )
}

