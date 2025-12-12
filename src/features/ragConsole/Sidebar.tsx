'use client'

import { useMemo, useState } from 'react'
import { loadChatSessions, deleteChatSession } from '@/lib/storage/chatSessions'
import { useRecentIngests } from '@/features/ingest/useRecentIngests'
import { useRagSettings } from '@/features/settings/useRagSettings'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, MessageCircle, Plus, Settings, FilePlus2 } from 'lucide-react'
import IngestDialog from './IngestDialog'

interface SidebarProps {
  onIngestClick: () => void
  onSettingsClick: () => void
  currentSessionId?: string
  onSessionSwitch: (sessionId: string) => void
  onNewChat: () => void
  ingestDialogOpen: boolean
  onIngestDialogClose: () => void
}

export default function Sidebar({
  onIngestClick,
  onSettingsClick,
  currentSessionId,
  onSessionSwitch,
  onNewChat,
  ingestDialogOpen,
  onIngestDialogClose,
}: SidebarProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { ingests } = useRecentIngests()
  const { settings, selectDocument, clearDocumentSelection } = useRagSettings()

  const sessions = useMemo(() => {
    const allSessions = loadChatSessions()
    return Object.values(allSessions).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Just now'
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`

      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(date)
    } catch {
      return 'Unknown'
    }
  }

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    if (confirm('Delete this chat session?')) {
      deleteChatSession(sessionId)
      if (sessionId === currentSessionId) {
        onNewChat()
      }
      setRefreshTrigger(prev => prev + 1)
    }
  }

  const handleDocumentClick = (ingest: { source: string; title?: string }) => {
    selectDocument({ source: ingest.source, title: ingest.title })
  }

  return (
    <>
      <div className="flex flex-col h-full border-r border-slate-200 bg-white">
        {/* Top Scrollable Area */}
        <ScrollArea className="flex-1 min-h-0 px-3 py-4 space-y-6">
          {/* Documents Section */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Documents</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Ingest document"
                onClick={onIngestClick}
              >
                <FilePlus2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {ingests.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-2">No documents yet</p>
              ) : (
                <>
                  {ingests.map(ingest => {
                    const isActive =
                      settings.activeDocument?.source === ingest.source &&
                      settings.activeDocument?.title === ingest.title

                    return (
                      <div
                        key={ingest.document_id}
                        onClick={() => handleDocumentClick(ingest)}
                        className={`flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 cursor-pointer text-sm transition-colors ${
                          isActive
                            ? 'bg-blue-50 border border-blue-100'
                            : 'border border-transparent'
                        }`}
                      >
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 truncate">
                            {ingest.title || ingest.source}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {ingest.source}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground flex-shrink-0">
                          {ingest.chunks_created}
                        </div>
                      </div>
                    )
                  })}
                  {settings.activeDocument && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-xs"
                      onClick={clearDocumentSelection}
                    >
                      Clear filter
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Chats Section */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <span>Chats</span>
              <Button variant="ghost" size="icon" aria-label="New chat" onClick={onNewChat}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-1">
              {sessions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic px-2">
                  No chats yet. Start a new chat.
                </p>
              ) : (
                sessions.map(session => {
                  const isActive = session.id === currentSessionId
                  const firstPrompt = session.firstPrompt || 'New chat'

                  return (
                    <div
                      key={session.id}
                      onClick={() => onSessionSwitch(session.id)}
                      className={`flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 cursor-pointer text-sm transition-colors ${
                        isActive ? 'bg-blue-50 border border-blue-100' : 'border border-transparent'
                      }`}
                    >
                      <MessageCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-slate-900 truncate">{firstPrompt}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(session.updatedAt)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100"
                        onClick={e => handleDeleteSession(e, session.id)}
                        title="Delete session"
                      >
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </Button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Settings Trigger - Bottom Fixed */}
        <div className="border-t border-slate-200 px-3 py-3 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500">Settings</span>
          <Button variant="ghost" size="icon" aria-label="Open settings" onClick={onSettingsClick}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Ingest Dialog */}
      <IngestDialog isOpen={ingestDialogOpen} onClose={onIngestDialogClose} />
    </>
  )
}
