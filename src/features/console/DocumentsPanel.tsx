'use client'

import { useRouter } from 'next/navigation'
import { useRecentIngests } from '@/features/ingest/useRecentIngests'
import { useRagSettings } from './useRagSettings'
import type { RecentIngest } from '@/lib/storage/recentIngests'

interface DocumentsPanelProps {
  refreshTrigger?: number
}

export default function DocumentsPanel({ refreshTrigger }: DocumentsPanelProps) {
  const router = useRouter()
  const { ingests } = useRecentIngests(refreshTrigger)
  const { settings, setDocumentFilter, clearFilters } = useRagSettings()
  const selectedIngest = ingests.find(i => i.source === settings.filterSource)
  const selectedDocumentId = selectedIngest?.document_id || null

  const handleSelectDocument = (ingest: RecentIngest) => {
    setDocumentFilter(ingest.source, ingest.title)
  }

  const handleClearSelection = () => {
    clearFilters()
  }

  const handleNewDocument = () => {
    router.push('/ingest')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-sm font-semibold text-gray-900">Documents</h2>
        <button
          onClick={handleNewDocument}
          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          title="Ingest new document"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </div>

      {/* Local label */}
      <div className="mb-2 px-1">
        <span className="text-xs text-gray-400 italic">Local</span>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto">
        {ingests.length === 0 ? (
          <div className="text-xs text-gray-500 px-1">
            No documents yet. Click + to ingest one.
          </div>
        ) : (
          <div className="space-y-1">
            {selectedDocumentId && (
              <div className="mb-2 px-1">
                <button
                  onClick={handleClearSelection}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear selection
                </button>
              </div>
            )}
            {ingests.map(ingest => {
              const isSelected = selectedDocumentId === ingest.document_id
              return (
                <button
                  key={ingest.document_id}
                  onClick={() => handleSelectDocument(ingest)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    isSelected
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-medium truncate ${
                          isSelected ? 'text-blue-900' : 'text-gray-900'
                        }`}
                      >
                        {ingest.title || ingest.source}
                      </div>
                      <div
                        className={`text-xs mt-0.5 truncate ${
                          isSelected ? 'text-blue-600' : 'text-gray-500'
                        }`}
                      >
                        {ingest.source}
                      </div>
                    </div>
                    <div
                      className={`text-xs flex-shrink-0 ${
                        isSelected ? 'text-blue-600' : 'text-gray-400'
                      }`}
                    >
                      {ingest.chunks_created} chunks
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

