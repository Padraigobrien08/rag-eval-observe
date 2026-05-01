'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, RefreshCw, Clock, Activity, DollarSign, Database } from 'lucide-react'
import { getMetrics } from '@/lib/api/client'

interface RouteMetrics {
  request_count: number
  status_counts: Record<string, number>
  latency_buckets: Record<string, number>
  avg_latency_ms: number
  total_latency_ms: number
}

interface MetricsData {
  uptime_seconds: number
  routes: Record<string, RouteMetrics>
  token_usage: {
    embedding_prompt_tokens: number
    embedding_total_tokens: number
    chat_prompt_tokens: number
    chat_completion_tokens: number
    chat_total_tokens: number
  }
  note: string
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

function calculateCost(tokenUsage: {
  embedding_prompt_tokens?: number
  embedding_total_tokens?: number
  chat_prompt_tokens?: number
  chat_completion_tokens?: number
}): number {
  // OpenAI pricing (approximate)
  const embeddingCostPer1K = 0.00002 // $0.00002 per 1K tokens
  const chatPromptCostPer1K = 0.01 // $0.01 per 1K prompt tokens
  const chatCompletionCostPer1K = 0.03 // $0.03 per 1K completion tokens

  const embeddingCost = ((tokenUsage.embedding_total_tokens || 0) / 1000) * embeddingCostPer1K
  const chatPromptCost = ((tokenUsage.chat_prompt_tokens || 0) / 1000) * chatPromptCostPer1K
  const chatCompletionCost =
    ((tokenUsage.chat_completion_tokens || 0) / 1000) * chatCompletionCostPer1K

  return embeddingCost + chatPromptCost + chatCompletionCost
}

export default function MetricsPage() {
  const router = useRouter()
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const fetchMetrics = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getMetrics()
      setMetrics(data)
      setLastUpdated(new Date())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void fetchMetrics()
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      void fetchMetrics()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  if (isLoading && !metrics) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </div>
    )
  }

  if (error && !metrics) {
    return (
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-red-600">{error}</p>
            <Button onClick={() => void fetchMetrics()}>Retry</Button>
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) return null

  const queryRoute = metrics.routes['/api/v1/query'] || metrics.routes['/query']
  const totalRequests = Object.values(metrics.routes).reduce(
    (sum, route) => sum + route.request_count,
    0
  )
  const totalCost = calculateCost(metrics.token_usage)

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1
                className="font-bold text-slate-900"
                style={{
                  fontSize: 'clamp(24px, 2.8vw, 40px)',
                  lineHeight: '1.1',
                }}
              >
                System Metrics
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <Button onClick={() => void fetchMetrics()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <p className="text-xs text-slate-500 mb-6">
          Prometheus scrape (same in-memory counters): API{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
            /api/v1/metrics/prometheus
          </code>{' '}
          · via Next proxy{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">
            /api/backend/api/v1/metrics/prometheus
          </code>
        </p>

        {/* System Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <Clock className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div
                className="font-bold"
                style={{
                  fontSize: 'clamp(20px, 2.2vw, 32px)',
                  lineHeight: '1.2',
                }}
              >
                {formatUptime(metrics.uptime_seconds)}
              </div>
              <p className="text-xs text-slate-500 mt-1">System uptime</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Activity className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div
                className="font-bold"
                style={{
                  fontSize: 'clamp(20px, 2.2vw, 32px)',
                  lineHeight: '1.2',
                }}
              >
                {totalRequests.toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">Across all routes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div
                className="font-bold"
                style={{
                  fontSize: 'clamp(20px, 2.2vw, 32px)',
                  lineHeight: '1.2',
                }}
              >
                ${totalCost.toFixed(4)}
              </div>
              <p className="text-xs text-slate-500 mt-1">Estimated API costs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
              <Database className="h-4 w-4 text-slate-500" />
            </CardHeader>
            <CardContent>
              <div
                className="font-bold"
                style={{
                  fontSize: 'clamp(20px, 2.2vw, 32px)',
                  lineHeight: '1.2',
                }}
              >
                {(
                  metrics.token_usage.embedding_total_tokens + metrics.token_usage.chat_total_tokens
                ).toLocaleString()}
              </div>
              <p className="text-xs text-slate-500 mt-1">Embedding + Chat tokens</p>
            </CardContent>
          </Card>
        </div>

        {/* Query Route Metrics */}
        {queryRoute && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Query Performance</CardTitle>
                <CardDescription>RAG query endpoint metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Request Count</span>
                  <span className="text-lg font-semibold">
                    {queryRoute.request_count.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Average Latency</span>
                  <span className="text-lg font-semibold">
                    {queryRoute.avg_latency_ms.toFixed(2)}ms
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Total Latency</span>
                  <span className="text-lg font-semibold">
                    {queryRoute.total_latency_ms.toLocaleString()}ms
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Codes</CardTitle>
                <CardDescription>HTTP response status distribution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(queryRoute.status_counts).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          status.startsWith('2')
                            ? 'default'
                            : status.startsWith('4')
                              ? 'secondary'
                              : 'destructive'
                        }
                      >
                        {status}
                      </Badge>
                    </div>
                    <span className="text-sm font-medium">{count.toLocaleString()}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Latency Distribution */}
        {queryRoute && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Latency Distribution</CardTitle>
              <CardDescription>Query response time buckets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(queryRoute.latency_buckets).map(([bucket, count]) => {
                  const total = Object.values(queryRoute.latency_buckets).reduce((a, b) => a + b, 0)
                  const percentage = total > 0 ? (count / total) * 100 : 0
                  return (
                    <div key={bucket} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">{bucket}</span>
                        <span className="font-medium">
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Token Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Embedding Tokens</CardTitle>
              <CardDescription>Token usage for document embeddings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Prompt Tokens</span>
                <span className="text-lg font-semibold">
                  {metrics.token_usage.embedding_prompt_tokens.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Tokens</span>
                <span className="text-lg font-semibold">
                  {metrics.token_usage.embedding_total_tokens.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-slate-600">Estimated Cost</span>
                <span className="text-lg font-semibold">
                  ${((metrics.token_usage.embedding_total_tokens / 1000) * 0.00002).toFixed(4)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chat Tokens</CardTitle>
              <CardDescription>Token usage for chat completions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Prompt Tokens</span>
                <span className="text-lg font-semibold">
                  {metrics.token_usage.chat_prompt_tokens.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Completion Tokens</span>
                <span className="text-lg font-semibold">
                  {metrics.token_usage.chat_completion_tokens.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Total Tokens</span>
                <span className="text-lg font-semibold">
                  {metrics.token_usage.chat_total_tokens.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-sm text-slate-600">Estimated Cost</span>
                <span className="text-lg font-semibold">
                  $
                  {(
                    (metrics.token_usage.chat_prompt_tokens / 1000) * 0.01 +
                    (metrics.token_usage.chat_completion_tokens / 1000) * 0.03
                  ).toFixed(4)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* All Routes */}
        {Object.keys(metrics.routes).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>All Routes</CardTitle>
              <CardDescription>Metrics for all API endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(metrics.routes).map(([route, routeMetrics]) => (
                  <div key={route} className="border-b last:border-b-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-900">{route}</h3>
                      <Badge variant="outline">{routeMetrics.request_count} requests</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Avg Latency</span>
                        <div className="font-medium">
                          {routeMetrics.avg_latency_ms.toFixed(2)}ms
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Total Latency</span>
                        <div className="font-medium">
                          {routeMetrics.total_latency_ms.toLocaleString()}ms
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Success Rate</span>
                        <div className="font-medium">
                          {routeMetrics.request_count > 0
                            ? (
                                ((routeMetrics.status_counts['200'] || 0) /
                                  routeMetrics.request_count) *
                                100
                              ).toFixed(1)
                            : 0}
                          %
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-500">Status Codes</span>
                        <div className="flex gap-1 mt-1">
                          {Object.keys(routeMetrics.status_counts).map(status => (
                            <Badge key={status} variant="outline" className="text-xs">
                              {status}: {routeMetrics.status_counts[status]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Note */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">{metrics.note}</p>
        </div>
      </div>
    </div>
  )
}
