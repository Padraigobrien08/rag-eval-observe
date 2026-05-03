'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, ClipboardCopy, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { ChatMessage } from './types'
import { fetchQueryLogDetail, type QueryLogDetail } from '@/lib/api/client'

function copyText(label: string, value: string) {
  void navigator.clipboard.writeText(value).then(
    () => toast.success(`${label} copied`),
    () => toast.error('Could not copy')
  )
}

export default function MessageObservability({ message }: { message: ChatMessage }) {
  const meta = message.metadata ?? {}
  const streaming = meta.streaming === true

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [auditLoading, setAuditLoading] = useState(false)
  const [audit, setAudit] = useState<QueryLogDetail | null>(null)
  const [auditError, setAuditError] = useState<string | null>(null)

  useEffect(() => {
    if (!detailsOpen || !message.queryLogId) return
    let cancelled = false
    setAuditLoading(true)
    setAuditError(null)
    setAudit(null)
    void fetchQueryLogDetail(message.queryLogId)
      .then(row => {
        if (!cancelled) setAudit(row)
      })
      .catch(e => {
        if (!cancelled) {
          setAudit(null)
          setAuditError(e instanceof Error ? e.message : 'Failed to load audit row')
        }
      })
      .finally(() => {
        if (!cancelled) setAuditLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [detailsOpen, message.queryLogId])

  const tokenUsage = meta.token_usage as Record<string, number> | undefined
  const retrievedCount = meta.retrieved_chunk_count as number | undefined
  const debugRetrieved = (meta.debug as { retrieved?: unknown } | undefined)?.retrieved

  const hasObs =
    !streaming &&
    (!!message.requestId ||
      !!message.queryLogId ||
      !!message.evalRunId ||
      !!message.evalCaseId ||
      typeof retrievedCount === 'number' ||
      debugRetrieved != null ||
      (tokenUsage && typeof tokenUsage === 'object'))

  if (!hasObs) return null

  return (
    <details
      className="mt-2 max-w-3xl rounded-lg border border-slate-200/90 bg-slate-50/80 text-xs text-slate-700"
      onToggle={e => setDetailsOpen((e.target as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer select-none list-none px-3 py-2 font-medium text-slate-600 [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          Observability
        </span>
      </summary>
      <div className="space-y-3 border-t border-slate-200/80 px-3 py-3">
        {typeof retrievedCount === 'number' && (
          <p>
            <span className="text-slate-500">Chunks retrieved:</span> {retrievedCount}
          </p>
        )}
        {tokenUsage && Object.keys(tokenUsage).length > 0 && (
          <div>
            <p className="mb-1 text-slate-500">Token usage (message)</p>
            <ul className="font-mono text-[11px] text-slate-600">
              {Object.entries(tokenUsage).map(([k, v]) => (
                <li key={k}>
                  {k}: {v}
                </li>
              ))}
            </ul>
          </div>
        )}
        {message.requestId && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-500">Request ID</span>
            <code className="max-w-[min(100%,16rem)] truncate rounded bg-white px-1.5 py-0.5 text-[11px] text-slate-800 ring-1 ring-slate-200">
              {message.requestId}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-slate-600"
              onClick={() => copyText('Request ID', message.requestId!)}
            >
              <ClipboardCopy className="h-3 w-3" />
              Copy
            </Button>
          </div>
        )}
        {message.queryLogId && (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500">Query log ID</span>
              <code className="max-w-[min(100%,16rem)] truncate rounded bg-white px-1.5 py-0.5 text-[11px] text-slate-800 ring-1 ring-slate-200">
                {message.queryLogId}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-slate-600"
                onClick={() => copyText('Query log ID', message.queryLogId!)}
              >
                <ClipboardCopy className="h-3 w-3" />
                Copy
              </Button>
            </div>
            {detailsOpen && (
              <div className="rounded-md bg-white p-2 ring-1 ring-slate-200">
                {auditLoading && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading audit row…
                  </div>
                )}
                {auditError && <p className="text-red-600">{auditError}</p>}
                {audit && !auditLoading && (
                  <dl className="grid gap-1 text-[11px] text-slate-600">
                    <div>
                      <dt className="text-slate-400">Logged query</dt>
                      <dd className="mt-0.5 text-slate-800">{audit.query_text}</dd>
                    </div>
                    {audit.latency_ms != null && (
                      <div>
                        <dt className="text-slate-400">Audit latency</dt>
                        <dd>{audit.latency_ms}ms</dd>
                      </div>
                    )}
                    {audit.cost_usd != null && (
                      <div>
                        <dt className="text-slate-400">Audit cost</dt>
                        <dd>${audit.cost_usd.toFixed(6)}</dd>
                      </div>
                    )}
                    {audit.token_usage && Object.keys(audit.token_usage).length > 0 && (
                      <div>
                        <dt className="text-slate-400">Token usage (audit)</dt>
                        <dd className="font-mono">
                          {Object.entries(audit.token_usage)
                            .map(([k, v]) => `${k}=${v}`)
                            .join(', ')}
                        </dd>
                      </div>
                    )}
                    {audit.created_at && (
                      <div>
                        <dt className="text-slate-400">Logged at</dt>
                        <dd>{audit.created_at}</dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
            )}
          </div>
        )}
        {(message.evalRunId || message.evalCaseId) && (
          <div className="flex flex-wrap items-center gap-2">
            {message.evalCaseId && (
              <span className="text-slate-500">
                Eval case: <code className="text-slate-800">{message.evalCaseId}</code>
              </span>
            )}
            {message.evalRunId && (
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
                <Link href={`/eval/runs?id=${encodeURIComponent(message.evalRunId)}`}>
                  <ExternalLink className="h-3 w-3" />
                  Eval run
                </Link>
              </Button>
            )}
          </div>
        )}
        {debugRetrieved != null && (
          <details className="rounded-md bg-white ring-1 ring-slate-200">
            <summary className="cursor-pointer px-2 py-1.5 text-slate-600">
              Retrieved chunks (debug)
            </summary>
            <pre className="max-h-48 overflow-auto border-t border-slate-100 p-2 text-[10px] leading-relaxed text-slate-700">
              {JSON.stringify(debugRetrieved, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </details>
  )
}
