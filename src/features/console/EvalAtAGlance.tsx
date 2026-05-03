'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ClipboardCopy, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchEvalRunsList } from '@/lib/api/client'
import { RERUN_EVAL_COMMAND } from '@/lib/eval-harness'
import { toast } from 'sonner'

export function EvalAtAGlance() {
  const [hit5, setHit5] = useState<number | null>(null)
  const [runId, setRunId] = useState<string | null>(null)
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { runs } = await fetchEvalRunsList({ limit: 1 })
        if (cancelled) return
        const r = runs[0]
        if (r) {
          setHit5(r.hit_at_5)
          setRunId(r.id)
          setCreatedAt(r.created_at)
        }
      } catch {
        /* non-fatal */
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const copyRerun = async () => {
    try {
      await navigator.clipboard.writeText(RERUN_EVAL_COMMAND)
      toast.success('Re-run command copied')
    } catch {
      toast.error('Could not copy')
    }
  }

  if (!loaded) return null

  return (
    <div className="shrink-0 border-b border-slate-200/90 bg-white/70 px-3 py-2 md:px-4">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center md:justify-between md:text-left">
        {runId ? (
          <>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600 md:justify-start">
              <FlaskConical className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span>
                Latest eval{' '}
                <strong className="font-mono text-slate-800">
                  Hit@5 {(hit5! * 100).toFixed(0)}%
                </strong>
                {createdAt ? (
                  <>
                    {' '}
                    <span className="text-slate-400">·</span> {createdAt}
                  </>
                ) : null}
              </span>
              <Button variant="link" className="h-auto p-0 text-xs" asChild>
                <Link href={`/eval/runs?id=${encodeURIComponent(runId)}`}>Open run</Link>
              </Button>
              <span className="hidden text-slate-300 sm:inline">·</span>
              <Button variant="link" className="h-auto p-0 text-xs" asChild>
                <Link href="/eval/runs">All runs</Link>
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={() => void copyRerun()}
            >
              <ClipboardCopy className="h-3 w-3" />
              Copy re-run command
            </Button>
          </>
        ) : (
          <p className="w-full text-center text-xs text-slate-500 md:text-left">
            No persisted eval runs yet.{' '}
            <Link
              href="/eval/runs"
              className="font-medium text-slate-700 underline-offset-2 hover:underline"
            >
              Eval runs
            </Link>
            {' · '}
            <button
              type="button"
              className="font-medium text-slate-700 underline-offset-2 hover:underline"
              onClick={() => void copyRerun()}
            >
              Copy harness command
            </button>
          </p>
        )}
      </div>
    </div>
  )
}
