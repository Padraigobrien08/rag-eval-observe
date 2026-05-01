'use client'

import type { ReactNode } from 'react'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
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
import { Separator } from '@/components/ui/separator'
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

function SettingsSectionCard({
  sectionId,
  title,
  description,
  children,
}: {
  sectionId: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Card className="overflow-hidden rounded-xl border-border/50 bg-background shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
      <section aria-labelledby={sectionId} className="contents">
        <CardHeader className="space-y-1.5 p-5 pb-4">
          <h3
            id={sectionId}
            className="text-base font-semibold leading-snug tracking-tight text-foreground"
          >
            {title}
          </h3>
          <CardDescription className="text-xs leading-relaxed text-muted-foreground">
            {description}
          </CardDescription>
        </CardHeader>
        <Separator className="bg-border/60" />
        <CardContent className="p-5 pt-5">{children}</CardContent>
      </section>
    </Card>
  )
}

function SwitchRow({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  hint: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0 space-y-1 pr-2">
        <Label htmlFor={id} className="text-sm font-medium leading-snug text-foreground">
          {label}
        </Label>
        <p id={`${id}-description`} className="text-xs leading-relaxed text-muted-foreground">
          {hint}
        </p>
      </div>
      <Switch
        id={id}
        className="mt-0.5 shrink-0"
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
          'flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-[35rem] flex-col gap-0 overflow-hidden rounded-2xl border-0 bg-background p-0',
          'shadow-[0_24px_48px_-12px_rgba(15,23,42,0.12),0_0_0_1px_rgba(15,23,42,0.06)]',
          'dark:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.08)]',
          'sm:w-full'
        )}
      >
        <DialogHeader className="shrink-0 space-y-1.5 px-6 pb-1 pt-6 text-left sm:pr-14">
          <DialogTitle className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            RAG settings
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            Retrieval, streaming, and how answers appear in the chat.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          <div className="flex flex-col gap-5">
            <SettingsSectionCard
              sectionId="rag-settings-retrieval"
              title="Retrieval model"
              description="How relevant chunks are fetched for each query."
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rag-model" className="text-sm font-medium text-foreground">
                    Model
                  </Label>
                  <Select value={ragModel} onValueChange={value => setRagModel(value as RagModel)}>
                    <SelectTrigger id="rag-model" className="h-10 w-full bg-background">
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
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {ragModelDescriptions[ragModel]}
                </p>
              </div>
            </SettingsSectionCard>

            <SettingsSectionCard
              sectionId="rag-settings-top-k"
              title="Top K"
              description="Number of chunks to retrieve per query (1–50)."
            >
              <div className="space-y-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="space-y-2">
                    <Label htmlFor="top-k" className="text-sm font-medium text-foreground">
                      Chunks per query
                    </Label>
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
                      className="h-10 w-full max-w-[5.5rem] tabular-nums sm:w-24"
                      aria-describedby="top-k-hint"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-1 sm:items-end">
                    <span className="text-xs text-muted-foreground">Current value</span>
                    <span
                      className="inline-flex min-w-[4.5rem] items-center justify-center rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-sm font-semibold tabular-nums text-foreground"
                      aria-live="polite"
                    >
                      {currentTopK}
                    </span>
                  </div>
                </div>
                <p id="top-k-hint" className="sr-only">
                  Adjust with the number field or the slider. Allowed range 1 through 50.
                </p>

                <div className="space-y-3">
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
            </SettingsSectionCard>

            <Card className="overflow-hidden rounded-xl border-border/50 bg-background shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
              <section aria-labelledby="rag-settings-behavior">
                <CardHeader className="space-y-1.5 p-5 pb-4">
                  <h3
                    id="rag-settings-behavior"
                    className="text-base font-semibold leading-snug tracking-tight text-foreground"
                  >
                    Behavior
                  </h3>
                  <CardDescription className="text-xs leading-relaxed text-muted-foreground">
                    Debug output, streaming, and default answer layout.
                  </CardDescription>
                </CardHeader>
                <Separator className="bg-border/60" />
                <CardContent className="p-0">
                  <SwitchRow
                    id="debug-mode"
                    label="Debug mode"
                    hint="Show retrieved chunks and scores under answers."
                    checked={debug}
                    onCheckedChange={setDebug}
                  />
                  <Separator className="bg-border/60" />
                  <SwitchRow
                    id="stream-responses"
                    label="Stream answers"
                    hint="Stream tokens (SSE). Turn off for one-shot responses."
                    checked={streamResponses}
                    onCheckedChange={setStreamResponses}
                  />
                  <Separator className="bg-border/60" />
                  <SwitchRow
                    id="default-expanded"
                    label="Default expanded answers"
                    hint="Show full answer text by default instead of summary only."
                    checked={defaultExpandedAnswers}
                    onCheckedChange={setDefaultExpandedAnswers}
                  />
                </CardContent>
              </section>
            </Card>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/50 bg-background/95 px-5 py-4 backdrop-blur-sm sm:flex-row sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="sm:w-auto">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button type="button" variant="default" className="sm:w-auto">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
