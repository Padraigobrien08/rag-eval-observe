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
import { ingestDocument, extractTextFromFile } from '@/lib/api/client'
import { Upload, Loader2 } from 'lucide-react'

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

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = e => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

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

  // Extract text from PDF/DOCX files using backend API
  const extractTextFromPDF = async (file: File): Promise<string> => {
    return extractTextFromFile(file)
  }

  const extractTextFromDOCX = async (file: File): Promise<string> => {
    return extractTextFromFile(file)
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
      setError(null)
      let fileText = ''

      // Determine file type and extract text accordingly
      const fileName = file.name.toLowerCase()
      if (fileName.endsWith('.pdf')) {
        fileText = await extractTextFromPDF(file)
      } else if (fileName.endsWith('.docx')) {
        fileText = await extractTextFromDOCX(file)
      } else {
        // For text-based files (txt, md, json, etc.)
        fileText = await readFileAsText(file)
      }

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
    e.stopPropagation()
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set dragging to false if we're actually leaving the drop zone
    // (not just moving between child elements)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const file = files[0]
      // Validate file type
      const allowedExtensions = ['.txt', '.md', '.markdown', '.json', '.pdf', '.docx']
      const fileName = file.name.toLowerCase()
      const isValidFile = allowedExtensions.some(ext => fileName.endsWith(ext))

      if (!isValidFile) {
        setError(`Invalid file type. Please upload: ${allowedExtensions.join(', ')}`)
        return
      }

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
      <DialogContent
        className="w-[90vw] max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{
          paddingTop: '2.5rem',
          paddingBottom: '2.5rem',
          paddingLeft: '3rem',
          paddingRight: '3rem',
        }}
      >
        <DialogHeader style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Upload className="h-12 w-12 text-slate-400" />
          </div>
          <DialogTitle>Ingest a document</DialogTitle>
          <DialogDescription>
            Upload a file or paste text to add it to the RAG index.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
        >
          {/* File upload area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
            }`}
            style={{
              padding: '2.5rem',
              minHeight: '120px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isDragging ? (
              <p className="text-sm font-medium text-blue-600">Drop file here</p>
            ) : (
              <>
                <Upload className="h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm text-slate-600">
                  Drag and drop a file here, or click to browse
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Supported: .txt, .md, .markdown, .json, .pdf, .docx
                </p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.markdown,.json,.pdf,.docx"
              onChange={handleFileInputChange}
              className="hidden"
              style={{ display: 'none' }}
              id="file-upload"
            />
          </div>

          {/* Manual text input toggle */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}
          >
            <Button
              type="button"
              size="sm"
              onClick={() => setShowManualInput(!showManualInput)}
              style={{
                backgroundColor: '#0f172a',
                color: 'white',
                borderRadius: '0.5rem',
                border: 'none',
                width: 'auto',
                paddingLeft: '1.5rem',
                paddingRight: '1.5rem',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = '#1e293b'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '#0f172a'
              }}
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
                disabled={isLoading}
              />
            )}
          </div>

          {/* Source and Title inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label className="text-sm font-medium">Source</label>
              <Input
                value={source}
                onChange={e => setSource(e.target.value)}
                placeholder="Source (e.g. URL, system name)"
                disabled={isLoading}
                required
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Document title"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-600" style={{ marginTop: '0.5rem' }}>
              {error}
            </p>
          )}

          {/* Submit buttons */}
          <div className="flex justify-end gap-2" style={{ paddingTop: '1rem' }}>
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
