import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StrategiesView } from '@/components/strategies/strategies-view'
import { STRATEGY_BENCHMARK } from '@/lib/strategy-benchmark'

export const metadata: Metadata = {
  title: 'Retrieval strategies · RAG Eval',
  description:
    'Measured comparison of the four retrieval strategies — Hit@1/Hit@5/MRR, latency, and cost on the bundled corpus.',
}

export default function StrategiesPage() {
  return (
    <div className="min-h-screen bg-background px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Header — matches the other observability surfaces. */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild aria-label="Back to chat">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                Retrieval strategies
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Measured on the bundled corpus
                <span className="mx-1.5 text-muted-foreground/40">·</span>
                <span className="tabular-nums">{STRATEGY_BENCHMARK.nCases} cases</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/eval/runs">Eval runs</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/metrics">Metrics</Link>
            </Button>
          </div>
        </div>

        <StrategiesView />
      </div>
    </div>
  )
}
