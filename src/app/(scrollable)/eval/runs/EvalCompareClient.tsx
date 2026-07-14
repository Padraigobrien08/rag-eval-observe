'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, FlaskConical, Loader2, GitCompareArrows } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchEvalRunDetail, type EvalCaseResult, type EvalRunDetail } from '@/lib/api/client'
import { shortFetchError } from '@/lib/fetch-error'
import { cn } from '@/lib/utils'

type RowStatus =
  | 'same'
  | 'hit5-regressed'
  | 'hit5-improved'
  | 'mrr-down'
  | 'mrr-up'
  | 'only-a'
  | 'only-b'

type DiffRow = {
  caseId: string
  ca: EvalCaseResult | undefined
  cb: EvalCaseResult | undefined
  status: RowStatus
  dMrr: number | null
}

const MRR_EPS = 1e-6

function classifyRow(ca: EvalCaseResult | undefined, cb: EvalCaseResult | undefined): RowStatus {
  if (ca && !cb) return 'only-a'
  if (!ca && cb) return 'only-b'
  if (!ca || !cb) return 'same'
  if (ca.hit_at_5 && !cb.hit_at_5) return 'hit5-regressed'
  if (!ca.hit_at_5 && cb.hit_at_5) return 'hit5-improved'
  const d = cb.mrr - ca.mrr
  if (d < -MRR_EPS) return 'mrr-down'
  if (d > MRR_EPS) return 'mrr-up'
  return 'same'
}

/** Order: all case_ids from run A in order, then B-only ids — stable regression diff. */
function buildCaseIdAlignment(a: EvalRunDetail, b: EvalRunDetail) {
  const mapA = new Map(a.cases.map(c => [c.case_id, c]))
  const mapB = new Map(b.cases.map(c => [c.case_id, c]))
  const seen = new Set<string>()
  const order: string[] = []
  for (const c of [...a.cases, ...b.cases]) {
    if (!seen.has(c.case_id)) {
      seen.add(c.case_id)
      order.push(c.case_id)
    }
  }
  const rows: DiffRow[] = order.map(caseId => {
    const ca = mapA.get(caseId)
    const cb = mapB.get(caseId)
    return {
      caseId,
      ca,
      cb,
      status: classifyRow(ca, cb),
      dMrr: ca && cb ? cb.mrr - ca.mrr : null,
    }
  })
  const summary = {
    total: rows.length,
    unchanged: rows.filter(r => r.status === 'same').length,
    hit5Regressed: rows.filter(r => r.status === 'hit5-regressed').length,
    hit5Improved: rows.filter(r => r.status === 'hit5-improved').length,
    mrrDown: rows.filter(r => r.status === 'mrr-down').length,
    mrrUp: rows.filter(r => r.status === 'mrr-up').length,
    onlyA: rows.filter(r => r.status === 'only-a').length,
    onlyB: rows.filter(r => r.status === 'only-b').length,
  }
  const changed = summary.total - summary.unchanged
  return { rows, summary, changed, onlyA: summary.onlyA, onlyB: summary.onlyB }
}

const STATUS_META: Record<RowStatus, { label: string; badge: string; row: string }> = {
  same: { label: 'unchanged', badge: 'text-muted-foreground', row: '' },
  'hit5-regressed': {
    label: 'Hit@5 ↓',
    badge: 'text-rose-700 dark:text-rose-400',
    row: 'bg-rose-50/70 dark:bg-rose-950/30',
  },
  'hit5-improved': {
    label: 'Hit@5 ↑',
    badge: 'text-emerald-700 dark:text-emerald-400',
    row: 'bg-emerald-50/70 dark:bg-emerald-950/30',
  },
  'mrr-down': {
    label: 'MRR ↓',
    badge: 'text-amber-700 dark:text-amber-400',
    row: 'bg-amber-50/60 dark:bg-amber-950/20',
  },
  'mrr-up': {
    label: 'MRR ↑',
    badge: 'text-emerald-700 dark:text-emerald-400',
    row: 'bg-emerald-50/50 dark:bg-emerald-950/20',
  },
  'only-a': { label: 'A only', badge: 'text-muted-foreground', row: 'bg-muted/40' },
  'only-b': { label: 'B only', badge: 'text-muted-foreground', row: 'bg-muted/40' },
}

function miniMetric(label: string, a: number, b: number, asPct = false) {
  const fmt = (x: number) => (asPct ? `${(x * 100).toFixed(1)}%` : x.toFixed(3))
  const d = b - a
  const delta =
    Math.abs(d) < 1e-6 ? (
      <span className="text-muted-foreground">—</span>
    ) : d > 0 ? (
      <span className="text-emerald-700">+{asPct ? `${(d * 100).toFixed(1)}%` : d.toFixed(3)}</span>
    ) : (
      <span className="text-rose-700">{asPct ? `${(d * 100).toFixed(1)}%` : d.toFixed(3)}</span>
    )
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono tabular-nums text-foreground">
        <span title="Run A">{fmt(a)}</span>
        <span className="mx-1.5 text-muted-foreground">→</span>
        <span title="Run B">{fmt(b)}</span>
        <span className="ml-2 text-xs font-sans font-normal">{delta}</span>
      </p>
    </div>
  )
}

const CHIP_TONES: Record<string, string> = {
  muted: 'border-border bg-muted/50 text-muted-foreground',
  rose: 'border-rose-300/50 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  emerald:
    'border-emerald-300/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  amber: 'border-amber-300/50 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
}

function SummaryChip({ label, count, tone }: { label: string; count: number; tone: string }) {
  // Zero counts render muted so the meaningful buckets stand out.
  const cls = count === 0 ? CHIP_TONES.muted : (CHIP_TONES[tone] ?? CHIP_TONES.muted)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium',
        count === 0 && 'opacity-50',
        cls
      )}
    >
      <span className="tabular-nums">{count}</span>
      {label}
    </span>
  )
}

export default function EvalCompareClient({ runIdA, runIdB }: { runIdA: string; runIdB: string }) {
  const router = useRouter()
  const [a, setA] = useState<EvalRunDetail | null>(null)
  const [b, setB] = useState<EvalRunDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOnlyChanges, setShowOnlyChanges] = useState(true)

  useEffect(() => {
    if (!runIdA || !runIdB || runIdA === runIdB) {
      setLoading(false)
      setError(runIdA === runIdB ? 'Pick two different runs' : 'Missing run ids')
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const [da, db] = await Promise.all([fetchEvalRunDetail(runIdA), fetchEvalRunDetail(runIdB)])
        if (!cancelled) {
          setA(da)
          setB(db)
        }
      } catch (e) {
        const raw = e instanceof Error ? e.message : 'Failed to load runs'
        if (!cancelled) setError(shortFetchError(raw))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [runIdA, runIdB])

  const datasetMismatch =
    a && b && a.dataset_path !== b.dataset_path
      ? 'Different dataset paths — interpret diffs carefully; case ids may not be comparable.'
      : null

  const aligned = useMemo(() => (a && b ? buildCaseIdAlignment(a, b) : null), [a, b])

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted to-background pb-12 pt-6 md:pb-16 md:pt-8">
      <div className="mx-auto max-w-5xl space-y-8 px-4 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/eval/runs">
                <ArrowLeft className="mr-2 h-4 w-4" />
                All runs
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
              Chat
            </Button>
          </div>
          <div className="flex items-center gap-2 text-foreground">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-card shadow-sm ring-1 ring-border">
              <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">Compare eval runs</h1>
              <p className="text-xs text-muted-foreground">Run A → Run B</p>
            </div>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {a && b && !loading && (
          <>
            {datasetMismatch ? (
              <Alert>
                <AlertTitle>Heads up</AlertTitle>
                <AlertDescription>{datasetMismatch}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Badge variant="secondary">A</Badge>
                    <FlaskConical className="h-4 w-4 text-muted-foreground" />
                    Earlier / baseline
                  </CardTitle>
                  <CardDescription className="font-mono text-xs break-all">{a.id}</CardDescription>
                  <p className="text-xs text-muted-foreground">{a.created_at}</p>
                </CardHeader>
                <CardContent>
                  <Button variant="link" className="h-auto p-0 text-xs" asChild>
                    <Link href={`/eval/runs?id=${encodeURIComponent(a.id)}`}>Open run A</Link>
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Badge variant="secondary">B</Badge>
                    <FlaskConical className="h-4 w-4 text-muted-foreground" />
                    Later / candidate
                  </CardTitle>
                  <CardDescription className="font-mono text-xs break-all">{b.id}</CardDescription>
                  <p className="text-xs text-muted-foreground">{b.created_at}</p>
                </CardHeader>
                <CardContent>
                  <Button variant="link" className="h-auto p-0 text-xs" asChild>
                    <Link href={`/eval/runs?id=${encodeURIComponent(b.id)}`}>Open run B</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {miniMetric('Hit@1', a.hit_at_1, b.hit_at_1, true)}
              {miniMetric('Hit@5', a.hit_at_5, b.hit_at_5, true)}
              {miniMetric('MRR', a.mrr, b.mrr, false)}
            </div>

            {aligned ? (
              <Card>
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        Per-case diff (aligned by case id)
                      </CardTitle>
                      <CardDescription>
                        Rows join on{' '}
                        <code className="rounded bg-muted px-1 text-[11px]">case_id</code>. Showing{' '}
                        {showOnlyChanges ? 'changed cases only' : 'all cases'}.
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowOnlyChanges(v => !v)}
                      disabled={aligned.changed === 0 && !showOnlyChanges}
                    >
                      {showOnlyChanges ? `Show all ${aligned.summary.total}` : 'Show changes only'}
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    <SummaryChip label="unchanged" count={aligned.summary.unchanged} tone="muted" />
                    <SummaryChip
                      label="Hit@5 ↓"
                      count={aligned.summary.hit5Regressed}
                      tone="rose"
                    />
                    <SummaryChip
                      label="Hit@5 ↑"
                      count={aligned.summary.hit5Improved}
                      tone="emerald"
                    />
                    <SummaryChip label="MRR ↓" count={aligned.summary.mrrDown} tone="amber" />
                    <SummaryChip label="MRR ↑" count={aligned.summary.mrrUp} tone="emerald" />
                    <SummaryChip label="A only" count={aligned.onlyA} tone="muted" />
                    <SummaryChip label="B only" count={aligned.onlyB} tone="muted" />
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {(() => {
                    const visible = showOnlyChanges
                      ? aligned.rows.filter(r => r.status !== 'same')
                      : aligned.rows
                    if (visible.length === 0) {
                      return (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                          No per-case changes — both runs scored every case identically.
                        </p>
                      )
                    }
                    return (
                      <table className="w-full border-collapse text-sm">
                        <caption className="sr-only">
                          Eval case comparison keyed by case identifier
                        </caption>
                        <thead>
                          <tr className="border-b border-border text-left text-xs text-muted-foreground">
                            <th className="pb-2 pr-3 font-medium" scope="col">
                              Case id
                            </th>
                            <th className="pb-2 pr-3 font-medium" scope="col">
                              Hit@5 A→B
                            </th>
                            <th className="pb-2 pr-3 font-medium" scope="col">
                              MRR A→B
                            </th>
                            <th className="pb-2 pr-3 text-right font-medium" scope="col">
                              Δ MRR
                            </th>
                            <th className="pb-2 font-medium" scope="col">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {visible.map(row => {
                            const { ca, cb, caseId, status, dMrr } = row
                            const meta = STATUS_META[status]
                            const hitA = ca ? (ca.hit_at_5 ? 'yes' : 'no') : '—'
                            const hitB = cb ? (cb.hit_at_5 ? 'yes' : 'no') : '—'
                            return (
                              <tr
                                key={caseId}
                                className={cn('border-b border-border', meta.row)}
                                title={ca?.query || cb?.query || ''}
                              >
                                <td className="max-w-[14rem] truncate py-2 pr-3 font-mono text-xs">
                                  {caseId}
                                </td>
                                <td className="py-2 pr-3 font-mono text-xs">
                                  {hitA}
                                  <span className="mx-1 text-muted-foreground">→</span>
                                  {hitB}
                                </td>
                                <td className="py-2 pr-3 font-mono text-xs">
                                  {ca ? ca.mrr.toFixed(3) : '—'}
                                  <span className="mx-1 text-muted-foreground">→</span>
                                  {cb ? cb.mrr.toFixed(3) : '—'}
                                </td>
                                <td
                                  className={cn(
                                    'py-2 pr-3 text-right font-mono text-xs',
                                    dMrr != null &&
                                      dMrr < -MRR_EPS &&
                                      'text-rose-700 dark:text-rose-400',
                                    dMrr != null &&
                                      dMrr > MRR_EPS &&
                                      'text-emerald-700 dark:text-emerald-400'
                                  )}
                                >
                                  {dMrr == null
                                    ? '—'
                                    : Math.abs(dMrr) < MRR_EPS
                                      ? '—'
                                      : `${dMrr > 0 ? '+' : ''}${dMrr.toFixed(3)}`}
                                </td>
                                <td className={cn('py-2 text-xs font-medium', meta.badge)}>
                                  {meta.label}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )
                  })()}
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
