'use client'

import { useRagSettings } from '@/features/settings/useRagSettings'
import { loadPlaygroundSettings, savePlaygroundSettings } from '@/lib/storage/playgroundSettings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

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
    <div className="flex flex-col min-h-0 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-sm font-semibold text-gray-900">Settings</h2>
        <button
          onClick={handleResetSettings}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Reset
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {/* Query Settings Card */}
        <Card variant="outlined" padding="sm" className="shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Query settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Top K - Compact Row */}
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="settings-topK" className="text-sm font-medium text-gray-900 shrink-0">
                Top K
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setTopK(Math.max(1, topK - 1))}
                  disabled={topK <= 1}
                  className="w-7 h-7 flex items-center justify-center text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Decrease Top K"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 12H4"
                    />
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
                  className="w-16 px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-center font-medium"
                />
                <button
                  type="button"
                  onClick={() => setTopK(Math.min(50, topK + 1))}
                  disabled={topK >= 50}
                  className="w-7 h-7 flex items-center justify-center text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="Increase Top K"
                >
                  <svg
                    className="w-3.5 h-3.5"
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
            </div>

            {/* Debug Mode - Compact Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900">Debug mode</div>
                <div className="text-xs text-gray-500 mt-0.5">Show retrieved chunks and scores</div>
              </div>
              <label htmlFor="settings-debugMode" className="relative shrink-0 cursor-pointer">
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
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Experimental Card */}
        <Card variant="outlined" padding="sm" className="shrink-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Experimental</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Reranker - Disabled */}
            <div className="flex items-center justify-between gap-3 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <svg
                  className="w-4 h-4 text-gray-400 shrink-0"
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
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-700">Reranker</div>
                  <div className="text-xs text-gray-500">Coming soon</div>
                </div>
              </div>
              <div className="w-11 h-6 rounded-full bg-gray-300 shrink-0">
                <div className="w-5 h-5 bg-white rounded-full shadow-sm transform translate-x-0.5 mt-0.5" />
              </div>
            </div>

            {/* Hybrid Search - Disabled */}
            <div className="flex items-center justify-between gap-3 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <svg
                  className="w-4 h-4 text-gray-400 shrink-0"
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
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-700">Hybrid search</div>
                  <div className="text-xs text-gray-500">Coming soon</div>
                </div>
              </div>
              <div className="w-11 h-6 rounded-full bg-gray-300 shrink-0">
                <div className="w-5 h-5 bg-white rounded-full shadow-sm transform translate-x-0.5 mt-0.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
