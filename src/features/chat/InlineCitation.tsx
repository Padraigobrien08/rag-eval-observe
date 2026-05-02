'use client'

import { badgeVariants } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CitationMatch } from './citationParser'

interface InlineCitationProps {
  match: CitationMatch
  onClick: (citationNumbers: number[]) => void
}

/**
 * Renders an inline citation chip that can be clicked to navigate to the citation.
 * Uses a <span> instead of <div> to avoid hydration errors when inside <p> tags.
 */
export default function InlineCitation({ match, onClick }: InlineCitationProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClick(match.citationNumbers)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      onClick(match.citationNumbers)
    }
  }

  return (
    <span
      className={cn(
        badgeVariants({ variant: 'outline' }),
        'h-5 cursor-pointer justify-center rounded-full border-blue-200 bg-blue-100 px-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200 ml-1 mr-0.5'
      )}
      style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Open sources panel for citation${match.citationNumbers.length > 1 ? 's' : ''} ${match.citationNumbers.join(', ')}`}
    >
      {match.text}
    </span>
  )
}
