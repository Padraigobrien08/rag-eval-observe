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

function SettingsPanel({
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
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <header className="border-b border-border bg-muted/35 px-6 py-5">
        <h3
          id={sectionId}
          className="text-lg font-semibold leading-tight tracking-tight text-foreground"
        >
          {title}
        </h3>
        <p className="mt-2 max-w-prose text-[0.8125rem] leading-relaxed text-muted-foreground text-pretty sm:text-sm">
          {description}
        </p>
      </header>
      <div className="p-6">{children}</div>
    </section>
  )
}

function SettingsPanelList({
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
      className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
    >
      <header className="border-b border-border bg-muted/35 px-6 py-5">
        <h3
          id={sectionId}
          className="text-lg font-semibold leading-tight tracking-tight text-foreground"
        >
          {title}
        </h3>
        <p className="mt-2 max-w-prose text-[0.8125rem] leading-relaxed text-muted-foreground text-pretty sm:text-sm">
          {description}
        </p>
      </header>
      <div className="divide-y divide-border">{children}</div>
    </section>
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
    <div className="flex items-start justify-between gap-4 px-6 py-5 transition-colors hover:bg-muted/20">
      <div className="min-w-0 space-y-1 pr-2">
        <Label htmlFor={id} className="text-sm font-medium leading-snug text-foreground">
          {label}
        </Label>
        <p className="text-xs leading-relaxed text-muted-foreground text-pretty sm:text-[0.8125rem] sm:leading-relaxed">
          {hint}
        </p>
      </div>
      <Switch
        id={id}
        className="mt-0.5 shrink-0"
        checked={checked}
        onCheckedChange={onCheckedChange}
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
          'flex h-[min(88vh,720px)] w-[calc(100vw-2rem)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl',
          'sm:w-full'
        )}
      >
        <DialogHeader className="shrink-0 space-y-2 border-b border-border/80 bg-muted/20 px-6 pb-5 pt-6 text-left sm:space-y-2.5 sm:pb-6 sm:pt-7 sm:pr-16">
          <DialogTitle className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl sm:leading-none">
            RAG settings
          </DialogTitle>
          <DialogDescription className="text-pretty text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem] sm:leading-relaxed">
            Retrieval, streaming, and how answers appear in the chat.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-7 sm:py-8">
          <div className="mx-auto flex max-w-lg flex-col gap-8">
            <SettingsPanel
              sectionId="rag-model-heading"
              title="Retrieval model"
              description="How relevant chunks are fetched for each query."
            >
              <div className="space-y-5">
                <div className="space-y-2.5">
                  <Label
                    htmlFor="rag-model"
                    className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                  >
                    Model
                  </Label>
                  <Select value={ragModel} onValueChange={value => setRagModel(value as RagModel)}>
                    <SelectTrigger id="rag-model" className="h-11 w-full bg-background text-[15px]">
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
                <p className="border-t border-border/80 pt-5 text-sm leading-relaxed text-muted-foreground text-pretty">
                  {ragModelDescriptions[ragModel]}
                </p>
              </div>
            </SettingsPanel>

            <SettingsPanel
              sectionId="top-k-heading"
              title="Top K"
              description="Number of chunks to retrieve per query (1–50)."
            >
              <div className="space-y-8">
                <div>
                  <Label
                    htmlFor="top-k"
                    className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                  >
                    Chunks per query
                  </Label>
                  <div className="mt-2.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
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
                      className="h-11 w-full max-w-[5.5rem] tabular-nums text-[15px] font-medium sm:w-[4.75rem]"
                    />
                    <p className="text-sm leading-snug text-muted-foreground">
                      Type a value or use the slider — valid range is 1–50.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-center">
                    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold tabular-nums text-foreground shadow-sm">
                      Top K · {currentTopK}
                    </span>
                  </div>
                  <Slider
                    min={1}
                    max={50}
                    step={1}
                    value={[currentTopK]}
                    onValueChange={([value]) => setTopK(value)}
                  />
                  <div className="flex justify-between text-[11px] font-medium tabular-nums text-muted-foreground">
                    <span>1</span>
                    <span>50</span>
                  </div>
                </div>
              </div>
            </SettingsPanel>

            <SettingsPanelList
              sectionId="behavior-heading"
              title="Behavior"
              description="Debug output, streaming, and default answer layout."
            >
              <SwitchRow
                id="debug-mode"
                label="Debug mode"
                hint="Show retrieved chunks and scores under answers."
                checked={debug}
                onCheckedChange={setDebug}
              />
              <SwitchRow
                id="stream-responses"
                label="Stream answers"
                hint="Stream tokens (SSE). Turn off for one-shot responses."
                checked={streamResponses}
                onCheckedChange={setStreamResponses}
              />
              <SwitchRow
                id="default-expanded"
                label="Default expanded answers"
                hint="Show full answer text by default instead of summary only."
                checked={defaultExpandedAnswers}
                onCheckedChange={setDefaultExpandedAnswers}
              />
            </SettingsPanelList>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t border-border/80 bg-muted/30 px-6 py-4 sm:justify-end">
          <DialogClose asChild>
            <Button type="button" variant="default" className="w-full sm:w-auto sm:min-w-[7rem]">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
