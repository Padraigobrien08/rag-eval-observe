'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import type { Citation } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function MessageCitations({ citations }: { citations: Citation[] }) {
  const [open, setOpen] = useState(false)
  if (!citations || citations.length === 0) return null

  return (
    <div className="mt-1 flex flex-col gap-2" data-testid="message-citations">
      <Button
        className="w-fit gap-1.5 text-muted-foreground"
        onClick={() => setOpen(o => !o)}
        size="sm"
        variant="outline"
      >
        <FileText className="size-3.5" />
        {citations.length} source{citations.length === 1 ? '' : 's'}
      </Button>

      {open && (
        <ol className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-2 text-sm">
          {citations.map((c, i) => (
            <li
              className={cn('flex items-start gap-2 rounded-md px-2 py-1.5')}
              key={`${c.chunk_id}-${i}`}
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
