'use client'

import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { UploadCloud } from 'lucide-react'
import { ingestDoc } from '@/lib/api/client'
import type { IngestRequest } from '@/lib/api/types'
import { saveRecentIngest } from '@/lib/storage/recentIngests'
import { useRecentIngests } from '@/features/ingest/useRecentIngests'

interface IngestDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function IngestDialog({ isOpen, onClose }: IngestDialogProps) {
  const [mode, setMode] = useState<'drop' | 'manual'>('drop')
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { refresh } = useRecentIngests()

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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ingest document</DialogTitle>
          <DialogDescription>Add content to your RAG knowledge base</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Drop Zone */}
          {mode === 'drop' && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed ${
                dragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50'
              } px-4 py-10 text-sm text-slate-500 transition-colors`}
            >
              <UploadCloud className="h-12 w-12 mb-3 text-slate-400" />
              <p className="mb-2">Drop a file here or click to browse</p>
              <p className="text-xs text-slate-400 mb-3">Supports .txt and .md files</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,text/plain"
                onChange={handleFileInput}
                className="hidden"
              />
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                Browse files
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="mt-3"
                onClick={() => setMode('manual')}
              >
                Enter text manually
              </Button>
            </div>
          )}

          {/* Manual Input */}
          {mode === 'manual' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Document title (optional)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source / Link</Label>
                <Input
                  id="source"
                  type="text"
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  required
                  placeholder="URL or source identifier"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="text">Content</Label>
                <Textarea
                  id="text"
                  value={text}
                  onChange={e => setText(e.target.value)}
                  required
                  rows={10}
                  placeholder="Paste or type document content here..."
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setMode('drop')
                  setTitle('')
                  setSource('')
                  setText('')
                }}
              >
                ← Back to file upload
              </Button>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Footer */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !source.trim() || !text.trim()}>
              {isLoading ? 'Ingesting...' : 'Ingest'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
