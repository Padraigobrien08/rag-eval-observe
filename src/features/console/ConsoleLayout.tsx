'use client'

import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'

export default function ConsoleLayout() {
  return (
    <div className="flex overflow-hidden bg-slate-50" style={{ height: '100vh', width: '100vw' }}>
      {/* Left: sidebar */}
      <Sidebar />

      {/* Right: main panel - must fill remaining space */}
      <div className="flex min-w-0" style={{ flex: '1 1 0%', minHeight: 0, height: '100%' }}>
        <ChatPanel />
      </div>
    </div>
  )
}
