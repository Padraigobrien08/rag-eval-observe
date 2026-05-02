'use client'

import { useState, useEffect, useCallback } from 'react'
import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'
import { useLocalStorage } from '@/features/settings/useLocalStorage'
import { cn } from '@/lib/utils'

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

  const mdGridCols = sidebarCollapsed
    ? 'md:grid-cols-[64px_minmax(0,1fr)]'
    : 'md:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]'

  return (
    <div
      className={cn(
        'relative h-full max-h-screen w-full overflow-hidden bg-slate-50',
        'flex flex-col md:grid md:min-h-0 md:overflow-hidden',
        mdGridCols
      )}
      style={{ height: '100%' }}
    >
      <div
        className={cn(
          'min-h-0 border-r border-slate-200 bg-white',
          'z-50 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:w-[min(280px,92vw)] max-md:shadow-lg',
          'max-md:transition-transform max-md:duration-200 max-md:ease-out',
          sidebarOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full',
          'md:relative md:z-0 md:flex md:h-full md:w-full md:translate-x-0 md:shadow-none'
        )}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleCollapse}
          activeChatThreadId={activeChatThreadId}
          onSelectChatThread={setActiveChatThreadId}
          onNewChat={() => setActiveChatThreadId(null)}
          chatThreadsRefreshToken={chatThreadsRefreshToken}
          onChatThreadDeleted={handleChatThreadDeleted}
          onMobileSidebarClose={() => setSidebarOpen(false)}
          forceExpandedNav={sidebarOpen}
          onThreadsRefreshRequest={bumpChatThreads}
        />
      </div>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:min-h-0">
        <ChatPanel
          setSidebarOpen={setSidebarOpen}
          activeThreadId={activeChatThreadId}
          setActiveThreadId={setActiveChatThreadId}
          onThreadsChanged={bumpChatThreads}
        />
      </div>
    </div>
  )
}
