'use client'

import { useRagSettings } from '@/features/settings/useRagSettings'

interface SettingsOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsOverlay({ isOpen, onClose }: SettingsOverlayProps) {
  const { settings, setTopK, setDebug } = useRagSettings()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Query Settings */}
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Query settings</h3>
            <div className="space-y-4">
              {/* Top K */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Top K</label>
                  <p className="text-xs text-gray-500">Number of chunks to retrieve</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTopK(Math.max(1, settings.topK - 1))}
                    disabled={settings.topK <= 1}
                    className="w-8 h-8 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg
                      className="w-4 h-4 mx-auto"
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
                    type="number"
                    min={1}
                    max={50}
                    value={settings.topK}
                    onChange={e => {
                      const value = parseInt(e.target.value, 10)
                      if (!isNaN(value) && value >= 1 && value <= 50) {
                        setTopK(value)
                      }
                    }}
                    className="w-16 px-2 py-1 text-sm text-center border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => setTopK(Math.min(50, settings.topK + 1))}
                    disabled={settings.topK >= 50}
                    className="w-8 h-8 rounded border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg
                      className="w-4 h-4 mx-auto"
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

              {/* Debug Mode */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Debug mode</label>
                  <p className="text-xs text-gray-500">Show retrieved chunks and scores</p>
                </div>
                <button
                  onClick={() => setDebug(!settings.debug)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.debug ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.debug ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Experimental */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Experimental</h3>
            <div className="space-y-4">
              {/* Reranker */}
              <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-slate-400"
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
                    <label className="text-sm font-medium text-gray-700">Reranker</label>
                    <p className="text-xs text-gray-500">Coming soon</p>
                  </div>
                </div>
                <div className="w-11 h-6 rounded-full bg-slate-200" />
              </div>

              {/* Hybrid Search */}
              <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 text-slate-400"
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
                    <label className="text-sm font-medium text-gray-700">Hybrid search</label>
                    <p className="text-xs text-gray-500">Coming soon</p>
                  </div>
                </div>
                <div className="w-11 h-6 rounded-full bg-slate-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
