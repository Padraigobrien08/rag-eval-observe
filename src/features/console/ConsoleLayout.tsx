'use client'

import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'

export default function ConsoleLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* Left: sidebar */}
      <Sidebar />

      {/* Right: main panel - must fill remaining space */}
      <div className="flex min-w-0 flex-1" style={{ minHeight: 0 }}>
        <ChatPanel />
      </div>
    </div>
  )
}
