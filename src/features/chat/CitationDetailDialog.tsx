'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
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
  metadata?: Record<string, any>
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

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setChunkContent(null)
      setIsLoading(false)
      setError(null)
    }
  }, [open])

  // Fetch chunk content when dialog opens with a citation
  useEffect(() => {
    if (!open || !citation || !citation.document_id || !citation.chunk_id) return

    const fetchChunkContent = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const chunks = await getDocumentChunks(citation.document_id)
        const chunk = chunks.find((c: ChunkContent) => c.id === citation.chunk_id)

        if (chunk) {
          setChunkContent(chunk)
        } else {
          setError('Chunk not found')
        }
      } catch (err: any) {
        console.error(`Failed to fetch chunk content:`, err)
        setError(err.message || 'Failed to load chunk content')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchChunkContent()
  }, [open, citation])

  if (!citation) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-lg w-[90vw] max-h-[90vh] overflow-hidden flex flex-col"
        style={{ maxWidth: '72rem', padding: 0 }}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div
            className="shrink-0 border-b border-slate-200 bg-white"
            style={{
              paddingTop: '1.5rem',
              paddingBottom: '1.5rem',
              paddingLeft: '2rem',
              paddingRight: '2rem',
            }}
          >
            <DialogHeader>
              <div className="flex items-start" style={{ marginBottom: '0.5rem', gap: '1.25rem' }}>
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-full bg-blue-600 text-white font-semibold"
                  style={{ width: '2.5rem', height: '2.5rem', fontSize: '0.875rem' }}
                >
                  {citationNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle
                    className="text-slate-900 leading-tight"
                    style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}
                  >
                    {citation.title || citation.source || 'Untitled Document'}
                  </DialogTitle>
                  {citation.source && citation.source !== citation.title && (
                    <DialogDescription
                      className="text-slate-600"
                      style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}
                    >
                      {citation.source}
                    </DialogDescription>
                  )}
                  <div
                    className="flex items-center gap-2"
                    style={{ fontSize: '0.75rem', color: '#64748b' }}
                  >
                    <span
                      className="bg-slate-100 rounded"
                      style={{
                        paddingLeft: '0.5rem',
                        paddingRight: '0.5rem',
                        paddingTop: '0.25rem',
                        paddingBottom: '0.25rem',
                      }}
                    >
                      Chunk {citation.chunk_index}
                    </span>
                    <span style={{ color: '#cbd5e1' }}>·</span>
                    <span
                      className="font-mono truncate"
                      style={{ color: '#94a3b8', maxWidth: '200px' }}
                    >
                      {citation.chunk_id}
                    </span>
                  </div>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Content */}
          <ScrollArea
            className="flex-1"
            style={{
              paddingLeft: '2rem',
              paddingRight: '2rem',
              paddingTop: '1.5rem',
              paddingBottom: '1.5rem',
            }}
          >
            <div>
              {isLoading ? (
                <div
                  className="flex items-center gap-3 text-slate-600"
                  style={{ fontSize: '0.875rem', paddingTop: '2rem', paddingBottom: '2rem' }}
                >
                  <Loader2 className="h-5 w-5 animate-spin" style={{ color: '#94a3b8' }} />
                  <span>Loading content...</span>
                </div>
              ) : chunkContent ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div
                    className="bg-slate-50 rounded-lg border border-slate-200"
                    style={{
                      paddingTop: '1.5rem',
                      paddingBottom: '1.5rem',
                      paddingLeft: '1.5rem',
                      paddingRight: '1.5rem',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    }}
                  >
                    <p
                      className="text-slate-700 uppercase tracking-wide"
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginBottom: '1rem',
                        letterSpacing: '0.05em',
                      }}
                    >
                      Content:
                    </p>
                    <div
                      className="prose prose-sm max-w-none text-slate-800 leading-relaxed"
                      style={{ lineHeight: '1.75' }}
                    >
                      <ReactMarkdown>{chunkContent.content}</ReactMarkdown>
                    </div>
                  </div>
                  {chunkContent.metadata && Object.keys(chunkContent.metadata).length > 0 && (
                    <div
                      className="bg-slate-50 rounded-lg border border-slate-200"
                      style={{
                        paddingTop: '1.25rem',
                        paddingBottom: '1.25rem',
                        paddingLeft: '1.25rem',
                        paddingRight: '1.25rem',
                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                      }}
                    >
                      <p
                        className="text-slate-700 uppercase tracking-wide"
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          marginBottom: '1rem',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Metadata
                      </p>
                      <div
                        className="bg-white rounded border border-slate-200 overflow-x-auto"
                        style={{
                          paddingTop: '1rem',
                          paddingBottom: '1rem',
                          paddingLeft: '1rem',
                          paddingRight: '1rem',
                        }}
                      >
                        <pre
                          className="text-slate-700 font-mono leading-relaxed"
                          style={{
                            fontSize: '0.75rem',
                            margin: 0,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                          }}
                        >
                          {JSON.stringify(chunkContent.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : error ? (
                <div
                  className="bg-red-50 border border-red-200 rounded-lg"
                  style={{
                    paddingTop: '1rem',
                    paddingBottom: '1rem',
                    paddingLeft: '1rem',
                    paddingRight: '1rem',
                  }}
                >
                  <p className="font-medium text-red-800" style={{ fontSize: '0.875rem' }}>
                    Failed to load content
                  </p>
                  <p className="text-red-600" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {error}
                  </p>
                </div>
              ) : (
                <div
                  className="bg-slate-50 border border-slate-200 rounded-lg"
                  style={{
                    paddingTop: '1rem',
                    paddingBottom: '1rem',
                    paddingLeft: '1rem',
                    paddingRight: '1rem',
                  }}
                >
                  <p className="text-slate-500" style={{ fontSize: '0.875rem' }}>
                    Content not available
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
