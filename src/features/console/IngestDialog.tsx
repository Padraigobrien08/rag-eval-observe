'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useState, useRef, useEffect } from 'react'
import { ingestDocument } from '@/lib/api/client'
import { Upload, FileText, Loader2 } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export default function IngestDialog({ open, onOpenChange, onSuccess }: Props) {
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [text, setText] = useState('')

  // Extract title from markdown when text changes (for manual paste)
  useEffect(() => {
    if (text && !title && text.trim().startsWith('#')) {
      const extractedTitle = extractMarkdownTitle(text)
      if (extractedTitle) {
        setTitle(extractedTitle)
      }
    }
  }, [text, title])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManualInput, setShowManualInput] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resetForm = () => {
    setTitle('')
    setSource('')
    setText('')
    setError(null)
    setShowManualInput(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = (open: boolean) => {
    if (!open && !isLoading) {
      resetForm()
    }
    onOpenChange(open)
  }

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const extractMarkdownTitle = (text: string): string | null => {
    // Extract title from first markdown header (# Title)
    const lines = text.trim().split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith('# ')) {
        return trimmed.substring(2).trim()
      }
      if (trimmed.startsWith('## ')) {
        return trimmed.substring(3).trim()
      }
    }
    return null
  }

  // Auto-extract title from markdown when text is pasted manually
  useEffect(() => {
    if (text && !title && text.trim().startsWith('#')) {
      const extractedTitle = extractMarkdownTitle(text)
      if (extractedTitle) {
        setTitle(extractedTitle)
      }
    }
  }, [text, title])

  const handleFileSelect = async (file: File) => {
    try {
      const fileText = await readFileAsText(file)
      setText(fileText)

      // Auto-fill source from filename if empty
      if (!source) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
        setSource(nameWithoutExt)
      }

      // Auto-fill title from markdown header if it's a markdown file, otherwise use filename
      if (!title) {
        const isMarkdown = isMarkdownFile(file.name)
        if (isMarkdown) {
          const extractedTitle = extractMarkdownTitle(fileText)
          if (extractedTitle) {
            setTitle(extractedTitle)
          } else {
            // Fallback to filename without extension
            setTitle(file.name.replace(/\.[^/.]+$/, ''))
          }
        } else {
          setTitle(file.name)
        }
      }
    } catch (err) {
      setError('Failed to read file')
      console.error(err)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      void handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      await handleFileSelect(file)
    }
  }

  const isMarkdownFile = (filename: string): boolean => {
    return /\.(md|markdown)$/i.test(filename)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!source.trim()) {
      setError('Source is required')
      return
    }

    if (!text.trim()) {
      setError('Text content is required')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Determine if markdown based on file extension or content
      const isMarkdown = isMarkdownFile(title) || text.trim().startsWith('#')

      await ingestDocument({
        source: source.trim(),
        title: title.trim() || undefined,
        text: text.trim(),
        is_markdown: isMarkdown,
      })

      resetForm()
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      console.error(err)
      setError(err.message ?? 'Failed to ingest document')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ingest a document</DialogTitle>
          <DialogDescription>
            Upload a file or paste text to add it to the RAG index.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File upload area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'
            }`}
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p className="text-sm text-slate-600 mb-2">
              Drag and drop a file here, or click to browse
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.markdown,.json"
              onChange={handleFileInputChange}
              className="hidden"
              id="file-upload"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <FileText className="h-4 w-4 mr-2" />
              Select file
            </Button>
          </div>

          {/* Manual text input toggle */}
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowManualInput(!showManualInput)}
              className="w-full justify-start"
            >
              {showManualInput ? 'Hide' : 'Enter text manually'}
            </Button>
            {showManualInput && (
              <Textarea
                ref={textareaRef}
                rows={8}
                placeholder="Enter document text..."
                value={text}
                onChange={e => setText(e.target.value)}
                className="mt-2"
                disabled={isLoading}
              />
            )}
          </div>

          {/* Source and Title inputs */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Source</label>
              <Input
                value={source}
                onChange={e => setSource(e.target.value)}
                placeholder="Source (e.g. URL, system name)"
                disabled={isLoading}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Title</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Document title"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Error message */}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {/* Submit buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleClose(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !source.trim() || !text.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ingesting...
                </>
              ) : (
                'Ingest'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
