'use client'

import { useMemo, useState } from 'react'
import { loadChatSessions, deleteChatSession } from '@/lib/storage/chatSessions'

interface ChatsPanelProps {
  currentSessionId?: string
  onSelectSession: (sessionId: string) => void
  onNewChat: () => void
}

export default function ChatsPanel({
  currentSessionId,
  onSelectSession,
  onNewChat,
}: ChatsPanelProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const sessions = useMemo(() => {
    const allSessions = loadChatSessions()
    // Sort by updatedAt (most recent first)
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

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    if (confirm('Delete this chat session?')) {
      deleteChatSession(sessionId)
      // If deleting current session, switch to new one
      if (sessionId === currentSessionId) {
        onNewChat()
      }
      // Force re-render
      setRefreshTrigger(prev => prev + 1)
    }
  }

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">Chats</h2>
        <button
          onClick={onNewChat}
          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
          title="New chat"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        {sessions.length === 0 ? (
          <div className="text-xs text-gray-500">
            No chat sessions yet.{' '}
            <button onClick={onNewChat} className="text-blue-600 hover:text-blue-700 underline">
              Start a new chat
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {sessions.map(session => {
              const isActive = session.id === currentSessionId
              const firstPrompt = session.firstPrompt || 'New chat'

              return (
                <div
                  key={session.id}
                  onClick={() => onSelectSession(session.id)}
                  className={`group relative flex items-start gap-2 rounded-xl px-3 py-2 hover:bg-slate-100 cursor-pointer transition-colors ${
                    isActive ? 'border border-blue-200 bg-blue-50/70' : ''
                  }`}
                >
                  {/* Left stripe for active state */}
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500 rounded-l-xl" />
                  )}

                  {/* Chat Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-semibold truncate ${
                        isActive ? 'text-blue-900' : 'text-gray-900'
                      }`}
                    >
                      {firstPrompt}
                    </div>
                    <div
                      className={`text-xs mt-0.5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`}
                    >
                      {formatDate(session.updatedAt)}
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={e => handleDelete(e, session.id)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete session"
                  >
                    <svg
                      className="w-3.5 h-3.5"
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
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
