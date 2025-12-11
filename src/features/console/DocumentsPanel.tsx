'use client'

import { useRouter } from 'next/navigation'
import { useRecentIngests } from '@/features/ingest/useRecentIngests'
import { useRagSettings } from '@/features/settings/useRagSettings'
import type { RecentIngest } from '@/lib/storage/recentIngests'

interface DocumentsPanelProps {
  refreshTrigger?: number
}

export default function DocumentsPanel({ refreshTrigger }: DocumentsPanelProps) {
  const router = useRouter()
  const { ingests } = useRecentIngests(refreshTrigger)
  const { settings, selectDocument, clearDocumentSelection } = useRagSettings()
  const selectedIngest = ingests.find(i => i.source === settings.activeDocument?.source)
  const selectedDocumentId = selectedIngest?.document_id || null

  const handleSelectDocument = (ingest: RecentIngest) => {
    selectDocument({ source: ingest.source, title: ingest.title })
  }

  const handleClearSelection = () => {
    clearDocumentSelection()
  }

  const handleNewDocument = () => {
    router.push('/ingest')
  }

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Title Row */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900">Documents</h2>
        <button
          onClick={handleNewDocument}
          className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors"
          title="Ingest new document"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Sub-label */}
      <div className="mb-3">
        <span className="text-xs text-gray-400">Local</span>
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        {ingests.length === 0 ? (
          <div className="text-xs text-gray-500">
            No documents yet.{' '}
            <button
              onClick={handleNewDocument}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Click + to ingest
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {selectedDocumentId && (
              <div className="mb-2">
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
                  className={`w-full text-left rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-blue-50/60 border-l-2 border-blue-500'
                      : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-start gap-3 px-3 py-2.5">
                    {/* Document Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      <svg
                        className="w-4 h-4 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div
                        className={`text-sm font-semibold truncate ${
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

                    {/* Chunks Badge */}
                    <div className="flex-shrink-0">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          isSelected
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {ingest.chunks_created} chunks
                      </span>
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
