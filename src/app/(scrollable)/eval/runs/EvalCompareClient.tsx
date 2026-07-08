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

/** Order: all case_ids from run A in order, then B-only ids — stable regression diff. */
function buildCaseIdAlignment(a: EvalRunDetail, b: EvalRunDetail) {
  const mapA = new Map(a.cases.map(c => [c.case_id, c]))
  const mapB = new Map(b.cases.map(c => [c.case_id, c]))
  const seen = new Set<string>()
  const order: string[] = []
  for (const c of a.cases) {
    if (!seen.has(c.case_id)) {
      seen.add(c.case_id)
      order.push(c.case_id)
    }
  }
  for (const c of b.cases) {
    if (!seen.has(c.case_id)) {
      seen.add(c.case_id)
      order.push(c.case_id)
    }
  }
  const rows: { caseId: string; ca: EvalCaseResult | undefined; cb: EvalCaseResult | undefined }[] =
    order.map(caseId => ({
      caseId,
      ca: mapA.get(caseId),
      cb: mapB.get(caseId),
    }))
  const onlyA = rows.filter(r => r.ca && !r.cb).length
  const onlyB = rows.filter(r => !r.ca && r.cb).length
  return { rows, onlyA, onlyB }
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

export default function EvalCompareClient({ runIdA, runIdB }: { runIdA: string; runIdB: string }) {
  const router = useRouter()
  const [a, setA] = useState<EvalRunDetail | null>(null)
  const [b, setB] = useState<EvalRunDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
                <CardHeader>
                  <CardTitle className="text-base">Per-case @5 (aligned by case id)</CardTitle>
                  <CardDescription>
                    Rows join on <code className="rounded bg-muted px-1 text-[11px]">case_id</code>.
                    Run A-only: {aligned.onlyA}, run B-only: {aligned.onlyB}. Amber rows: Hit@5
                    changed when both sides exist.
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <caption className="sr-only">
                      Eval case comparison keyed by case identifier
                    </caption>
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="pb-2 pr-3 font-medium" scope="col">
                          #
                        </th>
                        <th className="pb-2 pr-3 font-medium" scope="col">
                          Case id
                        </th>
                        <th className="pb-2 pr-3 font-medium" scope="col">
                          Hit@5 A
                        </th>
                        <th className="pb-2 pr-3 font-medium" scope="col">
                          Hit@5 B
                        </th>
                        <th className="pb-2 pr-3 font-medium" scope="col">
                          MRR A
                        </th>
                        <th className="pb-2 font-medium" scope="col">
                          MRR B
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {aligned.rows.map((row, i) => {
                        const { ca, cb, caseId } = row
                        const partial = (ca && !cb) || (!ca && cb)
                        const hitFlip =
                          ca && cb && ca.hit_at_5 !== cb.hit_at_5 ? 'bg-amber-50/80' : ''
                        return (
                          <tr
                            key={caseId}
                            className={cn(
                              'border-b border-border',
                              hitFlip,
                              partial ? 'bg-background' : ''
                            )}
                          >
                            <td className="py-2 pr-3 font-mono text-xs">{i + 1}</td>
                            <td className="max-w-[14rem] truncate py-2 pr-3 font-mono text-xs">
                              {caseId}
                            </td>
                            <td className="py-2 pr-3">{ca ? (ca.hit_at_5 ? 'yes' : 'no') : '—'}</td>
                            <td className="py-2 pr-3">{cb ? (cb.hit_at_5 ? 'yes' : 'no') : '—'}</td>
                            <td className="py-2 pr-3 font-mono text-xs">
                              {ca ? ca.mrr.toFixed(3) : '—'}
                            </td>
                            <td className="py-2 font-mono text-xs">
                              {cb ? cb.mrr.toFixed(3) : '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
