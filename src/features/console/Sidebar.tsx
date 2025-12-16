'use client'

import { useState, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Plus, Settings, FileText, Loader2, ChevronDown, Trash2 } from 'lucide-react'
import IngestDialog from './IngestDialog'
import DocumentPreviewDialog from './DocumentPreviewDialog'
import { useRagSettings, type RagModel } from '@/features/settings/useRagSettings'
import { useLocalStorage } from '@/features/settings/useLocalStorage'
import { listDocuments, deleteDocument } from '@/lib/api/client'

interface Document {
  id: string
  source: string
  title?: string
  created_at: string
}

export default function Sidebar() {
  const [ingestOpen, setIngestOpen] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [documentToPreview, setDocumentToPreview] = useState<Document | null>(null)
  const { topK, debug, ragModel, setTopK, setDebug, setRagModel } = useRagSettings()
  const [defaultExpandedAnswers, setDefaultExpandedAnswers] = useLocalStorage<boolean>(
    'rag-eval-default-expanded-answers',
    false
  )
  const currentTopK = topK ?? 8

  const ragModelDescriptions: Record<RagModel, string> = {
    'vector-similarity': 'Semantic search using cosine similarity on embeddings.',
    'hybrid-search': 'Combines vector search with keyword matching for better recall.',
    reranking: 'Uses a reranking model to improve retrieval accuracy.',
    'multi-query': 'Generates multiple query variations for better coverage.',
  }

  const loadDocuments = async () => {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now()
    try {
      setIsLoadingDocs(true)
      if (typeof console !== 'undefined' && console.log) {
        console.log('[Sidebar] Starting to load documents...')
      }
      const response = await listDocuments()
      const loadTime =
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime
      if (typeof console !== 'undefined' && console.log) {
        console.log('[Sidebar] Documents loaded in', loadTime.toFixed(2), 'ms')
      }
      setDocuments(response.documents || [])
    } catch (error) {
      const errorTime =
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime
      if (typeof console !== 'undefined' && console.error) {
        console.error(
          '[Sidebar] Failed to load documents after',
          errorTime.toFixed(2),
          'ms:',
          error
        )
      }
      setDocuments([])
    } finally {
      setIsLoadingDocs(false)
    }
  }

  useEffect(() => {
    void loadDocuments()
  }, [])

  const handleIngestSuccess = () => {
    void loadDocuments()
  }

  const handleDocumentClick = (doc: Document) => {
    setDocumentToPreview(doc)
    setPreviewDialogOpen(true)
  }

  const handleDeleteClick = (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering any parent click handlers
    setDocumentToDelete(doc)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return

    setIsDeleting(true)
    try {
      await deleteDocument(documentToDelete.id)
      setDeleteDialogOpen(false)
      setDocumentToDelete(null)
      // Reload documents list
      await loadDocuments()
    } catch (error) {
      console.error('Failed to delete document:', error)
      // You could add a toast notification here
      alert(
        `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
        <ScrollArea className="flex-1 min-h-0 space-y-6">
          {/* Documents */}
          <div>
            <div className="flex items-center justify-between px-4 py-2">
              <div className="text-xs font-semibold tracking-wide text-slate-500">
                DOCUMENTS
                {!isLoadingDocs && documents.length > 0 && (
                  <span className="ml-1.5 text-slate-400 font-normal">({documents.length})</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Ingest document"
                onClick={() => setIngestOpen(true)}
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {isLoadingDocs ? (
              <div className="flex items-center gap-2 px-4 py-3">
                <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                <p className="text-xs text-slate-500">Loading documents...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="px-4 py-3">
                <p className="text-xs text-slate-500">No documents yet.</p>
                <p className="text-xs text-slate-400 mt-1">Click + to add your first document.</p>
              </div>
            ) : (
              <div className="space-y-0.5 px-2">
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-md transition-colors group"
                  >
                    <button
                      type="button"
                      onClick={() => handleDocumentClick(doc)}
                      className="flex-1 flex items-center gap-2 text-left truncate hover:text-slate-900"
                      title={`View ${doc.title || doc.source}`}
                    >
                      <FileText className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
                      <span className="flex-1 truncate">{doc.title || doc.source}</span>
                    </button>
                    <button
                      type="button"
                      onClick={e => handleDeleteClick(doc, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded text-red-600 hover:text-red-700"
                      aria-label={`Delete ${doc.title || doc.source}`}
                      title="Delete document"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chats */}
          <div>
            <div className="flex items-center justify-between px-4 py-2">
              <div className="text-xs font-semibold tracking-wide text-slate-500">CHATS</div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="New chat"
                onClick={() => {
                  // Placeholder – real chat history later
                }}
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="px-4 text-xs text-slate-500">No chats yet. Start a new chat.</p>
          </div>
        </ScrollArea>

        <div className="border-t border-slate-200 px-4 py-2">
          <Dialog>
            <DialogTrigger asChild>
              <button className="mt-auto mb-3 flex items-center gap-2 rounded-full px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
            </DialogTrigger>

            <DialogContent
              className="w-[92vw] max-w-lg rounded-2xl border border-slate-200 bg-white"
              style={{ padding: '2rem' }}
            >
              <DialogHeader>
                <DialogTitle>Query settings</DialogTitle>
                <DialogDescription>
                  Control how many chunks are retrieved and whether debug info is shown.
                </DialogDescription>
              </DialogHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* RAG Model section */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <Label htmlFor="rag-model" className="text-sm font-medium text-slate-900">
                      RAG Model
                    </Label>
                    <p className="text-xs text-slate-500">
                      Method used for retrieving relevant chunks.
                    </p>
                  </div>

                  <div className="relative">
                    <select
                      id="rag-model"
                      value={ragModel}
                      onChange={e => {
                        const newModel = e.target.value as RagModel
                        console.log('[Sidebar] RAG model changed:', {
                          oldValue: ragModel,
                          newValue: newModel,
                        })
                        setRagModel(newModel)
                      }}
                      className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent pr-10"
                      style={{ paddingRight: '2.5rem' }}
                    >
                      <option value="vector-similarity">Vector Similarity Search</option>
                      <option value="hybrid-search">Hybrid Search (Vector + BM25)</option>
                      <option value="reranking">Reranking</option>
                      <option value="multi-query">Multi-Query</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  </div>
                  <p className="text-xs text-slate-500 italic">{ragModelDescriptions[ragModel]}</p>
                </section>

                {/* Top K section */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <Label htmlFor="top-k" className="text-sm font-medium text-slate-900">
                      Top K
                    </Label>
                    <p className="text-xs text-slate-500">
                      Number of chunks to retrieve per query.
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="flex items-center" style={{ gap: '1rem' }}>
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
                            const clamped = Math.min(50, Math.max(1, value))
                            setTopK(clamped)
                          }
                        }}
                        className="w-20 text-sm"
                      />
                      <span className="text-xs text-slate-500">chunks per query</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>1</span>
                        <span className="font-medium text-slate-700">Top K: {currentTopK}</span>
                        <span>50</span>
                      </div>
                      <Slider
                        min={1}
                        max={50}
                        step={1}
                        value={[currentTopK]}
                        onValueChange={([value]) => setTopK(value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                </section>

                {/* Debug mode section */}
                <section
                  className="flex items-center justify-between rounded-xl bg-slate-50"
                  style={{ padding: '1rem', gap: '2rem' }}
                >
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}
                  >
                    <Label htmlFor="debug-mode" className="text-sm font-medium text-slate-900">
                      Debug mode
                    </Label>
                    <p className="text-xs text-slate-500">
                      Show retrieved chunks and scores under answers.
                    </p>
                  </div>
                  <div className="flex items-center" style={{ gap: '0.75rem', flexShrink: 0 }}>
                    <span
                      className={`text-xs font-medium ${debug ? 'text-green-700' : 'text-red-700'}`}
                    >
                      {debug ? 'On' : 'Off'}
                    </span>
                    <Switch
                      id="debug-mode"
                      checked={debug}
                      onCheckedChange={setDebug}
                      style={{
                        backgroundColor: debug ? 'rgb(22, 163, 74)' : 'rgb(239, 68, 68)',
                      }}
                    />
                  </div>
                </section>

                {/* Default expanded answers section */}
                <section
                  className="flex items-center justify-between rounded-xl bg-slate-50"
                  style={{ padding: '1rem', gap: '2rem' }}
                >
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}
                  >
                    <Label
                      htmlFor="default-expanded"
                      className="text-sm font-medium text-slate-900"
                    >
                      Default expanded answers
                    </Label>
                    <p className="text-xs text-slate-500">
                      Show full answer text by default instead of summary.
                    </p>
                  </div>
                  <div className="flex items-center" style={{ gap: '0.75rem', flexShrink: 0 }}>
                    <span
                      className={`text-xs font-medium ${defaultExpandedAnswers ? 'text-green-700' : 'text-red-700'}`}
                    >
                      {defaultExpandedAnswers ? 'On' : 'Off'}
                    </span>
                    <Switch
                      id="default-expanded"
                      checked={defaultExpandedAnswers}
                      onCheckedChange={setDefaultExpandedAnswers}
                      style={{
                        backgroundColor: defaultExpandedAnswers
                          ? 'rgb(22, 163, 74)'
                          : 'rgb(239, 68, 68)',
                      }}
                    />
                  </div>
                </section>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </aside>

      <IngestDialog
        open={ingestOpen}
        onOpenChange={setIngestOpen}
        onSuccess={handleIngestSuccess}
      />

      {/* Document Preview Dialog */}
      <DocumentPreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        document={documentToPreview}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;
              {documentToDelete?.title || documentToDelete?.source}
              &quot;? This action cannot be undone and will remove all associated chunks.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setDocumentToDelete(null)
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
