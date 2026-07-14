'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText } from 'lucide-react'
import type { Citation } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function MessageCitations({
  citations,
  open,
  onOpenChange,
  highlightIndex,
}: {
  citations: Citation[]
  /** Controlled open state (e.g. driven by an inline citation click). */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Index of a source to scroll to and emphasize. */
  highlightIndex?: number | null
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const itemRefs = useRef<Array<HTMLLIElement | null>>([])

  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next)
    onOpenChange?.(next)
  }

  // Scroll the highlighted source into view when it changes while open.
  useEffect(() => {
    if (isOpen && highlightIndex != null) {
      itemRefs.current[highlightIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [isOpen, highlightIndex])

  if (!citations || citations.length === 0) return null

  return (
    <div className="mt-1 flex flex-col gap-2" data-testid="message-citations">
      <Button
        className="w-fit gap-1.5 text-muted-foreground"
        onClick={() => setOpen(!isOpen)}
        size="sm"
        variant="outline"
      >
        <FileText className="size-3.5" />
        {citations.length} source{citations.length === 1 ? '' : 's'}
      </Button>

      {isOpen && (
        <ol className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-2 text-sm">
          {citations.map((c, i) => (
            <li
              className={cn(
                'flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors',
                highlightIndex === i && 'bg-accent ring-1 ring-ring'
              )}
              key={`${c.chunk_id}-${i}`}
              ref={el => {
                itemRefs.current[i] = el
              }}
            >
              <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-background text-xs font-medium ring-1 ring-border">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="truncate font-medium">{c.title || c.source || 'Untitled'}</div>
                {c.source && c.source !== c.title && (
                  <div className="truncate text-muted-foreground text-xs">{c.source}</div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
