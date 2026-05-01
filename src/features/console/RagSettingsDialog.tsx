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

function SectionTitle({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="text-sm font-semibold leading-none text-foreground">
      {children}
    </h3>
  )
}

function SectionDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>
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
            'text-slate-600 hover:text-slate-900',
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
          'flex h-[min(85vh,640px)] w-[calc(100vw-2rem)] max-w-lg flex-col gap-0 overflow-hidden p-0',
          'sm:w-full'
        )}
      >
        <DialogHeader className="shrink-0 space-y-2 border-b bg-background px-6 py-5 pr-14 text-left">
          <DialogTitle className="text-xl font-semibold tracking-tight">RAG settings</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Retrieval, streaming, and how answers appear in the chat.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          <div className="space-y-8">
            <section className="space-y-3" aria-labelledby="rag-model-heading">
              <div className="space-y-1.5">
                <SectionTitle id="rag-model-heading">Retrieval model</SectionTitle>
                <SectionDescription>
                  How relevant chunks are fetched for each query.
                </SectionDescription>
              </div>
              <Label htmlFor="rag-model" className="sr-only">
                RAG model
              </Label>
              <Select value={ragModel} onValueChange={value => setRagModel(value as RagModel)}>
                <SelectTrigger id="rag-model" className="w-full bg-background">
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
              <p className="text-xs leading-relaxed text-muted-foreground">
                {ragModelDescriptions[ragModel]}
              </p>
            </section>

            <Separator />

            <section className="space-y-4" aria-labelledby="top-k-heading">
              <div className="space-y-1.5">
                <SectionTitle id="top-k-heading">Top K</SectionTitle>
                <SectionDescription>
                  Number of chunks to retrieve per query (1–50).
                </SectionDescription>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Label htmlFor="top-k" className="sr-only">
                  Top K value
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
                  className="w-20 bg-background"
                />
                <span className="text-xs text-muted-foreground">chunks per query</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>1</span>
                  <span className="font-medium text-foreground">Top K: {currentTopK}</span>
                  <span>50</span>
                </div>
                <Slider
                  min={1}
                  max={50}
                  step={1}
                  value={[currentTopK]}
                  onValueChange={([value]) => setTopK(value)}
                />
              </div>
            </section>

            <Separator />

            <section className="space-y-1" aria-labelledby="behavior-heading">
              <div className="space-y-1.5 pb-3">
                <SectionTitle id="behavior-heading">Behavior</SectionTitle>
                <SectionDescription>
                  Debug output, streaming, and default answer layout.
                </SectionDescription>
              </div>

              <div className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0 space-y-1 pr-2">
                  <Label htmlFor="debug-mode" className="text-sm font-medium text-foreground">
                    Debug mode
                  </Label>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Show retrieved chunks and scores under answers.
                  </p>
                </div>
                <Switch
                  id="debug-mode"
                  className="mt-0.5 shrink-0"
                  checked={debug}
                  onCheckedChange={setDebug}
                />
              </div>

              <Separator />

              <div className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0 space-y-1 pr-2">
                  <Label htmlFor="stream-responses" className="text-sm font-medium text-foreground">
                    Stream answers
                  </Label>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Stream tokens (SSE). Turn off for one-shot responses.
                  </p>
                </div>
                <Switch
                  id="stream-responses"
                  className="mt-0.5 shrink-0"
                  checked={streamResponses}
                  onCheckedChange={setStreamResponses}
                />
              </div>

              <Separator />

              <div className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0 space-y-1 pr-2">
                  <Label htmlFor="default-expanded" className="text-sm font-medium text-foreground">
                    Default expanded answers
                  </Label>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Show full answer text by default instead of summary only.
                  </p>
                </div>
                <Switch
                  id="default-expanded"
                  className="mt-0.5 shrink-0"
                  checked={defaultExpandedAnswers}
                  onCheckedChange={setDefaultExpandedAnswers}
                />
              </div>
            </section>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t bg-muted/40 px-6 py-4">
          <DialogClose asChild>
            <Button type="button" variant="default" className="w-full sm:w-auto">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
