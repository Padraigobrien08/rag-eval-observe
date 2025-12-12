'use client'

import { useState, useRef } from 'react'
import { ingestDoc } from '@/lib/api/client'
import type { IngestRequest } from '@/lib/api/types'
import { saveRecentIngest } from '@/lib/storage/recentIngests'
import { useRecentIngests } from '@/features/ingest/useRecentIngests'

interface IngestOverlayProps {
  isOpen: boolean
  onClose: () => void
}

export default function IngestOverlay({ isOpen, onClose }: IngestOverlayProps) {
  const [mode, setMode] = useState<'drop' | 'manual'>('drop')
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { refresh } = useRecentIngests()

  if (!isOpen) return null

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files)
    const textFiles = files.filter(
      f => f.type === 'text/plain' || f.name.endsWith('.txt') || f.name.endsWith('.md')
    )

    if (textFiles.length > 0) {
      const file = textFiles[0]
      const reader = new FileReader()
      reader.onload = e => {
        const content = e.target?.result as string
        setText(content)
        setSource(file.name)
        setTitle(file.name.replace(/\.(txt|md)$/i, ''))
        setMode('manual')
      }
      reader.readAsText(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = e => {
        const content = e.target?.result as string
        setText(content)
        setSource(file.name)
        setTitle(file.name.replace(/\.(txt|md)$/i, ''))
        setMode('manual')
      }
      reader.readAsText(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!source.trim() || !text.trim()) {
      setError('Source and text are required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const payload: IngestRequest = {
        source: source.trim(),
        title: title.trim() || undefined,
        text: text.trim(),
        is_markdown: source.endsWith('.md'),
      }

      const response = await ingestDoc(payload)

      // Save to recent ingests
      saveRecentIngest({
        document_id: response.document_id,
        source: source.trim(),
        title: title.trim() || undefined,
        chunks_created: response.chunks_created,
        created_at: new Date().toISOString(),
      })

      refresh()

      // Reset form and close
      setTitle('')
      setSource('')
      setText('')
      setMode('drop')
      setError(null)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to ingest document')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Ingest document</h2>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drop Zone */}
          {mode === 'drop' && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`flex items-center justify-center rounded-xl border-2 border-dashed ${
                dragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50'
              } px-4 py-10 text-sm text-slate-500 transition-colors`}
            >
              <div className="text-center">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mb-2">Drop a file here or click to browse</p>
                <p className="text-xs text-slate-400 mb-3">Supports .txt and .md files</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,text/plain"
                  onChange={handleFileInput}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 text-sm text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Browse files
                </button>
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setMode('manual')}
                    className="text-sm text-blue-600 hover:text-blue-700 underline"
                  >
                    Enter text manually
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Manual Input */}
          {mode === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Document title (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source / Link
                </label>
                <input
                  type="text"
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="URL or source identifier"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  required
                  rows={10}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Paste or type document content here..."
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('drop')
                  setTitle('')
                  setSource('')
                  setText('')
                }}
                className="text-sm text-slate-600 hover:text-slate-900 underline"
              >
                ← Back to file upload
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !source.trim() || !text.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Ingesting...' : 'Ingest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
