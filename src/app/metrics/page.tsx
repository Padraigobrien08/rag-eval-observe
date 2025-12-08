'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchMetrics } from '@/lib/api/client'
import type { MetricsResponse } from '@/lib/api/types'
import Nav from '@/components/Nav'

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadMetrics = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchMetrics()
      setMetrics(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load metrics'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial load
    loadMetrics()

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      loadMetrics()
    }, 10000)

    return () => clearInterval(interval)
  }, [loadMetrics])

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  const formatNumber = (num: number): string => {
    return num.toLocaleString()
  }

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Metrics</h1>
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={loadMetrics}
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-red-800 mb-1">Error</h3>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {loading && !metrics && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading metrics...</p>
          </div>
        )}

        {metrics && (
          <div className="space-y-6">
            {/* System Info */}
            {metrics.uptime_seconds !== undefined && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  System Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Uptime</span>
                    <p className="text-lg font-medium text-gray-900">
                      {formatUptime(metrics.uptime_seconds)}
                    </p>
                  </div>
                  {metrics.note && (
                    <div>
                      <span className="text-sm text-gray-500">Note</span>
                      <p className="text-sm text-gray-700">{metrics.note}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Requests by Route/Status */}
            {metrics.routes && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Requests by Route
                </h2>
                {Object.keys(metrics.routes).length === 0 ? (
                  <p className="text-sm text-gray-500">No requests recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Route
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Requests
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Avg Latency
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status Codes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(metrics.routes).map(([route, routeMetrics]: [string, any]) => (
                          <tr key={route}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <code className="text-sm font-mono text-gray-900">
                                {route}
                              </code>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                              {formatNumber(routeMetrics.request_count || 0)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                              {(routeMetrics.avg_latency_ms || 0).toFixed(2)}ms
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              <div className="flex flex-wrap gap-1 justify-end">
                                {routeMetrics.status_counts &&
                                  Object.entries(routeMetrics.status_counts).map(
                                    ([status, count]: [string, any]) => (
                                      <span
                                        key={status}
                                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                          status.startsWith('2')
                                            ? 'bg-green-100 text-green-800'
                                            : status.startsWith('4')
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : status.startsWith('5')
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}
                                      >
                                        {status}: {formatNumber(count)}
                                      </span>
                                    )
                                  )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Latency Summary */}
            {metrics.routes && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Latency Summary
                </h2>
                {Object.keys(metrics.routes).length === 0 ? (
                  <p className="text-sm text-gray-500">No latency data available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Route
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            &lt;100ms
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            100-500ms
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            500ms-1s
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            1s-5s
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            &gt;5s
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Avg
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(metrics.routes).map(([route, routeMetrics]: [string, any]) => (
                          <tr key={route}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <code className="text-sm font-mono text-gray-900">
                                {route}
                              </code>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                              {formatNumber((routeMetrics.latency_buckets?.['<100ms']) || 0)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                              {formatNumber((routeMetrics.latency_buckets?.['100-500ms']) || 0)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                              {formatNumber((routeMetrics.latency_buckets?.['500ms-1s']) || 0)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                              {formatNumber((routeMetrics.latency_buckets?.['1s-5s']) || 0)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                              {formatNumber((routeMetrics.latency_buckets?.['>5s']) || 0)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                              {(routeMetrics.avg_latency_ms || 0).toFixed(2)}ms
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Token Usage */}
            {metrics.token_usage && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Token Usage
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Embedding Tokens */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Embedding Tokens
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Prompt Tokens</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatNumber(metrics.token_usage.embedding_prompt_tokens || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Tokens</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatNumber(metrics.token_usage.embedding_total_tokens || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Chat Tokens */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">
                      Chat Tokens
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Prompt Tokens</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatNumber(metrics.token_usage.chat_prompt_tokens || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Completion Tokens</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatNumber(metrics.token_usage.chat_completion_tokens || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-sm font-medium text-gray-700">
                          Total Tokens
                        </span>
                        <span className="text-sm font-bold text-gray-900">
                          {formatNumber(metrics.token_usage.chat_total_tokens || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-gray-900">
                      Grand Total (All Tokens)
                    </span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatNumber(
                        (metrics.token_usage.embedding_total_tokens || 0) +
                          (metrics.token_usage.chat_total_tokens || 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    </>
  )
}

