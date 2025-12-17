'use client'

import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'

export default function ConsoleLayout() {
  return (
    <div
      className="grid h-screen w-full overflow-hidden bg-slate-50"
      style={{
        gridTemplateColumns: 'minmax(240px, 280px) 1fr',
        minHeight: '100vh',
      }}
    >
      {/* Left: sidebar */}
      <Sidebar />

      {/* Right: main panel - fills remaining space */}
      <div className="flex min-w-0 overflow-hidden" style={{ minHeight: 0 }}>
        <ChatPanel />
      </div>
    </div>
  )
}
