'use client'

import { useState, useEffect } from 'react'
import {
  loadRecentIngests,
  clearRecentIngests,
  type RecentIngest,
} from '@/lib/storage/recentIngests'

interface RecentIngestsProps {
  onSelect?: (ingest: RecentIngest) => void
  showUseAsFilter?: boolean
  onUseAsFilter?: (ingest: RecentIngest) => void
  refreshTrigger?: number // When this changes, reload ingests
}

export default function RecentIngests({
  onSelect,
  showUseAsFilter = false,
  onUseAsFilter,
  refreshTrigger,
}: RecentIngestsProps) {
  const [recentIngests, setRecentIngests] = useState<RecentIngest[]>([])
  const [selectedId, setSelectedId] = useState<string>('')

  useEffect(() => {
    setRecentIngests(loadRecentIngests())
  }, [refreshTrigger])

  const handleSelect = (ingest: RecentIngest) => {
    setSelectedId(ingest.document_id)
    onSelect?.(ingest)
  }

  const handleClear = () => {
    clearRecentIngests()
    setRecentIngests([])
    setSelectedId('')
  }

  const handleUseAsFilter = (ingest: RecentIngest) => {
    onUseAsFilter?.(ingest)
  }

  if (recentIngests.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No recent ingests. Ingest a document to see it here.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Recent Ingests ({recentIngests.length})
        </label>
        <button
          onClick={handleClear}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Clear
        </button>
      </div>
      <select
        value={selectedId}
        onChange={e => {
          const ingest = recentIngests.find(i => i.document_id === e.target.value)
          if (ingest) {
            handleSelect(ingest)
          }
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
      >
        <option value="">Select an ingest...</option>
        {recentIngests.map(ingest => (
          <option key={ingest.document_id} value={ingest.document_id}>
            {ingest.title || ingest.source} ({ingest.chunks_created} chunks)
          </option>
        ))}
      </select>
      {selectedId && showUseAsFilter && (
        <button
          onClick={() => {
            const ingest = recentIngests.find(i => i.document_id === selectedId)
            if (ingest) {
              handleUseAsFilter(ingest)
            }
          }}
          className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Use as Playground Filter
        </button>
      )}
      {selectedId && (
        <div className="text-xs text-gray-500 space-y-1">
          {recentIngests
            .find(i => i.document_id === selectedId)
            ?.created_at && (
            <div>
              Ingested:{' '}
              {new Date(
                recentIngests.find(i => i.document_id === selectedId)!.created_at
              ).toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

