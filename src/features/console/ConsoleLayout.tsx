'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'
import { useLocalStorage } from '@/features/settings/useLocalStorage'

export default function ConsoleLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeChatThreadId, setActiveChatThreadId] = useState<string | null>(null)
  const [chatThreadsRefreshToken, setChatThreadsRefreshToken] = useState(0)
  const bumpChatThreads = useCallback(() => setChatThreadsRefreshToken(t => t + 1), [])
  const [sidebarCollapsedStorage, setSidebarCollapsedStorage] = useLocalStorage<boolean>(
    'rag-eval-sidebar-collapsed',
    false
  )
  // Use state to avoid hydration mismatch - start with false, update after mount
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Update after hydration to match localStorage
  useEffect(() => {
    setSidebarCollapsed(sidebarCollapsedStorage)
  }, [sidebarCollapsedStorage])

  const handleToggleCollapse = () => {
    const newValue = !sidebarCollapsed
    setSidebarCollapsed(newValue)
    setSidebarCollapsedStorage(newValue)
  }

  const handleChatThreadDeleted = useCallback(
    (threadId: string) => {
      if (activeChatThreadId === threadId) {
        setActiveChatThreadId(null)
      }
      bumpChatThreads()
    },
    [activeChatThreadId, bumpChatThreads]
  )

  return (
    <div
      className="grid h-full w-full bg-slate-50"
      style={{
        gridTemplateColumns: sidebarCollapsed ? '64px 1fr' : 'minmax(240px, 280px) 1fr',
        height: '100%',
        maxHeight: '100vh',
        transition: 'grid-template-columns 0.2s ease-in-out',
        overflow: 'hidden',
      }}
    >
      {/* Left: sidebar - collapsible */}
      <div className="relative" style={{ overflow: 'visible' }}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
          activeChatThreadId={activeChatThreadId}
          onSelectChatThread={setActiveChatThreadId}
          onNewChat={() => setActiveChatThreadId(null)}
          chatThreadsRefreshToken={chatThreadsRefreshToken}
          onChatThreadDeleted={handleChatThreadDeleted}
        />
      </div>

      {/* Right: main panel - fills remaining space */}
      <div className="flex min-w-0 overflow-hidden" style={{ minHeight: 0 }}>
        <ChatPanel
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          activeThreadId={activeChatThreadId}
          setActiveThreadId={setActiveChatThreadId}
          onThreadsChanged={bumpChatThreads}
        />
      </div>
    </div>
  )
}
