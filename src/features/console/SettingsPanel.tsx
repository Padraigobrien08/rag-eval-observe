'use client'

import { useRagSettings } from '@/features/settings/useRagSettings'
import { loadPlaygroundSettings, savePlaygroundSettings } from '@/lib/storage/playgroundSettings'

export default function SettingsPanel() {
  const { settings, setTopK, setDebug, setFilters, clearDocumentSelection } = useRagSettings()
  const { topK, debug } = settings

  const handleResetSettings = () => {
    const defaultSettings = loadPlaygroundSettings()
    // Reset to defaults
    setTopK(defaultSettings.topK)
    setDebug(defaultSettings.debug)
    clearDocumentSelection()
    // Save defaults
    savePlaygroundSettings(defaultSettings)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">Settings</h2>
        <button
          onClick={handleResetSettings}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Reset
        </button>
      </div>

      <div className="space-y-4">
        {/* Top K Input */}
        <div>
          <label htmlFor="settings-topK" className="block text-sm font-medium text-gray-700 mb-2">
            Top K
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTopK(Math.max(1, topK - 1))}
              disabled={topK <= 1}
              className="px-2 py-1 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Decrease Top K"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <input
              id="settings-topK"
              type="number"
              min="1"
              max="50"
              value={topK}
              onChange={e => {
                const value = parseInt(e.target.value)
                if (!isNaN(value) && value >= 1 && value <= 50) {
                  setTopK(value)
                }
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-center"
            />
            <button
              type="button"
              onClick={() => setTopK(Math.min(50, topK + 1))}
              disabled={topK >= 50}
              className="px-2 py-1 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Increase Top K"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">Number of chunks to retrieve (1-50)</p>
        </div>

        {/* Debug Mode Checkbox */}
        <div className="flex items-center">
          <input
            id="settings-debugMode"
            type="checkbox"
            checked={debug}
            onChange={e => setDebug(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="settings-debugMode" className="ml-2 block text-sm text-gray-700">
            Debug mode
          </label>
        </div>
        <p className="text-xs text-gray-500 -mt-2">Show retrieved chunks and scores in responses</p>

        {/* Placeholder: Reranker */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between opacity-50">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reranker</label>
              <p className="text-xs text-gray-500">Coming soon</p>
            </div>
            <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-400">
              Off
            </div>
          </div>
        </div>

        {/* Placeholder: Hybrid Search */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between opacity-50">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hybrid search</label>
              <p className="text-xs text-gray-500">Coming soon</p>
            </div>
            <div className="px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-400">
              Off
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
