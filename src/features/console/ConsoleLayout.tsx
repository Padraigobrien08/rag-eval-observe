'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import ChatConsole from './ChatConsole'
import ChatsPanel from './ChatsPanel'
import DocumentsPanel from './DocumentsPanel'
import SettingsPanel from './SettingsPanel'
import {
  loadSidebarPreferences,
  saveSidebarPreferences,
  MIN_WIDTH,
  MAX_WIDTH,
} from '@/lib/storage/sidebarPreferences'
import { createNewSessionId } from '@/lib/storage/chatSessions'

export default function ConsoleLayout() {
  const [documentsRefreshTrigger, setDocumentsRefreshTrigger] = useState(0)
  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  const [sidebarWidth, setSidebarWidth] = useState(() => loadSidebarPreferences().width)
  const [isCollapsed, setIsCollapsed] = useState(() => loadSidebarPreferences().collapsed)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Initialize session ID on client side only
  useEffect(() => {
    if (!currentSessionId) {
      setCurrentSessionId(createNewSessionId())
    }
  }, [currentSessionId])

  // Load preferences on mount
  useEffect(() => {
    const prefs = loadSidebarPreferences()
    setSidebarWidth(prefs.width)
    setIsCollapsed(prefs.collapsed)
  }, [])

  // Save preferences when they change
  useEffect(() => {
    saveSidebarPreferences({ width: sidebarWidth, collapsed: isCollapsed })
  }, [sidebarWidth, isCollapsed])

  // Handle mouse down on resize handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  // Handle mouse move for resizing
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!sidebarRef.current) return

      const newWidth = e.clientX
      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth))
      setSidebarWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  const toggleCollapse = () => {
    setIsCollapsed(prev => !prev)
  }

  return (
    <div
      className={`h-screen w-screen flex overflow-hidden bg-gray-50 relative ${
        isResizing ? 'select-none' : ''
      }`}
      style={{ height: '100vh', width: '100vw' }}
    >
      {/* Left Sidebar - Resizable */}
      {!isCollapsed && (
        <div
          ref={sidebarRef}
          className="shrink-0 h-full border-r border-gray-200 flex flex-col min-h-0 bg-white relative"
          style={{ width: `${sidebarWidth}px`, height: '100%' }}
        >
          {/* Collapse Button */}
          <button
            onClick={toggleCollapse}
            className="absolute -left-6 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-gray-200 border-r-0 rounded-l-md flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm z-20"
            title="Collapse sidebar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Chats Section - Top (smaller) */}
          <div className="h-64 min-h-0 overflow-y-auto p-4 border-b border-gray-200 scrollbar-thin">
            <ChatsPanel
              currentSessionId={currentSessionId}
              onSelectSession={setCurrentSessionId}
              onNewChat={() => setCurrentSessionId(createNewSessionId())}
            />
          </div>

          {/* Documents Section - Middle (flexible) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 border-b border-gray-200 scrollbar-thin">
            <DocumentsPanel refreshTrigger={documentsRefreshTrigger} />
          </div>

          {/* Settings Section - Bottom (smaller) */}
          <div className="h-64 min-h-0 overflow-y-auto p-4 border-t border-gray-200 scrollbar-thin">
            <SettingsPanel />
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize group ${
              isResizing ? 'bg-blue-500' : ''
            }`}
            style={{ zIndex: 10 }}
          >
            <div
              className={`absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 rounded-full transition-opacity ${
                isResizing
                  ? 'bg-blue-500 opacity-100'
                  : 'bg-gray-300 opacity-0 group-hover:opacity-100'
              }`}
            />
          </div>
        </div>
      )}

      {/* Expand Button (when collapsed) */}
      {isCollapsed && (
        <button
          onClick={toggleCollapse}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-12 bg-white border border-gray-200 border-r-0 rounded-l-md flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm z-20"
          title="Expand sidebar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Main Chat Region - Flex-1 */}
      <div
        className="flex-1 min-w-0 h-full flex flex-col min-h-0 overflow-hidden"
        style={{ height: '100%' }}
      >
        <ChatConsole
          sessionId={currentSessionId}
          onSessionSwitch={setCurrentSessionId}
          onIngestSuccess={() => setDocumentsRefreshTrigger(prev => prev + 1)}
        />
      </div>
    </div>
  )
}
