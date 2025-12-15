'use client'

import { Badge } from '@/components/ui/badge'
import type { CitationMatch } from './citationParser'

interface InlineCitationProps {
  match: CitationMatch
  onClick: (citationNumbers: number[]) => void
}

/**
 * Renders an inline citation chip that can be clicked to navigate to the citation.
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
    <Badge
      variant="outline"
      className="mx-0.5 cursor-pointer bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 transition-colors inline-flex items-center h-5 px-1.5 text-xs font-medium"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Citation ${match.citationNumbers.join(', ')}`}
    >
      {match.text}
    </Badge>
  )
}
