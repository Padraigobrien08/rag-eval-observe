'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { health } from '@/lib/api/client'
import type { HealthResponse } from '@/lib/api/types'
import Nav from '@/components/Nav'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

export default function Home() {
  const [healthStatus, setHealthStatus] = useState<{
    connected: boolean
    loading: boolean
    error: string | null
    data: HealthResponse | null
  }>({
    connected: false,
    loading: true,
    error: null,
    data: null,
  })

  useEffect(() => {
    const checkHealth = async () => {
      try {
        setHealthStatus((prev) => ({ ...prev, loading: true, error: null }))
        const data = await health()
        setHealthStatus({
          connected: data.ok && data.db === true,
          loading: false,
          error: null,
          data: {
            status: data.ok ? 'healthy' : 'unhealthy',
            database: data.db ? 'connected' : 'disconnected',
            version: data.version || '0.1.0',
          },
        })
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : typeof err === 'object' && err !== null && 'message' in err
            ? String(err.message)
            : 'Unknown error'
        setHealthStatus({
          connected: false,
          loading: false,
          error: errorMessage,
          data: null,
        })
      }
    }

    checkHealth()
    // Refresh health status every 30 seconds
    const interval = setInterval(checkHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              RAG Eval Observability
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Evaluate and monitor your Retrieval-Augmented Generation system
            </p>

            {/* Backend Health Status */}
            <div className="inline-flex items-center gap-3 bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4 mb-8">
              <div className="flex items-center gap-2">
                <div
                  className={`h-3 w-3 rounded-full ${
                    healthStatus.loading
                      ? 'bg-yellow-400 animate-pulse'
                      : healthStatus.connected
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}
                />
                <span className="text-sm font-medium text-gray-700">
                  {healthStatus.loading
                    ? 'Checking...'
                    : healthStatus.connected
                    ? 'Connected'
                    : 'Not connected'}
                </span>
              </div>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500 font-mono">{API_BASE_URL}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/playground"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-4">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Playground
              </h2>
              <p className="text-sm text-gray-600">
                Test queries against your RAG system and explore retrieved chunks
                and citations
              </p>
            </Link>

            <Link
              href="/ingest"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-4">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Ingest
              </h2>
              <p className="text-sm text-gray-600">
                Add new documents to your knowledge base. Chunk, embed, and index
                content for retrieval
              </p>
            </Link>

            <Link
              href="/metrics"
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mb-4">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Metrics
              </h2>
              <p className="text-sm text-gray-600">
                Monitor system performance, request metrics, latency, and token
                usage in real-time
              </p>
            </Link>
          </div>

          {/* Additional Info */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              Built for evaluating and observing RAG systems with PostgreSQL +
              pgvector
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
