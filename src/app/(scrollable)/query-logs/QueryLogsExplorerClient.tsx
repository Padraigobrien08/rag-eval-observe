'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, RefreshCw, ScrollText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { fetchQueryLogsList, type QueryLogDetail } from '@/lib/api/client'
import { shortFetchError } from '@/lib/fetch-error'

export default function QueryLogsExplorerClient() {
  const router = useRouter()
  const [logs, setLogs] = useState<QueryLogDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ragModel, setRagModel] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<QueryLogDetail | null>(null)
  const limit = 40

  const load = useCallback(
    async (nextOffset: number) => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchQueryLogsList({
          limit,
          offset: nextOffset,
          rag_model: ragModel.trim() || undefined,
          start_date: startDate.trim() ? `${startDate.trim()}T00:00:00` : undefined,
          end_date: endDate.trim() ? `${endDate.trim()}T23:59:59` : undefined,
        })
        setLogs(data.logs)
        setOffset(nextOffset)
      } catch (e) {
        setError(shortFetchError(e instanceof Error ? e.message : 'Failed to load'))
      } finally {
        setLoading(false)
      }
    },
    [ragModel, startDate, endDate]
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchQueryLogsList({ limit, offset: 0 })
        if (!cancelled) {
          setLogs(data.logs)
          setOffset(0)
        }
      } catch (e) {
        if (!cancelled) setError(shortFetchError(e instanceof Error ? e.message : 'Failed to load'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const applyFilters = () => void load(0)

  return (
    <div className="min-h-screen bg-background pb-12 pt-6 md:pb-16 md:pt-8">
      <div className="mx-auto max-w-6xl space-y-6 px-4 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Chat
          </Button>
          <div className="flex items-center gap-2 text-foreground">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-card shadow-sm ring-1 ring-border">
              <ScrollText className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Query logs</h1>
              <p className="text-xs text-muted-foreground">Audit rows from the queries table</p>
            </div>
          </div>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>
              Optional filters; dates use server local midnight bounds.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
              RAG model
              <Input
                placeholder="e.g. vector-similarity"
                value={ragModel}
                onChange={e => setRagModel(e.target.value)}
                className="h-9"
              />
            </label>
            <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
              From (date)
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="h-9"
              />
            </label>
            <label className="flex min-w-[8rem] flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
              To (date)
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="h-9"
              />
            </label>
            <div className="flex gap-2">
              <Button type="button" onClick={applyFilters} disabled={loading}>
                Apply
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void load(offset)}
                disabled={loading}
              >
                <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading && logs.length === 0 ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : null}

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent queries</CardTitle>
            <CardDescription>Click a row for full detail.</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <caption className="sr-only">Query audit log entries</caption>
              <thead>
                <tr className="border-b border-border bg-background text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium" scope="col">
                    Time
                  </th>
                  <th className="px-3 py-2 font-medium" scope="col">
                    Model
                  </th>
                  <th className="px-3 py-2 font-medium" scope="col">
                    Latency
                  </th>
                  <th className="px-3 py-2 font-medium" scope="col">
                    Query
                  </th>
                  <th className="px-3 py-2 font-medium" scope="col">
                    Id
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr
                    key={log.id}
                    className="cursor-pointer border-b border-border hover:bg-muted"
                    onClick={() => setSelected(log)}
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                      {log.created_at ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-xs">{log.rag_model}</td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {log.latency_ms != null ? `${log.latency_ms} ms` : '—'}
                    </td>
                    <td className="max-w-md truncate px-3 py-2 text-xs text-foreground">
                      {log.query_text}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-muted-foreground">
                      {log.id.slice(0, 8)}…
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && !loading ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No rows match.</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || offset === 0}
            onClick={() => void load(Math.max(0, offset - limit))}
          >
            Previous page
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || logs.length < limit}
            onClick={() => void load(offset + limit)}
          >
            Next page
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Chat observability uses the same rows via{' '}
          <code className="rounded bg-muted px-1">query_log_id</code>.{' '}
          <Link href="/eval/runs" className="text-foreground underline-offset-2 hover:underline">
            Eval runs
          </Link>
        </p>
      </div>

      <Dialog open={selected != null} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Query log</DialogTitle>
          </DialogHeader>
          {selected ? (
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Id</dt>
                <dd className="font-mono text-xs break-all">{selected.id}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Query</dt>
                <dd className="whitespace-pre-wrap text-foreground">{selected.query_text}</dd>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <dt className="text-xs text-muted-foreground">RAG model</dt>
                  <dd>{selected.rag_model}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Latency</dt>
                  <dd>{selected.latency_ms != null ? `${selected.latency_ms} ms` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Request id</dt>
                  <dd className="font-mono text-xs break-all">{selected.request_id ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Created</dt>
                  <dd className="text-xs">{selected.created_at ?? '—'}</dd>
                </div>
              </div>
              {selected.token_usage && Object.keys(selected.token_usage).length > 0 ? (
                <div>
                  <dt className="text-xs text-muted-foreground">Token usage</dt>
                  <dd>
                    <pre className="mt-1 max-h-32 overflow-auto rounded border bg-background p-2 text-xs">
                      {JSON.stringify(selected.token_usage, null, 2)}
                    </pre>
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
