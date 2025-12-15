'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Loader2 } from 'lucide-react'
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
  metadata?: Record<string, any>
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

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setChunkContents({})
      setLoadingChunks(new Set())
      setError(null)
    }
  }, [open])

  // Fetch chunk contents when drawer opens
  useEffect(() => {
    if (!open || citations.length === 0) return

    const fetchChunkContents = async () => {
      // Group citations by document_id to minimize API calls
      const documentIds = [...new Set(citations.map(c => c.document_id))]

      for (const documentId of documentIds) {
        // Find citations for this document
        const documentCitations = citations.filter(c => c.document_id === documentId)

        // Mark all citations for this document as loading
        setLoadingChunks(prev => {
          const next = new Set(prev)
          documentCitations.forEach(c => next.add(c.chunk_id))
          return next
        })

        try {
          const chunks = await getDocumentChunks(documentId)

          // Map chunks by id
          const chunksMap: Record<string, ChunkContent> = {}
          chunks.forEach((chunk: ChunkContent) => {
            chunksMap[chunk.id] = chunk
          })

          // Update state with fetched chunks
          setChunkContents(prev => ({
            ...prev,
            ...chunksMap,
          }))
        } catch (err: any) {
          console.error(`Failed to fetch chunks for document ${documentId}:`, err)
          setError(err.message || 'Failed to load chunk content')
        } finally {
          // Remove from loading set
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
  }, [open, messageId]) // Only depend on open and messageId to avoid infinite loops

  // Handle escape key
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
      <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto p-0">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4">
            <SheetTitle className="text-xl font-semibold text-slate-900 mb-1">
              Sources & Citations
            </SheetTitle>
            <SheetDescription className="text-sm text-slate-600">
              {citations.length} source{citations.length !== 1 ? 's' : ''} referenced in this answer
            </SheetDescription>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="px-6 py-6 space-y-8">
              {citations.map((citation, idx) => {
                const chunkContent = chunkContents[citation.chunk_id]
                const isLoading = loadingChunks.has(citation.chunk_id)
                const isHighlighted = highlightedIndex === idx

                return (
                  <div
                    id={`citation-${idx}`}
                    key={`${citation.chunk_id}-${idx}`}
                    className={`transition-all duration-300 ${
                      isHighlighted
                        ? 'bg-blue-50 rounded-xl p-6 -mx-2 border-2 border-blue-300 shadow-sm'
                        : 'bg-white rounded-xl border border-slate-200 p-6 shadow-sm'
                    }`}
                  >
                    {/* Citation Header */}
                    <div className="mb-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg font-semibold text-sm ${
                            isHighlighted ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-slate-900 mb-1 leading-tight">
                            {citation.title || citation.source || 'Untitled Document'}
                          </h3>
                          {citation.source && citation.source !== citation.title && (
                            <p className="text-sm text-slate-600 mb-2">{citation.source}</p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="bg-slate-100 px-2 py-0.5 rounded">
                              Chunk {citation.chunk_index}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="font-mono text-slate-400 truncate max-w-[200px]">
                              {citation.chunk_id}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Chunk Content */}
                    <div>
                      {isLoading ? (
                        <div className="flex items-center gap-3 text-sm text-slate-600 py-8">
                          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                          <span>Loading content...</span>
                        </div>
                      ) : chunkContent ? (
                        <div className="space-y-4">
                          <div className="bg-slate-50 rounded-lg p-5 border border-slate-200">
                            <div className="prose prose-sm max-w-none text-slate-800 leading-relaxed whitespace-pre-wrap break-words">
                              {chunkContent.content}
                            </div>
                          </div>
                          {chunkContent.metadata &&
                            Object.keys(chunkContent.metadata).length > 0 && (
                              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">
                                  Metadata
                                </p>
                                <div className="bg-white rounded border border-slate-200 p-3 overflow-x-auto">
                                  <pre className="text-xs text-slate-700 font-mono leading-relaxed">
                                    {JSON.stringify(chunkContent.metadata, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                        </div>
                      ) : error ? (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                          <p className="text-sm font-medium text-red-800">Failed to load content</p>
                          <p className="text-xs text-red-600 mt-1">{error}</p>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                          <p className="text-sm text-slate-500">Content not available</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  )
}
