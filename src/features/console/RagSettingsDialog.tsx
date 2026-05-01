'use client'

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
        'grid grid-cols-[1fr_auto] items-center gap-6 px-4 py-3',
        !isFirst && 'border-t border-border'
      )}
    >
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </Label>
        <p id={`${id}-description`} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      </div>
      <Switch
        id={id}
        className="shrink-0"
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-describedby={`${id}-description`}
      />
    </div>
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
          'flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-[640px] flex-col gap-0 overflow-hidden rounded-2xl border bg-background p-0 sm:max-w-[640px]'
        )}
      >
        <DialogHeader className="shrink-0 border-b px-6 py-5 text-left sm:pr-14">
          <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
            RAG settings
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Configure retrieval and answer behavior.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-5">
          <section aria-labelledby="rag-settings-retrieval-heading" className="space-y-3">
            <h2
              id="rag-settings-retrieval-heading"
              className="text-sm font-semibold text-foreground"
            >
              Retrieval
            </h2>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="grid grid-cols-[1fr_auto] items-center gap-6">
                <div className="min-w-0">
                  <Label htmlFor="rag-model" className="text-sm font-medium text-foreground">
                    Model
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ragModelDescriptions[ragModel]}
                  </p>
                </div>
                <Select value={ragModel} onValueChange={value => setRagModel(value as RagModel)}>
                  <SelectTrigger id="rag-model" className="h-10 w-[260px] shrink-0">
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
          </section>

          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="grid grid-cols-[1fr_auto] items-center gap-6">
              <div className="min-w-0">
                <Label htmlFor="top-k" className="text-sm font-medium text-foreground">
                  Top K
                </Label>
                <p id="top-k-hint" className="mt-1 text-xs text-muted-foreground">
                  Number of chunks to retrieve per query (1–50).
                </p>
              </div>
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
                className="h-10 w-20 shrink-0 tabular-nums"
                aria-describedby="top-k-hint"
              />
            </div>
            <div className="mt-4 space-y-3">
              <Slider
                min={1}
                max={50}
                step={1}
                value={[currentTopK]}
                onValueChange={([value]) => setTopK(value)}
                aria-label="Top K"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>50</span>
              </div>
            </div>
          </div>

          <section aria-labelledby="rag-settings-behavior-heading" className="space-y-3">
            <h2
              id="rag-settings-behavior-heading"
              className="text-sm font-semibold text-foreground"
            >
              Behavior
            </h2>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
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

        <DialogFooter className="flex shrink-0 flex-row justify-end gap-2 border-t px-6 py-4">
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
