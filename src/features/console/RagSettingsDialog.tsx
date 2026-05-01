'use client'

import { Fragment, type ReactNode } from 'react'
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

function SettingsSection({
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
    <section
      aria-labelledby={sectionId}
      className="space-y-4 rounded-xl border border-border/60 bg-muted/30 p-5 shadow-sm"
    >
      <h3 id={sectionId} className="text-base font-semibold text-foreground">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      {children}
    </section>
  )
}

function BehaviorRow({
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
    <div className="flex items-center justify-between gap-4 rounded-lg border bg-background px-4 py-3">
      <div className="min-w-0 flex-1 pr-2">
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
          'flex max-h-[85vh] w-[calc(100vw-2rem)] max-w-[560px] flex-col gap-0 overflow-hidden rounded-2xl border bg-background p-0 shadow-2xl'
        )}
      >
        <DialogHeader className="shrink-0 px-6 pb-4 pt-6 text-left sm:pr-14">
          <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
            RAG settings
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Retrieval, streaming, and how answers appear in the chat.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] min-h-0 flex-1 space-y-8 overflow-y-auto overscroll-contain px-6 py-4">
          <SettingsSection
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
              <p className="text-xs text-muted-foreground">{ragModelDescriptions[ragModel]}</p>
            </div>
          </SettingsSection>

          <SettingsSection
            sectionId="rag-settings-top-k"
            title="Top K"
            description="Number of chunks to retrieve per query (1–50)."
          >
            <Fragment>
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="top-k" className="text-sm font-medium text-foreground">
                    Chunks per query
                  </Label>
                  <span
                    className="shrink-0 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground shadow-sm"
                    aria-live="polite"
                  >
                    Top K: {currentTopK}
                  </span>
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
                  className="h-10 w-24 tabular-nums"
                  aria-describedby="top-k-hint"
                />
                <p id="top-k-hint" className="sr-only">
                  Adjust between 1 and 50 using the field or slider.
                </p>
              </div>
              <div className="mt-3 space-y-3">
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
            </Fragment>
          </SettingsSection>

          <SettingsSection
            sectionId="rag-settings-behavior"
            title="Behavior"
            description="Debug output, streaming, and default answer layout."
          >
            <div className="flex flex-col gap-4">
              <BehaviorRow
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
          </SettingsSection>
        </div>

        <DialogFooter className="flex shrink-0 flex-row justify-end gap-2 border-t bg-muted/30 px-6 py-4">
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
