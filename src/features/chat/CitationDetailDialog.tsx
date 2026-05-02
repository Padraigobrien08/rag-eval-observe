'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { AlertCircle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import type { Citation } from './types'
import { getDocumentChunks } from '@/lib/api/client'

interface CitationDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  citation: Citation | null
  citationNumber?: number
}

interface ChunkContent {
  id: string
  document_id: string
  chunk_index: number
  content: string
  metadata?: Record<string, unknown>
}

export default function CitationDetailDialog({
  open,
  onOpenChange,
  citation,
  citationNumber = 1,
}: CitationDetailDialogProps) {
  const [chunkContent, setChunkContent] = useState<ChunkContent | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setChunkContent(null)
      setIsLoading(false)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    const documentId = citation?.document_id
    const chunkId = citation?.chunk_id
    if (!open || !documentId || !chunkId) return

    let cancelled = false

    const fetchChunkContent = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const chunks = await getDocumentChunks(documentId)
        if (cancelled) return
        const chunk = chunks.find((c: ChunkContent) => c.id === chunkId)

        if (chunk) {
          setChunkContent(chunk)
        } else {
          setError('Chunk not found')
        }
      } catch (err: unknown) {
        if (cancelled) return
        console.error(`Failed to fetch chunk content:`, err)
        setError(err instanceof Error ? err.message : 'Failed to load chunk content')
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void fetchChunkContent()
    return () => {
      cancelled = true
    }
  }, [open, citation?.document_id, citation?.chunk_id])

  if (!citation) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[90vw] !max-w-lg flex-col overflow-hidden p-0 sm:!max-w-2xl">
        <div className="flex h-full flex-col">
          <div className="shrink-0 border-b bg-background px-6 py-4">
            <DialogHeader>
              <div className="flex items-start gap-4">
                <Badge
                  variant="default"
                  className="h-10 w-10 shrink-0 rounded-full p-0 text-sm font-semibold"
                >
                  {citationNumber}
                </Badge>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="text-left text-lg font-semibold leading-tight">
                    {citation.title || citation.source || 'Untitled Document'}
                  </DialogTitle>
                  <DialogDescription className="mt-1 text-left text-sm">
                    {citation.source && citation.source !== citation.title
                      ? citation.source
                      : 'Citation details'}
                  </DialogDescription>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="font-normal">
                      Chunk {citation.chunk_index}
                    </Badge>
                    <span className="text-muted-foreground/60">·</span>
                    <span className="max-w-[220px] truncate font-mono text-[11px]">
                      {citation.chunk_id}
                    </span>
                  </div>
                </div>
              </div>
            </DialogHeader>
          </div>

          <ScrollArea className="flex-1 px-6 py-4">
            {isLoading ? (
              <div className="space-y-3 py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading content…</span>
                </div>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : chunkContent ? (
              <div className="flex flex-col gap-4">
                <Card className="shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Content
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none leading-relaxed text-foreground">
                      <ReactMarkdown>{chunkContent.content}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
                {chunkContent.metadata && Object.keys(chunkContent.metadata).length > 0 && (
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Metadata
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="max-h-48 overflow-auto rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
                        {JSON.stringify(chunkContent.metadata, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Failed to load content</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertDescription>Content not available</AlertDescription>
              </Alert>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
