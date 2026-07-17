'use client'

import { useEffect, useRef, useState } from 'react'
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
import { CheckCircle2, Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import {
  ingestDocument,
  extractTextFromFile,
  fileToBase64,
  type IngestResponsePayload,
} from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { IngestInsightPanel } from './IngestInsightPanel'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

/** Guard against oversized uploads that would stall extraction with no feedback. */
const MAX_FILE_SIZE_BYTES = 15_000_000

export default function IngestDialog({ open, onOpenChange, onSuccess }: Props) {
  const [title, setTitle] = useState('')
  const [source, setSource] = useState('')
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManualInput, setShowManualInput] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [ingestInsight, setIngestInsight] = useState<IngestResponsePayload | null>(null)
  /** PDF bytes for server-side original preview (cleared when source file is not a PDF). */
  const [pendingOriginalPdfBase64, setPendingOriginalPdfBase64] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const prevOpenRef = useRef(open)

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setIngestInsight(null)
    }
    prevOpenRef.current = open
  }, [open])

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
    setIngestInsight(null)
    setPendingOriginalPdfBase64(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = (next: boolean) => {
    if (!next && !isLoading) {
      resetForm()
    }
    onOpenChange(next)
  }

  const handleIngestAnother = () => {
    resetForm()
  }

  const handleInsightClose = () => {
    resetForm()
    onOpenChange(false)
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
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(
        `File is too large (${(file.size / 1_000_000).toFixed(1)} MB). Maximum is ${MAX_FILE_SIZE_BYTES / 1_000_000} MB.`
      )
      return
    }
    try {
      setError(null)
      setIsExtracting(true)
      let fileText = ''

      // Determine file type and extract text accordingly
      const fileName = file.name.toLowerCase()
      if (fileName.endsWith('.pdf')) {
        fileText = await extractTextFromPDF(file)
        try {
          setPendingOriginalPdfBase64(await fileToBase64(file))
        } catch {
          setPendingOriginalPdfBase64(null)
        }
      } else if (fileName.endsWith('.docx')) {
        fileText = await extractTextFromDOCX(file)
        setPendingOriginalPdfBase64(null)
      } else {
        // For text-based files (txt, md, json, etc.)
        fileText = await readFileAsText(file)
        setPendingOriginalPdfBase64(null)
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
    } finally {
      setIsExtracting(false)
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

      const outcome = await ingestDocument({
        source: source.trim(),
        title: title.trim() || undefined,
        text: text.trim(),
        is_markdown: isMarkdown,
        ...(pendingOriginalPdfBase64
          ? {
              original_file_base64: pendingOriginalPdfBase64,
              original_media_type: 'application/pdf' as const,
            }
          : {}),
      })

      setIngestInsight(outcome)
      onSuccess?.()

      toast.success(outcome.replaced_existing ? 'Document replaced' : 'Document ingested', {
        description: 'Full pipeline report is shown in the dialog below.',
        duration: 5000,
      })
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to ingest document')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          'flex max-h-[92vh] max-w-none flex-col gap-0 overflow-hidden p-0 sm:max-h-[92vh]',
          ingestInsight ? 'w-[min(100vw-1rem,48rem)]' : 'w-[min(100vw-1rem,36rem)]'
        )}
      >
        <div
          className={cn(
            'shrink-0 border-b border-border px-6 pb-5 pt-7 sm:px-8',
            ingestInsight && 'bg-muted/40'
          )}
        >
          <DialogHeader
            className={cn('space-y-2', ingestInsight ? 'text-left sm:text-left' : 'text-center')}
          >
            <div
              className={cn(
                'mb-2 flex',
                ingestInsight ? 'justify-start' : 'justify-center sm:justify-center'
              )}
            >
              {ingestInsight ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 ring-4 ring-emerald-500/20 dark:text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" strokeWidth={2.25} aria-hidden />
                </div>
              ) : (
                <div className="rounded-full bg-muted p-3 ring-1 ring-border">
                  <Upload className="h-7 w-7 text-muted-foreground" aria-hidden />
                </div>
              )}
            </div>
            <DialogTitle className={cn(ingestInsight && 'text-xl font-semibold tracking-tight')}>
              {ingestInsight ? 'Ingest report' : 'Ingest a document'}
            </DialogTitle>
            <DialogDescription
              className={cn(
                ingestInsight ? 'text-sm text-muted-foreground' : 'text-base text-muted-foreground'
              )}
            >
              {ingestInsight
                ? 'Normalization, chunking, and merge stats for this run. Use the card below for details and actions.'
                : 'Upload a file or paste text to add it to the RAG index.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {ingestInsight ? (
          <div className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-4 sm:px-8">
            <IngestInsightPanel
              outcome={ingestInsight}
              onIngestAnother={handleIngestAnother}
              onBackToForm={() => setIngestInsight(null)}
              onClose={handleInsightClose}
            />
          </div>
        ) : null}

        <form
          className={cn(
            'flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-6 pb-8 pt-2 sm:px-8',
            ingestInsight && 'hidden'
          )}
          onSubmit={handleSubmit}
        >
          {/* File upload area */}
          <div
            role="button"
            tabIndex={isExtracting ? -1 : 0}
            aria-label="Upload a document: drag and drop a file here, or activate to browse"
            aria-disabled={isExtracting}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (!isExtracting) fileInputRef.current?.click()
            }}
            onKeyDown={e => {
              if (isExtracting) return
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                fileInputRef.current?.click()
              }
            }}
            className={cn(
              'border-2 border-dashed rounded-lg text-center transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              isExtracting
                ? 'cursor-wait border-border bg-muted/40'
                : isDragging
                  ? 'cursor-pointer border-foreground bg-accent scale-[1.02]'
                  : 'cursor-pointer border-border bg-muted/40 hover:border-foreground/30 hover:bg-muted'
            )}
            style={{
              padding: '2.5rem',
              minHeight: '120px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isExtracting ? (
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Extracting text…
              </p>
            ) : isDragging ? (
              <p className="text-sm font-medium text-foreground">Drop file here</p>
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop a file here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supported: .txt, .md, .markdown, .json, .pdf, .docx · up to 15 MB
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
              variant="secondary"
              size="sm"
              onClick={() => setShowManualInput(!showManualInput)}
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
              <label className="text-sm font-medium">
                Title <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Auto-filled from the file name if left blank"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-destructive" style={{ marginTop: '0.5rem' }}>
              {error}
            </p>
          )}

          {/* Submit buttons */}
          <div className="flex justify-end gap-2" style={{ paddingTop: '1rem' }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleClose(false)}
              disabled={isLoading || Boolean(ingestInsight)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !source.trim() || !text.trim() || Boolean(ingestInsight)}
            >
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
