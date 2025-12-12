'use client'

import { useState, useEffect } from 'react'
import { createNewSessionId } from '@/lib/storage/chatSessions'
import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'

export default function ConsoleLayout() {
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    // Only run on client side
    if (typeof window !== 'undefined') {
      return createNewSessionId()
    }
    return ''
  })
  const [ingestDialogOpen, setIngestDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)

  // Ensure session ID is set on mount (client side only)
  useEffect(() => {
    if (!currentSessionId && typeof window !== 'undefined') {
      setCurrentSessionId(createNewSessionId())
    }
  }, [])

  return (
    <div className="h-screen w-screen grid grid-cols-[280px,1fr] bg-slate-50">
      {/* Left Sidebar */}
      <Sidebar
        onIngestClick={() => setIngestDialogOpen(true)}
        onSettingsClick={() => setSettingsDialogOpen(true)}
        currentSessionId={currentSessionId}
        onSessionSwitch={setCurrentSessionId}
        onNewChat={() => setCurrentSessionId(createNewSessionId())}
        ingestDialogOpen={ingestDialogOpen}
        onIngestDialogClose={() => setIngestDialogOpen(false)}
      />

      {/* Main Chat Panel */}
      <ChatPanel
        sessionId={currentSessionId}
        onSessionSwitch={setCurrentSessionId}
        settingsDialogOpen={settingsDialogOpen}
        onSettingsDialogClose={() => setSettingsDialogOpen(false)}
      />
    </div>
  )
}
