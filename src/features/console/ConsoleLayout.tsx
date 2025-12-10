'use client'

import { useState } from 'react'
import ChatConsole from './ChatConsole'
import DocumentsPanel from './DocumentsPanel'
import { useRagSettings } from './useRagSettings'
import RecentIngests from '@/components/RecentIngests'

export default function ConsoleLayout() {
  const {
    settings,
    updateTopK,
    updateDebugMode,
    updateFilterSource,
    updateFilterTitle,
    clearFilters,
  } = useRagSettings()
  const { topK, debug: debugMode, filterSource, filterTitle } = settings
  const [filtersExpanded, setFiltersExpanded] = useState(false)
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
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Settings</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="topK" className="block text-sm font-medium text-gray-700 mb-2">
                Top K
              </label>
              <input
                id="topK"
                type="number"
                min="1"
                max="100"
                value={topK}
                onChange={e => updateTopK(parseInt(e.target.value) || 8)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                className="flex items-center justify-between w-full text-left mb-3"
              >
                <h3 className="text-sm font-medium text-gray-700">Filters</h3>
                <svg
                  className={`w-4 h-4 text-gray-400 transform transition-transform ${
                    filtersExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {filtersExpanded && (
                <div className="space-y-3">
                  <div>
                    <label
                      htmlFor="filterSource"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Source
                    </label>
                    <input
                      id="filterSource"
                      type="text"
                      value={filterSource}
                      onChange={e => updateFilterSource(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Filter by source..."
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="filterTitle"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Title
                    </label>
                    <input
                      id="filterTitle"
                      type="text"
                      value={filterTitle}
                      onChange={e => updateFilterTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Filter by title..."
                    />
                  </div>
                  {(filterSource || filterTitle) && (
                    <button
                      onClick={clearFilters}
                      className="w-full px-3 py-1.5 text-xs text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                      Clear Filters
                    </button>
                  )}
                  <div className="pt-3 border-t">
                    <RecentIngests
                      onSelect={ingest => {
                        updateFilterSource(ingest.source)
                        if (ingest.title) {
                          updateFilterTitle(ingest.title)
                        }
                        if (!filtersExpanded) {
                          setFiltersExpanded(true)
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="debugMode"
                type="checkbox"
                checked={debugMode}
                onChange={e => updateDebugMode(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="debugMode" className="ml-2 block text-sm text-gray-700">
                Debug mode
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Region - Flex-1 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatConsole
          settings={settings}
          onIngestSuccess={() => setDocumentsRefreshTrigger(prev => prev + 1)}
        />
      </div>
    </div>
  )
}

