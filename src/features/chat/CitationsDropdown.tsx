'use client'

import { ChevronDown, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Citation } from './types'

interface CitationsDropdownProps {
  citations: Citation[]
}

export default function CitationsDropdown({ citations }: CitationsDropdownProps) {
  if (!citations || citations.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-xs border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
        >
          <FileText className="h-3 w-3" />
          Citations ({citations.length})
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[24rem] overflow-y-auto p-1">
        <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Sources ({citations.length})
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        <div className="space-y-0.5">
          {citations.map((citation, idx) => (
            <DropdownMenuItem
              key={`${citation.chunk_id}-${idx}`}
              className="flex flex-col items-start gap-1 p-2.5 cursor-default focus:bg-slate-50 rounded-sm"
              onSelect={(e) => e.preventDefault()}
            >
              <div className="flex items-start justify-between w-full gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 leading-snug">
                    {citation.title || citation.source || 'Untitled Document'}
                  </div>
                  {citation.source && citation.source !== citation.title && (
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {citation.source}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 text-xs text-slate-400 font-medium">
                  [{idx + 1}]
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 w-full pt-0.5">
                <span className="text-slate-400">Chunk {citation.chunk_index}</span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-slate-400 truncate flex-1 min-w-0 text-[11px]">
                  {citation.chunk_id}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

