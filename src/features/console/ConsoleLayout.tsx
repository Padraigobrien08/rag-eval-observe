'use client'

import { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'
import { useLocalStorage } from '@/features/settings/useLocalStorage'

export default function ConsoleLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
        <Sidebar collapsed={sidebarCollapsed} onToggleCollapse={handleToggleCollapse} />
      </div>

      {/* Right: main panel - fills remaining space */}
      <div className="flex min-w-0 overflow-hidden" style={{ minHeight: 0 }}>
        <ChatPanel sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>
    </div>
  )
}
