'use client'

import { useState } from 'react'
import ChatConsole from './ChatConsole'
import DocumentsPanel from './DocumentsPanel'
import SettingsPanel from './SettingsPanel'

export default function ConsoleLayout() {
  const [documentsRefreshTrigger, setDocumentsRefreshTrigger] = useState(0)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Left Sidebar - Fixed width */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Documents Section - Top Half */}
        <div className="h-[calc(50vh-1px)] overflow-y-auto p-4 border-b border-gray-200">
          <DocumentsPanel refreshTrigger={documentsRefreshTrigger} />
        </div>

        {/* Settings Section - Bottom Half */}
        <div className="flex-1 overflow-y-auto p-4">
          <SettingsPanel />
        </div>
      </div>

      {/* Main Chat Region - Flex-1 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatConsole
          onIngestSuccess={() => setDocumentsRefreshTrigger(prev => prev + 1)}
        />
      </div>
    </div>
  )
}

