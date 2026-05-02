'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Plus, FileText, Loader2, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import IngestDialog from './IngestDialog'
import DocumentPreviewDialog from './DocumentPreviewDialog'
import RagSettingsDialog from './RagSettingsDialog'
import {
  listDocuments,
  deleteDocument,
  listChatThreads,
  deleteChatThread,
  updateChatThread,
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
  /** Close mobile overlay drawer after navigating (no-op on desktop). */
  onMobileSidebarClose?: () => void
  /** When true (e.g. mobile drawer open), ignore desktop collapsed width so chats/documents stay readable. */
  forceExpandedNav?: boolean
  /** Bump parent refresh token after local thread list mutations (rename, etc.). */
  onThreadsRefreshRequest?: () => void
}

export default function Sidebar({
  collapsed = false,
  onToggleCollapse,
  activeChatThreadId = null,
  onSelectChatThread,
  onNewChat,
  chatThreadsRefreshToken = 0,
  onChatThreadDeleted,
  onMobileSidebarClose,
  forceExpandedNav = false,
  onThreadsRefreshRequest,
}: SidebarProps) {
  const navCollapsed = forceExpandedNav ? false : collapsed
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
  const [renameThread, setRenameThread] = useState<ChatThreadSummary | null>(null)
  const [renameTitle, setRenameTitle] = useState('')
  const [renameSaving, setRenameSaving] = useState(false)

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

  const openDocumentDeleteDialog = (doc: Document) => {
    setDocumentToDelete(doc)
    setDeleteDialogOpen(true)
  }

  const handleRenameSave = async () => {
    if (!renameThread) return
    const title = renameTitle.trim()
    if (title.length < 1) {
      toast.error('Title cannot be empty')
      return
    }
    setRenameSaving(true)
    try {
      await updateChatThread(renameThread.id, { title })
      setRenameThread(null)
      await loadChatThreads()
      onThreadsRefreshRequest?.()
      toast.success('Chat renamed')
    } catch (error) {
      toast.error(`Failed to rename: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setRenameSaving(false)
    }
  }

  const handleDeleteChatThread = async (thread: ChatThreadSummary) => {
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
          navCollapsed ? 'w-16 min-w-[64px] max-w-[64px]' : 'w-full min-w-[240px] max-w-[280px]'
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
              aria-label={navCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {navCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <div className="h-8 w-8" />
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-6 pb-3">
            {/* Documents */}
            <div>
              <div
                className={`flex items-center ${navCollapsed ? 'justify-center px-2' : 'justify-between pl-4 pr-5'} py-2`}
              >
                {!navCollapsed && (
                  <div className="text-xs font-semibold tracking-wide text-slate-500">
                    DOCUMENTS
                    {!isLoadingDocs && documents.length > 0 && (
                      <span className="ml-1.5 text-slate-400 font-normal">
                        ({documents.length})
                      </span>
                    )}
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Ingest document"
                  onClick={() => setIngestOpen(true)}
                  className="h-8 w-8"
                  title={navCollapsed ? 'Ingest document' : undefined}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {isLoadingDocs ? (
                <div
                  className={`flex items-center gap-2 ${navCollapsed ? 'justify-center px-2' : 'pl-4 pr-5'} py-3`}
                >
                  <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                  {!navCollapsed && <p className="text-xs text-slate-500">Loading documents...</p>}
                </div>
              ) : documents.length === 0 ? (
                !navCollapsed && (
                  <div className="py-3 pl-4 pr-5">
                    <p className="text-xs text-slate-500">No documents yet.</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Click + to add your first document.
                    </p>
                  </div>
                )
              ) : (
                <div className={`space-y-0.5 ${navCollapsed ? 'px-1' : 'pl-4 pr-5'}`}>
                  {documents.map(doc => {
                    const docLabel = doc.title || doc.source
                    return (
                      <div
                        key={doc.id}
                        className={`group flex min-w-0 items-center gap-1.5 rounded-md py-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-50 ${navCollapsed ? 'justify-center px-1' : 'pl-2 pr-2'}`}
                        title={navCollapsed ? docLabel : undefined}
                      >
                        {navCollapsed ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex h-9 w-9 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                                aria-label={`Document menu: ${docLabel}`}
                                title={docLabel}
                              >
                                <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center" side="right" className="w-44">
                              <DropdownMenuItem
                                onClick={() => {
                                  handleDocumentClick(doc)
                                }}
                              >
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:bg-red-50 focus:text-red-600"
                                onClick={() => openDocumentDeleteDialog(doc)}
                              >
                                Delete document…
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleDocumentClick(doc)}
                              className="min-w-0 flex-1 truncate px-1 py-1.5 text-left hover:text-slate-900"
                              title={`View ${docLabel}`}
                            >
                              <span className="flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover:text-slate-600" />
                                <span className="min-w-0 flex-1 truncate">{docLabel}</span>
                              </span>
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-slate-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                                  aria-label={`More actions for ${docLabel}`}
                                  onClick={e => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onClick={e => {
                                    e.preventDefault()
                                    handleDocumentClick(doc)
                                  }}
                                >
                                  Preview
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:bg-red-50 focus:text-red-600"
                                  onClick={e => {
                                    e.preventDefault()
                                    openDocumentDeleteDialog(doc)
                                  }}
                                >
                                  Delete document…
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Chats */}
            {!navCollapsed && (
              <div className="border-t border-slate-100 pt-2">
                <div className="flex items-center justify-between py-2 pl-4 pr-5">
                  <div className="text-xs font-semibold tracking-wide text-slate-500">CHATS</div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="New chat"
                    onClick={() => {
                      onNewChat?.()
                      onMobileSidebarClose?.()
                    }}
                    className="h-8 w-8"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {chatThreadsLoading ? (
                  <div className="flex justify-center py-6 pl-4 pr-5">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-hidden />
                  </div>
                ) : chatThreads.length === 0 ? (
                  <p className="pb-4 pl-4 pr-5 text-xs text-slate-500">
                    No chats yet. Send a message to start one.
                  </p>
                ) : (
                  <div className="space-y-1 pb-3 pl-4 pr-5">
                    {chatThreads.map(thread => {
                      const label =
                        thread.title?.trim() ||
                        `Chat · ${thread.updated_at?.slice(0, 10) ?? thread.id.slice(0, 8)}`
                      const selected = activeChatThreadId === thread.id
                      return (
                        <div
                          key={thread.id}
                          className={`group flex min-w-0 items-center gap-1 rounded-md py-0.5 pl-2 pr-2 ${selected ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                        >
                          <button
                            type="button"
                            data-testid={`chat-thread-${thread.id}`}
                            onClick={() => {
                              onSelectChatThread?.(thread.id)
                              onMobileSidebarClose?.()
                            }}
                            className="min-w-0 flex-1 truncate px-1 py-2 text-left text-xs text-slate-700"
                            title={label}
                          >
                            <span className="block truncate font-medium">{label}</span>
                            {typeof thread.message_count === 'number' &&
                            thread.message_count > 0 ? (
                              <span className="text-[10px] text-slate-400">
                                {thread.message_count} message
                                {thread.message_count === 1 ? '' : 's'}
                              </span>
                            ) : null}
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-slate-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                                aria-label={`More actions for ${label}`}
                                onClick={e => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={e => {
                                  e.preventDefault()
                                  setRenameThread(thread)
                                  setRenameTitle(thread.title?.trim() || label)
                                }}
                              >
                                Rename thread
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:bg-red-50 focus:text-red-600"
                                onClick={e => {
                                  e.preventDefault()
                                  void handleDeleteChatThread(thread)
                                }}
                              >
                                Delete chat
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div
          className={`flex border-t border-slate-200 py-2 ${navCollapsed ? 'justify-center px-2' : 'justify-start px-4'}`}
        >
          <RagSettingsDialog collapsed={navCollapsed} />
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

      <Dialog
        open={renameThread !== null}
        onOpenChange={open => {
          if (!open) setRenameThread(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rename chat</DialogTitle>
            <DialogDescription>Updates the title shown in the sidebar list.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameTitle}
            onChange={e => setRenameTitle(e.target.value)}
            placeholder="Thread title"
            maxLength={200}
            aria-label="New chat title"
            className="mt-2"
            onKeyDown={e => {
              if (e.key === 'Enter') void handleRenameSave()
            }}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              type="button"
              onClick={() => setRenameThread(null)}
              disabled={renameSaving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleRenameSave()} disabled={renameSaving}>
              {renameSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
