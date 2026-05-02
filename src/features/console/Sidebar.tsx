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
  DialogFooter,
} from '@/components/ui/dialog'
import { Plus, FileText, Loader2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import IngestDialog from './IngestDialog'
import DocumentPreviewDialog from './DocumentPreviewDialog'
import RagSettingsDialog from './RagSettingsDialog'
import {
  listDocuments,
  deleteDocument,
  listChatThreads,
  deleteChatThread,
  type ChatThreadSummary,
} from '@/lib/api/client'

interface Document {
  id: string
  source: string
  title?: string
  created_at: string
  /** True when ingest stored binary PDF bytes for inline preview */
  original_available?: boolean
}

interface SidebarProps {
  collapsed?: boolean
  onToggleCollapse?: () => void
  activeChatThreadId?: string | null
  onSelectChatThread?: (threadId: string) => void
  onNewChat?: () => void
  chatThreadsRefreshToken?: number
  onChatThreadDeleted?: (threadId: string) => void
}

export default function Sidebar({
  collapsed = false,
  onToggleCollapse,
  activeChatThreadId = null,
  onSelectChatThread,
  onNewChat,
  chatThreadsRefreshToken = 0,
  onChatThreadDeleted,
}: SidebarProps) {
  const [ingestOpen, setIngestOpen] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false)
  const [documentToPreview, setDocumentToPreview] = useState<Document | null>(null)
  const [chatThreads, setChatThreads] = useState<ChatThreadSummary[]>([])
  const [chatThreadsLoading, setChatThreadsLoading] = useState(false)

  const loadDocuments = async () => {
    try {
      setIsLoadingDocs(true)
      const response = await listDocuments()
      setDocuments(response.documents || [])
    } catch (error) {
      setDocuments([])
    } finally {
      setIsLoadingDocs(false)
    }
  }

  useEffect(() => {
    void loadDocuments()
  }, [])

  const loadChatThreads = async () => {
    try {
      setChatThreadsLoading(true)
      const threads = await listChatThreads()
      setChatThreads(threads)
    } catch {
      setChatThreads([])
    } finally {
      setChatThreadsLoading(false)
    }
  }

  useEffect(() => {
    void loadChatThreads()
  }, [chatThreadsRefreshToken])

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

  const handleDeleteChatThread = async (thread: ChatThreadSummary, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteChatThread(thread.id)
      onChatThreadDeleted?.(thread.id)
    } catch (error) {
      toast.error(
        `Failed to delete chat: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
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
      toast.error(
        `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <aside
        className={`relative flex h-full flex-col border-r border-slate-200 bg-white transition-all duration-200 ${
          collapsed ? 'w-16 min-w-[64px] max-w-[64px]' : 'w-full min-w-[240px] max-w-[280px]'
        }`}
      >
        {/* Collapse/Expand Toggle Button - at the top */}
        <div className="flex items-center justify-end border-b border-slate-200 p-2">
          {onToggleCollapse ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                onToggleCollapse()
              }}
              className="h-8 w-8"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="h-8 w-8" />
          )}
        </div>
        <ScrollArea className="flex-1 min-h-0 space-y-6">
          {/* Documents */}
          <div>
            <div
              className={`flex items-center ${collapsed ? 'justify-center px-2' : 'justify-between px-4'} py-2`}
            >
              {!collapsed && (
                <div className="text-xs font-semibold tracking-wide text-slate-500">
                  DOCUMENTS
                  {!isLoadingDocs && documents.length > 0 && (
                    <span className="ml-1.5 text-slate-400 font-normal">({documents.length})</span>
                  )}
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                aria-label="Ingest document"
                onClick={() => setIngestOpen(true)}
                className="h-8 w-8"
                title={collapsed ? 'Ingest document' : undefined}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {isLoadingDocs ? (
              <div
                className={`flex items-center gap-2 ${collapsed ? 'justify-center px-2' : 'px-4'} py-3`}
              >
                <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                {!collapsed && <p className="text-xs text-slate-500">Loading documents...</p>}
              </div>
            ) : documents.length === 0 ? (
              !collapsed && (
                <div className="px-4 py-3">
                  <p className="text-xs text-slate-500">No documents yet.</p>
                  <p className="text-xs text-slate-400 mt-1">Click + to add your first document.</p>
                </div>
              )
            ) : (
              <div className={`space-y-0.5 ${collapsed ? 'px-1' : 'px-2'}`}>
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className={`w-full flex items-center ${collapsed ? 'justify-center' : 'gap-2'} px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 rounded-md transition-colors group`}
                    title={collapsed ? doc.title || doc.source : undefined}
                  >
                    <button
                      type="button"
                      onClick={() => handleDocumentClick(doc)}
                      className={`flex-1 flex items-center ${collapsed ? 'justify-center' : 'gap-2 text-left'} truncate hover:text-slate-900`}
                      title={collapsed ? `View ${doc.title || doc.source}` : undefined}
                    >
                      <FileText className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 flex-shrink-0" />
                      {!collapsed && (
                        <span className="flex-1 truncate">{doc.title || doc.source}</span>
                      )}
                    </button>
                    {!collapsed && (
                      <button
                        type="button"
                        onClick={e => handleDeleteClick(doc, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-50 rounded text-red-600 hover:text-red-700"
                        aria-label={`Delete ${doc.title || doc.source}`}
                        title="Delete document"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chats */}
          {!collapsed && (
            <div className="border-t border-slate-100 pt-2">
              <div className="flex items-center justify-between px-4 py-2">
                <div className="text-xs font-semibold tracking-wide text-slate-500">CHATS</div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="New chat"
                  onClick={() => onNewChat?.()}
                  className="h-8 w-8"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {chatThreadsLoading ? (
                <div className="flex justify-center px-4 py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden />
                </div>
              ) : chatThreads.length === 0 ? (
                <p className="px-4 pb-4 text-xs text-slate-500">
                  No chats yet. Send a message to start one.
                </p>
              ) : (
                <div className="max-h-[40vh] space-y-1 overflow-y-auto px-2 pb-4">
                  {chatThreads.map(thread => {
                    const label =
                      thread.title?.trim() ||
                      `Chat · ${thread.updated_at?.slice(0, 10) ?? thread.id.slice(0, 8)}`
                    const selected = activeChatThreadId === thread.id
                    return (
                      <div
                        key={thread.id}
                        className={`group flex items-center gap-1 rounded-md px-2 ${selected ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectChatThread?.(thread.id)}
                          className="min-w-0 flex-1 truncate px-2 py-2 text-left text-xs text-slate-700"
                          title={label}
                        >
                          <span className="block truncate font-medium">{label}</span>
                          {typeof thread.message_count === 'number' && thread.message_count > 0 ? (
                            <span className="text-[10px] text-slate-400">
                              {thread.message_count} message
                              {thread.message_count === 1 ? '' : 's'}
                            </span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={e => void handleDeleteChatThread(thread, e)}
                          className="rounded p-1.5 text-slate-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                          aria-label={`Delete chat "${label}"`}
                          title="Delete chat"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <div
          className={`flex border-t border-slate-200 ${collapsed ? 'justify-center px-2' : 'px-2'} py-2`}
        >
          <RagSettingsDialog collapsed={collapsed} />
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
