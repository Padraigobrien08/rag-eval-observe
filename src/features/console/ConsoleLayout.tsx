'use client'

import { useState } from 'react'
import ChatConsole from './ChatConsole'
import DocumentsPanel from './DocumentsPanel'
import SettingsPanel from './SettingsPanel'

export default function ConsoleLayout() {
  const [documentsRefreshTrigger, setDocumentsRefreshTrigger] = useState(0)

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-50" style={{ height: '100vh', width: '100vw' }}>
      {/* Left Sidebar - Fixed width */}
      <div className="w-80 shrink-0 h-full border-r border-gray-200 flex flex-col min-h-0 bg-white" style={{ height: '100%' }}>
        {/* Documents Section - Top Half */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 border-b border-gray-200">
          <DocumentsPanel refreshTrigger={documentsRefreshTrigger} />
        </div>

        {/* Settings Section - Bottom Half */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 border-t border-gray-200">
          <SettingsPanel />
        </div>
      </div>

      {/* Main Chat Region - Flex-1 */}
      <div className="flex-1 min-w-0 h-full flex flex-col min-h-0 overflow-hidden" style={{ height: '100%' }}>
        <ChatConsole onIngestSuccess={() => setDocumentsRefreshTrigger(prev => prev + 1)} />
      </div>
    </div>
  )
}
