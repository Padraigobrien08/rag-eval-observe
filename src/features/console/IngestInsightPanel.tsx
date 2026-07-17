'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Check, ClipboardCopy, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import type { IngestResponsePayload } from '@/lib/api/client'
import { formatLengthStat, humanizeStep } from '@/lib/ingest-format'
import { cn } from '@/lib/utils'

function ChunkSpreadBar({
  min,
  median,
  max,
  mean,
}: {
  min: number
  median: number
  max: number
  mean: number
}) {
  if (min === max) {
    return (
      <section className="rounded-xl border border-border bg-muted/40 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Chunk length (characters)
        </h3>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          All shards are the same length:{' '}
          <span className="font-mono font-semibold text-foreground">{min.toLocaleString()}</span>{' '}
          chars
        </p>
      </section>
    )
  }
  const span = Math.max(1e-9, max - min)
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - min) / span) * 100))
  const markers = [
    { label: 'Min', value: min, dot: 'bg-foreground' },
    { label: 'Median', value: median, dot: 'bg-violet-500' },
    { label: 'Mean', value: mean, dot: 'bg-sky-500' },
    { label: 'Max', value: max, dot: 'bg-amber-500' },
  ] as const

  return (
    <section className="rounded-xl border border-border bg-muted/40 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Chunk length (characters)
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Distribution of stored shard sizes after merging.
      </p>
      <div className="relative mx-auto mt-4 h-5 max-w-xl">
        <div className="absolute inset-x-0 top-1/2 h-2.5 -translate-y-1/2 rounded-full bg-muted shadow-inner" />
        {markers.map(({ label, value, dot }) => (
          <span
            key={`tick-${label}`}
            className={cn(
              'absolute top-1/2 z-[1] block h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background shadow-sm',
              dot
            )}
            style={{ left: `${pct(value)}%` }}
            title={`${value}`}
          />
        ))}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {markers.map(({ label, value, dot }) => (
          <div
            key={label}
            className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm"
          >
            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', dot)} aria-hidden />
            <div className="min-w-0">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </dt>
              <dd className="font-mono text-sm font-semibold tabular-nums leading-snug text-foreground">
                {formatLengthStat(value)}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function IngestInsightPanel({
  outcome,
  onIngestAnother,
  onBackToForm,
  onClose,
}: {
  outcome: IngestResponsePayload
  onIngestAnother: () => void
  onBackToForm: () => void
  onClose: () => void
}) {
  const { preprocessing, chunking } = outcome
  const [copied, setCopied] = useState(false)
  const [idCopied, setIdCopied] = useState(false)

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(outcome, null, 2))
      setCopied(true)
      toast.message('Copied ingest report')
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Could not copy to clipboard')
    }
  }

  const copyDocumentId = async () => {
    try {
      await navigator.clipboard.writeText(outcome.document_id)
      setIdCopied(true)
      toast.message('Document ID copied')
      window.setTimeout(() => setIdCopied(false), 2000)
    } catch {
      toast.error('Could not copy ID')
    }
  }

  const chunkingSideTitle = chunking.adaptive_chunking ? 'Adaptive chunking' : 'Chunk configuration'

  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-border shadow-sm">
      <CardHeader className="shrink-0 space-y-4 border-b border-border bg-muted/30 pb-4 pt-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold tracking-tight text-foreground">
                {outcome.replaced_existing ? 'Index updated' : 'Indexed successfully'}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                {chunking.chunks_created.toLocaleString()} chunks · mean shard{' '}
                {formatLengthStat(chunking.chunk_length_mean)} chars · window{' '}
                {chunking.chunk_target_size}/{chunking.chunk_overlap}
              </CardDescription>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
            {chunking.adaptive_chunking ? (
              <Badge className="font-medium">Adaptive</Badge>
            ) : (
              <Badge variant="secondary" className="font-medium">
                Fixed size
              </Badge>
            )}
            {outcome.replaced_existing ? (
              <Badge variant="outline" className="font-medium">
                Replaced existing
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Document ID
            </p>
            <p className="mt-0.5 break-all font-mono text-xs text-foreground">
              {outcome.document_id}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 shrink-0 gap-1.5 self-start sm:self-auto"
            onClick={() => void copyDocumentId()}
          >
            {idCopied ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <ClipboardCopy className="h-3.5 w-3.5" />
            )}
            {idCopied ? 'Copied' : 'Copy ID'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 space-y-6 overflow-y-auto py-5 text-sm">
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Shard summary
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <div className="rounded-lg border border-border bg-card p-3 text-left shadow-sm sm:p-3.5">
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {chunking.chunks_created.toLocaleString()}
              </p>
              <p className="mt-1 text-xs font-medium leading-snug text-muted-foreground">
                Chunks stored
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-left shadow-sm sm:p-3.5">
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {formatLengthStat(chunking.chunk_length_mean)}
              </p>
              <p className="mt-1 text-xs font-medium leading-snug text-muted-foreground">
                Avg. shard length
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-left shadow-sm sm:p-3.5">
              <p className="text-lg font-semibold tabular-nums leading-tight text-foreground sm:text-xl">
                {chunking.chunk_target_size}
                <span className="font-normal text-muted-foreground"> / </span>
                {chunking.chunk_overlap}
              </p>
              <p className="mt-1 text-xs font-medium leading-snug text-muted-foreground">
                Window / overlap
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3 text-left shadow-sm sm:p-3.5">
              <p className="text-2xl font-semibold tabular-nums text-foreground">
                {chunking.undersized_chunk_merges.toLocaleString()}
              </p>
              <p className="mt-1 text-xs font-medium leading-snug text-muted-foreground">
                Undersize merges
              </p>
            </div>
          </div>
        </div>

        <ChunkSpreadBar
          min={chunking.chunk_length_min}
          median={chunking.chunk_length_median}
          max={chunking.chunk_length_max}
          mean={chunking.chunk_length_mean}
        />

        <Separator className="bg-border" />

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Preprocessing
            </h3>
            <p className="text-sm text-foreground">
              <span className="font-mono tabular-nums">
                {preprocessing.original_character_count.toLocaleString()}
              </span>
              <span className="text-muted-foreground"> → </span>
              <span className="font-mono tabular-nums">
                {preprocessing.normalized_character_count.toLocaleString()}
              </span>
              <span className="text-muted-foreground"> characters</span>
              {preprocessing.character_delta !== 0 ? (
                <span
                  className={cn(
                    'ml-1.5 font-medium tabular-nums',
                    preprocessing.character_delta < 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  )}
                >
                  ({preprocessing.character_delta > 0 ? '+' : ''}
                  {preprocessing.character_delta.toLocaleString()})
                </span>
              ) : null}
            </p>
            {preprocessing.steps_applied.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {preprocessing.steps_applied.map(s => (
                  <Badge key={s} variant="secondary" className="max-w-full font-normal">
                    <span className="break-words">{humanizeStep(s)}</span>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                No structural changes (already clean).
              </p>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {chunkingSideTitle}
            </h3>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-muted-foreground">Est. target shards</span>
                <span className="font-mono font-medium tabular-nums">
                  {chunking.estimated_target_chunks.toLocaleString()}
                </span>
              </li>
              <li className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-muted-foreground">Defaults (env)</span>
                <span className="font-mono font-medium tabular-nums">
                  {chunking.config_chunk_size} / {chunking.config_chunk_overlap}
                </span>
              </li>
              <li className="flex justify-between gap-4">
                <span className="text-muted-foreground">Merge soft cap</span>
                <span className="font-mono font-medium tabular-nums">
                  {chunking.merged_chunk_soft_cap_chars.toLocaleString()} chars
                </span>
              </li>
            </ul>
          </div>
        </div>

        {preprocessing.warnings.length > 0 ? (
          <Alert className="border-amber-500/40 bg-amber-500/10">
            <AlertTitle className="text-amber-700 dark:text-amber-300">
              Preprocessing notice
            </AlertTitle>
            <AlertDescription className="text-sm text-amber-700/90 dark:text-amber-200/90">
              {preprocessing.warnings.join(' · ')}
            </AlertDescription>
          </Alert>
        ) : null}
      </CardContent>

      <CardFooter className="flex shrink-0 flex-col gap-3 border-t border-border bg-muted/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={onBackToForm}
        >
          Back to form
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => void copyJson()}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy JSON'}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onIngestAnother}>
            Ingest another
          </Button>
          <Button type="button" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
