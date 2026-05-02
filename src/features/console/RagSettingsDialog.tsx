'use client'

import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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

interface RagSettingsDialogProps {
  collapsed?: boolean
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
          'h-auto max-h-[85vh] w-full max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border bg-background p-0 shadow-2xl'
        )}
      >
        <div className="shrink-0 border-b px-8 pb-6 pt-7">
          <DialogTitle className="text-2xl font-semibold tracking-tight text-foreground">
            RAG settings
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Configure retrieval quality, streaming, and answer display.
          </DialogDescription>
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-8 py-7">
          <div className="space-y-8">
            <div className="space-y-4" aria-labelledby="rag-settings-retrieval-heading">
              <h2
                id="rag-settings-retrieval-heading"
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Retrieval
              </h2>

              <div className="space-y-4">
                <article className="rounded-xl border bg-card shadow-sm">
                  <div className="grid grid-cols-2 items-center gap-8 p-5">
                    <div className="min-w-0">
                      <Label htmlFor="rag-model" className="text-sm font-medium text-foreground">
                        Model
                      </Label>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        Choose how relevant context is retrieved for each query.
                      </p>
                    </div>
                    <div className="flex min-w-0 justify-end">
                      <Select
                        value={ragModel}
                        onValueChange={value => setRagModel(value as RagModel)}
                      >
                        <SelectTrigger id="rag-model" className="h-10 w-72 shrink-0">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="max-h-72">
                          {RAG_MODEL_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </article>

                <article className="rounded-xl border bg-card shadow-sm">
                  <div className="grid grid-cols-2 items-start gap-8 p-5 pb-4">
                    <div className="min-w-0">
                      <Label htmlFor="top-k" className="text-sm font-medium text-foreground">
                        Top K
                      </Label>
                      <p
                        id="top-k-hint"
                        className="mt-1 text-sm leading-relaxed text-muted-foreground"
                      >
                        Controls how many chunks are retrieved before answering.
                      </p>
                    </div>
                    <div className="flex min-w-0 justify-end">
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
                        className="h-10 w-24 text-center tabular-nums"
                        aria-describedby="top-k-hint"
                      />
                    </div>
                  </div>
                  <div className="px-5 pb-5">
                    <Slider
                      min={1}
                      max={50}
                      step={1}
                      value={[currentTopK]}
                      onValueChange={([value]) => setTopK(value)}
                      aria-label="Top K"
                    />
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>1</span>
                      <span>50</span>
                    </div>
                  </div>
                </article>
              </div>
            </div>

            <div className="space-y-4" aria-labelledby="rag-settings-behavior-heading">
              <h2
                id="rag-settings-behavior-heading"
                className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                Answer behavior
              </h2>

              <div className="divide-y rounded-xl border bg-card shadow-sm">
                <div className="grid grid-cols-2 items-center gap-8 px-5 py-4">
                  <div className="min-w-0">
                    <Label htmlFor="debug-mode" className="text-sm font-medium text-foreground">
                      Debug mode
                    </Label>
                    <p
                      id="debug-mode-description"
                      className="mt-1 text-sm leading-relaxed text-muted-foreground"
                    >
                      Show retrieved chunks and similarity scores below each answer.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Switch
                      id="debug-mode"
                      className="shrink-0"
                      checked={debug}
                      onCheckedChange={setDebug}
                      aria-describedby="debug-mode-description"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 items-center gap-8 px-5 py-4">
                  <div className="min-w-0">
                    <Label
                      htmlFor="stream-responses"
                      className="text-sm font-medium text-foreground"
                    >
                      Stream answers
                    </Label>
                    <p
                      id="stream-responses-description"
                      className="mt-1 text-sm leading-relaxed text-muted-foreground"
                    >
                      Stream generated tokens as they are produced.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Switch
                      id="stream-responses"
                      className="shrink-0"
                      checked={streamResponses}
                      onCheckedChange={setStreamResponses}
                      aria-describedby="stream-responses-description"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 items-center gap-8 px-5 py-4">
                  <div className="min-w-0">
                    <Label
                      htmlFor="default-expanded"
                      className="text-sm font-medium text-foreground"
                    >
                      Expanded answers
                    </Label>
                    <p
                      id="default-expanded-description"
                      className="mt-1 text-sm leading-relaxed text-muted-foreground"
                    >
                      Show full answer text by default instead of summaries.
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Switch
                      id="default-expanded"
                      className="shrink-0"
                      checked={defaultExpandedAnswers}
                      onCheckedChange={setDefaultExpandedAnswers}
                      aria-describedby="default-expanded-description"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-3 border-t bg-muted/30 px-8 py-5">
          <DialogClose asChild>
            <Button type="button" variant="outline" className="h-10 px-5">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button type="button" variant="default" className="h-10 px-5">
              Done
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
