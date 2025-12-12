'use client'

import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'

export default function ConsoleLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Left: sidebar */}
      <Sidebar />

      {/* Right: main panel */}
      <ChatPanel />
    </div>
  )
}
