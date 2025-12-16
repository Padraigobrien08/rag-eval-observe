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
import { Loader2 } from 'lucide-react'
import { getDocumentChunks } from '@/lib/api/client'

interface DocumentPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  document: { id: string; title?: string; source: string } | null
}

interface Chunk {
  id: string
  document_id: string
  chunk_index: number
  content: string
  metadata?: Record<string, unknown>
  created_at?: string
}

export default function DocumentPreviewDialog({
  open,
  onOpenChange,
  document,
}: DocumentPreviewDialogProps) {
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch chunks when dialog opens
  useEffect(() => {
    if (!open || !document) {
      setChunks([])
      setIsLoading(false)
      setError(null)
      return
    }

    const fetchChunks = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await getDocumentChunks(document.id)
        setChunks(data || [])
      } catch (err: unknown) {
        console.error('Failed to fetch document chunks:', err)
        setError(err instanceof Error ? err.message : 'Failed to load document chunks')
      } finally {
        setIsLoading(false)
      }
    }

    void fetchChunks()
  }, [open, document])

  if (!document) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          width: 'calc(100vw - 3rem)',
          maxWidth: '48rem',
          maxHeight: '90vh',
          margin: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <DialogHeader style={{ flexShrink: 0, marginBottom: '1rem' }}>
          <DialogTitle>{document.title || document.source}</DialogTitle>
          <DialogDescription>
            {chunks.length > 0 && `${chunks.length} chunk${chunks.length !== 1 ? 's' : ''} found`}
          </DialogDescription>
        </DialogHeader>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: '1rem',
            paddingBottom: '1rem',
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <span className="ml-2 text-sm text-slate-500">Loading chunks...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : chunks.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-slate-500">No chunks found for this document.</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                        {chunk.chunk_index + 1}
                      </span>
                      <span className="text-xs font-medium text-slate-600">
                        Chunk {chunk.chunk_index + 1}
                      </span>
                    </div>
                    {chunk.metadata && Object.keys(chunk.metadata).length > 0 && (
                      <span className="text-xs text-slate-400">
                        {Object.keys(chunk.metadata).length} metadata field
                        {Object.keys(chunk.metadata).length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed">
                    <ReactMarkdown>{chunk.content}</ReactMarkdown>
                  </div>
                  {chunk.metadata && Object.keys(chunk.metadata).length > 0 && (
                    <details className="mt-3">
                      <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">
                        Show metadata
                      </summary>
                      <div className="mt-2 p-2 bg-slate-50 rounded text-xs">
                        <pre className="whitespace-pre-wrap text-slate-600">
                          {JSON.stringify(chunk.metadata, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
