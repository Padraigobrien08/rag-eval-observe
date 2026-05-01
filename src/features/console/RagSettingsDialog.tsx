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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
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

      <DialogContent className="flex max-h-[min(90vh,720px)] w-[92vw] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="shrink-0 space-y-1.5 px-6 pt-6 text-left">
          <DialogTitle>RAG settings</DialogTitle>
          <DialogDescription>
            Retrieval, streaming, and how answers appear in the chat.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[min(60vh,480px)] px-6">
          <div className="space-y-4 pb-2 pr-3 pt-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Retrieval model</CardTitle>
                <CardDescription>How relevant chunks are fetched for each query.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="rag-model" className="sr-only">
                  RAG model
                </Label>
                <Select value={ragModel} onValueChange={value => setRagModel(value as RagModel)}>
                  <SelectTrigger id="rag-model" className="w-full">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {RAG_MODEL_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{ragModelDescriptions[ragModel]}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Top K</CardTitle>
                <CardDescription>Number of chunks to retrieve per query (1–50).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Label htmlFor="top-k" className="sr-only">
                    Top K numeric
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
                    className="w-20"
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Behavior</CardTitle>
                <CardDescription>
                  Debug output, streaming, and default answer layout.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-0">
                <div className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0 space-y-0.5">
                    <Label htmlFor="debug-mode" className="text-sm font-medium">
                      Debug mode
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Show retrieved chunks and scores under answers.
                    </p>
                  </div>
                  <Switch id="debug-mode" checked={debug} onCheckedChange={setDebug} />
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0 space-y-0.5">
                    <Label htmlFor="stream-responses" className="text-sm font-medium">
                      Stream answers
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Stream tokens (SSE). Turn off for one-shot responses.
                    </p>
                  </div>
                  <Switch
                    id="stream-responses"
                    checked={streamResponses}
                    onCheckedChange={setStreamResponses}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0 space-y-0.5">
                    <Label htmlFor="default-expanded" className="text-sm font-medium">
                      Default expanded answers
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Show full answer text by default instead of summary only.
                    </p>
                  </div>
                  <Switch
                    id="default-expanded"
                    checked={defaultExpandedAnswers}
                    onCheckedChange={setDefaultExpandedAnswers}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter className="shrink-0 border-t bg-muted/30 px-6 py-4 sm:justify-center">
          <DialogClose asChild>
            <Button type="button" className="min-w-[120px]">
              Done
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
