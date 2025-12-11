'use client'

import { useRagSettings } from '@/features/settings/useRagSettings'
import { loadPlaygroundSettings, savePlaygroundSettings } from '@/lib/storage/playgroundSettings'
import { Card, CardContent } from '@/components/ui/Card'

export default function SettingsPanel() {
  const { settings, setTopK, setDebug, clearDocumentSelection } = useRagSettings()
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
    <div className="flex flex-col min-h-0 h-full">
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

      {/* Settings Card */}
      <Card variant="outlined" padding="md" className="flex-1 min-h-0 flex flex-col">
        <CardContent className="flex-1 min-h-0 overflow-y-auto -mx-2 px-2">
          <div className="space-y-5">
            {/* Top K Stepper */}
            <div>
              <label htmlFor="settings-topK" className="block text-sm font-medium text-gray-900 mb-1.5">
                Top K
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTopK(Math.max(1, topK - 1))}
                  disabled={topK <= 1}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-center font-medium"
                />
                <button
                  type="button"
                  onClick={() => setTopK(Math.min(50, topK + 1))}
                  disabled={topK >= 50}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
              <p className="mt-1.5 text-xs text-gray-500">Number of chunks to retrieve (1-50)</p>
            </div>

            {/* Debug Mode Toggle */}
            <div>
              <label
                htmlFor="settings-debugMode"
                className="flex items-center justify-between cursor-pointer"
              >
                <div>
                  <span className="block text-sm font-medium text-gray-900 mb-0.5">Debug mode</span>
                  <span className="text-xs text-gray-500">
                    Show retrieved chunks and scores in responses
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="settings-debugMode"
                    type="checkbox"
                    checked={debug}
                    onChange={e => setDebug(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-11 h-6 rounded-full transition-colors ${
                      debug ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full shadow-sm transform transition-transform mt-0.5 ${
                        debug ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </div>
                </div>
              </label>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Reranker - Disabled */}
            <div className="opacity-60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
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
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Reranker</span>
                    <span className="text-xs text-gray-500">Coming soon</span>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                  Off
                </span>
              </div>
            </div>

            {/* Hybrid Search - Disabled */}
            <div className="opacity-60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
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
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <div>
                    <span className="block text-sm font-medium text-gray-700">Hybrid search</span>
                    <span className="text-xs text-gray-500">Coming soon</span>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                  Off
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
