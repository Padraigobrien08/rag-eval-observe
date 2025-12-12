'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchMetrics } from '@/lib/api/client'
import type { MetricsResponse } from '@/lib/api/types'
import Nav from '@/components/Nav'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const loadMetrics = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchMetrics()
      setMetrics(data)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial load
    loadMetrics()

    if (!autoRefresh) return

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      loadMetrics()
    }, 10000)

    return () => clearInterval(interval)
  }, [loadMetrics, autoRefresh])

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
      <div className="min-h-screen bg-neutral-50/50 py-8">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Metrics</h1>
            <p className="text-sm text-gray-500 mt-1">Monitor RAG performance and usage.</p>
          </div>

          {error && (
            <Card variant="outlined" padding="md" className="bg-red-50 border-red-200">
              <h3 className="text-sm font-medium text-red-800 mb-1">Error</h3>
              <p className="text-sm text-red-600">{error}</p>
            </Card>
          )}

          {loading && !metrics && (
            <Card variant="outlined" padding="lg" className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading metrics...</p>
            </Card>
          )}

          {metrics && (
            <div className="space-y-6">
              {/* System Info */}
              {metrics.uptime_seconds !== undefined && (
                <Card variant="outlined" padding="md" radius="lg">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-sm font-semibold">System Information</CardTitle>
                    <div className="flex items-center gap-3">
                      {lastUpdated && (
                        <span className="text-xs text-gray-500">
                          {lastUpdated.toLocaleTimeString()}
                        </span>
                      )}
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoRefresh}
                          onChange={e => setAutoRefresh(e.target.checked)}
                          className="sr-only"
                        />
                        <div
                          className={`w-9 h-5 rounded-full transition-colors ${
                            autoRefresh ? 'bg-blue-600' : 'bg-gray-300'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform mt-0.5 ${
                              autoRefresh ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                          />
                        </div>
                        <span className="text-xs text-gray-600">Auto-refresh</span>
                      </label>
                      <button
                        onClick={loadMetrics}
                        disabled={loading}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {loading ? 'Refreshing...' : 'Refresh'}
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
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
                  </CardContent>
                </Card>
              )}

              {/* Requests by Route/Status */}
              {metrics.routes && (
                <Card variant="outlined" padding="md" radius="lg">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Requests by Route</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(metrics.routes).length === 0 ? (
                      <p className="text-sm text-gray-500">No requests recorded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(metrics.routes).map(
                          ([route, routeMetrics]: [string, any]) => (
                            <div
                              key={route}
                              className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0"
                            >
                              {/* Route Name - Left */}
                              <div className="flex-1 min-w-0">
                                <code className="text-sm font-mono text-gray-900">{route}</code>
                              </div>
                              {/* Total Requests - Middle */}
                              <div className="text-sm font-medium text-gray-900 w-24 text-right">
                                {formatNumber(routeMetrics.request_count || 0)}
                              </div>
                              {/* Status Codes - Right (Stacked Green Pills) */}
                              <div className="flex flex-col gap-1 items-end">
                                {routeMetrics.status_counts &&
                                  Object.entries(routeMetrics.status_counts).map(
                                    ([status, count]: [string, any]) => (
                                      <span
                                        key={status}
                                        className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium"
                                      >
                                        {status}: {formatNumber(count)}
                                      </span>
                                    )
                                  )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Latency Summary */}
              {metrics.routes && (
                <Card variant="outlined" padding="md" radius="lg">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Latency Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {Object.keys(metrics.routes).length === 0 ? (
                      <p className="text-sm text-gray-500">No latency data available.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Route
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                &lt;100ms
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                100-500ms
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                500ms-1s
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                1s-5s
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                &gt;5s
                              </th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                Avg
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {Object.entries(metrics.routes).map(
                              ([route, routeMetrics]: [string, any]) => {
                                const over5s = routeMetrics.latency_buckets?.['>5s'] || 0
                                const hasWarning = over5s > 0
                                return (
                                  <tr key={route}>
                                    <td className="px-3 py-2">
                                      <code className="text-sm font-mono text-gray-900">
                                        {route}
                                      </code>
                                    </td>
                                    <td className="px-3 py-2 text-right text-sm text-gray-900">
                                      {formatNumber(routeMetrics.latency_buckets?.['<100ms'] || 0)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-sm text-gray-900">
                                      {formatNumber(
                                        routeMetrics.latency_buckets?.['100-500ms'] || 0
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right text-sm text-gray-900">
                                      {formatNumber(
                                        routeMetrics.latency_buckets?.['500ms-1s'] || 0
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right text-sm text-gray-900">
                                      {formatNumber(routeMetrics.latency_buckets?.['1s-5s'] || 0)}
                                    </td>
                                    <td
                                      className={`px-3 py-2 text-right text-sm font-medium ${
                                        hasWarning
                                          ? 'text-yellow-700 bg-yellow-50'
                                          : 'text-gray-900'
                                      }`}
                                    >
                                      {formatNumber(over5s)}
                                    </td>
                                    <td className="px-3 py-2 text-right text-sm font-medium text-gray-900">
                                      {(routeMetrics.avg_latency_ms || 0).toFixed(2)}ms
                                    </td>
                                  </tr>
                                )
                              }
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Token Usage */}
              {metrics.token_usage && (
                <Card variant="outlined" padding="md" radius="lg">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">Token Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Embedding Tokens */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Embedding Tokens</h3>
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
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Chat Tokens</h3>
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
                            <span className="text-sm font-medium text-gray-700">Total Tokens</span>
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
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
