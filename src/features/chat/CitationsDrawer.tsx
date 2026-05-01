'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { Citation } from './types'
import { getDocumentChunks } from '@/lib/api/client'

interface CitationsDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  citations: Citation[]
  messageId: string
  highlightedIndex?: number | null
}

interface ChunkContent {
  id: string
  document_id: string
  chunk_index: number
  content: string
  metadata?: Record<string, unknown>
}

export default function CitationsDrawer({
  open,
  onOpenChange,
  citations,
  messageId,
  highlightedIndex = null,
}: CitationsDrawerProps) {
  const [chunkContents, setChunkContents] = useState<Record<string, ChunkContent>>({})
  const [loadingChunks, setLoadingChunks] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setChunkContents({})
      setLoadingChunks(new Set())
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!open || citations.length === 0) return

    const fetchChunkContents = async () => {
      const documentIds = [...new Set(citations.map(c => c.document_id))]

      for (const documentId of documentIds) {
        const documentCitations = citations.filter(c => c.document_id === documentId)

        setLoadingChunks(prev => {
          const next = new Set(prev)
          documentCitations.forEach(c => next.add(c.chunk_id))
          return next
        })

        try {
          const chunks = await getDocumentChunks(documentId)
          const chunksMap: Record<string, ChunkContent> = {}
          chunks.forEach((chunk: ChunkContent) => {
            chunksMap[chunk.id] = chunk
          })
          setChunkContents(prev => ({
            ...prev,
            ...chunksMap,
          }))
        } catch (err: unknown) {
          console.error(`Failed to fetch chunks for document ${documentId}:`, err)
          setError(err instanceof Error ? err.message : 'Failed to load chunk content')
        } finally {
          setLoadingChunks(prev => {
            const next = new Set(prev)
            documentCitations.forEach(c => next.delete(c.chunk_id))
            return next
          })
        }
      }
    }

    void fetchChunkContents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, messageId])

  useEffect(() => {
    if (!open) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, onOpenChange])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-3xl">
        <div className="flex h-full flex-col">
          <div className="shrink-0 border-b bg-background px-6 py-4">
            <SheetTitle className="text-xl font-semibold">Sources &amp; Citations</SheetTitle>
            <SheetDescription className="text-sm text-muted-foreground">
              {citations.length} source{citations.length !== 1 ? 's' : ''} referenced in this answer
            </SheetDescription>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-6 px-6 py-6">
              {citations.map((citation, idx) => {
                const chunkContent = chunkContents[citation.chunk_id]
                const isLoading = loadingChunks.has(citation.chunk_id)
                const isHighlighted = highlightedIndex === idx

                return (
                  <Card
                    id={`citation-${idx}`}
                    key={`${citation.chunk_id}-${idx}`}
                    className={cn(
                      'transition-all duration-300',
                      isHighlighted
                        ? 'border-2 border-blue-400 bg-blue-50/50 shadow-md ring-1 ring-blue-200'
                        : 'shadow-sm'
                    )}
                  >
                    <CardHeader className="space-y-3 pb-2">
                      <div className="flex items-start gap-3">
                        <Badge
                          variant={isHighlighted ? 'default' : 'secondary'}
                          className="h-8 w-8 shrink-0 rounded-md p-0 text-sm font-semibold"
                        >
                          {idx + 1}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg font-semibold leading-tight">
                            {citation.title || citation.source || 'Untitled Document'}
                          </CardTitle>
                          {citation.source && citation.source !== citation.title && (
                            <p className="mt-1 text-sm text-muted-foreground">{citation.source}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="font-normal">
                              Chunk {citation.chunk_index}
                            </Badge>
                            <span className="text-muted-foreground/50">·</span>
                            <span className="max-w-[200px] truncate font-mono">
                              {citation.chunk_id}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                      <Separator />
                      {isLoading ? (
                        <div className="space-y-3 py-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Loading content…</span>
                          </div>
                          <Skeleton className="h-20 w-full" />
                          <Skeleton className="h-12 w-full" />
                        </div>
                      ) : chunkContent ? (
                        <div className="space-y-4">
                          <div className="rounded-lg border bg-muted/30 p-4">
                            <div className="prose prose-sm max-w-none whitespace-pre-wrap break-words leading-relaxed text-foreground">
                              {chunkContent.content}
                            </div>
                          </div>
                          {chunkContent.metadata &&
                            Object.keys(chunkContent.metadata).length > 0 && (
                              <div className="rounded-lg border bg-muted/20 p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Metadata
                                </p>
                                <pre className="max-h-40 overflow-auto rounded-md border bg-background p-3 font-mono text-xs leading-relaxed">
                                  {JSON.stringify(chunkContent.metadata, null, 2)}
                                </pre>
                              </div>
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
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
