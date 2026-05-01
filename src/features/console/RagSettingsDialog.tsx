'use client'

import type { ReactNode } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRagSettings, type RagModel } from '@/features/settings/useRagSettings'
import { useLocalStorage } from '@/features/settings/useLocalStorage'
import { cn } from '@/lib/utils'

const RAG_MODEL_OPTIONS: { value: RagModel; label: string }[] = [
  { value: 'vector-similarity', label: 'Vector similarity search' },
  { value: 'hybrid-search', label: 'Hybrid search (vector + BM25)' },
  { value: 'reranking', label: 'Reranking' },
  { value: 'multi-query', label: 'Multi-query' },
]

const ragModelDescriptions: Record<RagModel, string> = {
  'vector-similarity': 'Semantic search using cosine similarity on embeddings.',
  'hybrid-search': 'Combines vector search with keyword matching for better recall.',
  reranking: 'Uses a reranking model to improve retrieval accuracy.',
  'multi-query': 'Generates multiple query variations for better coverage.',
}

interface RagSettingsDialogProps {
  collapsed?: boolean
}

function BehaviorRow({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
  isFirst = false,
}: {
  id: string
  label: string
  hint: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  isFirst?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-row items-start gap-6 px-5 py-4 sm:gap-8',
        !isFirst && 'border-t border-border'
      )}
    >
      <div className="min-w-0 flex-1 pr-2">
        <Label htmlFor={id} className="text-sm font-medium leading-snug text-foreground">
          {label}
        </Label>
        <p
          id={`${id}-description`}
          className="mt-1.5 text-sm leading-relaxed text-muted-foreground"
        >
          {hint}
        </p>
      </div>
      <div className="flex w-11 shrink-0 justify-end pt-0.5">
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          aria-describedby={`${id}-description`}
        />
      </div>
    </div>
  )
}

function SectionLabel({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </p>
  )
}

export default function RagSettingsDialog({ collapsed = false }: RagSettingsDialogProps) {
  const {
    topK,
    debug,
    streamResponses,
    ragModel,
    setTopK,
    setDebug,
    setStreamResponses,
    setRagModel,
  } = useRagSettings()
  const [defaultExpandedAnswers, setDefaultExpandedAnswers] = useLocalStorage<boolean>(
    'rag-eval-default-expanded-answers',
    false
  )
  const currentTopK = topK ?? 8

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className={cn(
            'text-muted-foreground hover:text-foreground',
            !collapsed && 'h-9 w-full justify-start gap-2 rounded-full px-3 font-normal'
          )}
          aria-label="Open RAG settings"
          title={collapsed ? 'RAG settings' : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Button>
      </DialogTrigger>

      <DialogContent
        className={cn(
          '!flex max-h-[85vh] !w-[min(calc(100vw-2rem),640px)] !max-w-[640px] !flex-col gap-0 overflow-hidden rounded-2xl border border-border/80 bg-background p-0 shadow-2xl antialiased sm:!min-w-[520px]'
        )}
      >
        <DialogHeader className="shrink-0 space-y-0 border-b border-border/80 px-8 pb-5 pt-7 text-left sm:pr-16">
          <DialogTitle className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            RAG settings
          </DialogTitle>
          <DialogDescription className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
            Configure retrieval and answer behavior.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] min-h-0 flex-1 space-y-8 overflow-y-auto overscroll-contain px-8 py-6">
          <section aria-labelledby="rag-settings-retrieval-heading" className="space-y-3">
            <SectionLabel id="rag-settings-retrieval-heading">Retrieval</SectionLabel>
            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm">
              <div className="flex flex-row flex-nowrap items-start gap-6 sm:gap-8">
                <div className="min-w-0 flex-1">
                  <Label
                    htmlFor="rag-model"
                    className="text-sm font-medium leading-snug text-foreground"
                  >
                    Model
                  </Label>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {ragModelDescriptions[ragModel]}
                  </p>
                </div>
                <div className="w-[260px] max-w-[45%] shrink-0">
                  <Select value={ragModel} onValueChange={value => setRagModel(value as RagModel)}>
                    <SelectTrigger id="rag-model" className="h-10 w-full">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="max-h-[min(280px,40vh)]">
                      {RAG_MODEL_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </section>

          <section aria-label="Top K" className="space-y-3">
            <div className="rounded-xl border border-border/80 bg-card p-5 shadow-sm">
              <div className="flex flex-row flex-nowrap items-start gap-6 sm:gap-8">
                <div className="min-w-0 flex-1">
                  <Label
                    htmlFor="top-k"
                    className="text-sm font-medium leading-snug text-foreground"
                  >
                    Top K
                  </Label>
                  <p
                    id="top-k-hint"
                    className="mt-1.5 text-sm leading-relaxed text-muted-foreground"
                  >
                    Number of chunks to retrieve per query (1–50).
                  </p>
                </div>
                <div className="w-20 shrink-0">
                  <Input
                    id="top-k"
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    value={currentTopK}
                    onChange={e => {
                      const value = Number(e.target.value)
                      if (!Number.isNaN(value)) {
                        setTopK(Math.min(50, Math.max(1, value)))
                      }
                    }}
                    className="h-10 w-full tabular-nums"
                    aria-describedby="top-k-hint"
                  />
                </div>
              </div>
              <div className="mt-6 space-y-3 border-t border-border/60 pt-6">
                <Slider
                  min={1}
                  max={50}
                  step={1}
                  value={[currentTopK]}
                  onValueChange={([value]) => setTopK(value)}
                  aria-label="Top K"
                />
                <div className="flex justify-between text-xs font-medium tabular-nums text-muted-foreground">
                  <span>1</span>
                  <span>50</span>
                </div>
              </div>
            </div>
          </section>

          <section aria-labelledby="rag-settings-behavior-heading" className="space-y-3">
            <SectionLabel id="rag-settings-behavior-heading">Behavior</SectionLabel>
            <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
              <BehaviorRow
                isFirst
                id="debug-mode"
                label="Debug mode"
                hint="Show retrieved chunks and scores under answers."
                checked={debug}
                onCheckedChange={setDebug}
              />
              <BehaviorRow
                id="stream-responses"
                label="Stream answers"
                hint="Stream tokens (SSE). Turn off for one-shot responses."
                checked={streamResponses}
                onCheckedChange={setStreamResponses}
              />
              <BehaviorRow
                id="default-expanded"
                label="Default expanded answers"
                hint="Show full answer text by default instead of summary only."
                checked={defaultExpandedAnswers}
                onCheckedChange={setDefaultExpandedAnswers}
              />
            </div>
          </section>
        </div>

        <DialogFooter className="flex shrink-0 flex-row justify-end gap-3 border-t border-border/80 bg-muted/20 px-8 py-5">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="w-auto">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button type="button" variant="default" className="w-auto">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
