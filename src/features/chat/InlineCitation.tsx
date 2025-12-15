'use client'

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
      className="inline-flex items-center justify-center h-5 px-2 rounded-full bg-blue-100 text-blue-700 text-xs font-medium cursor-pointer hover:bg-blue-200 transition-colors ml-1 mr-0.5 border border-blue-200"
      style={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View citation${match.citationNumbers.length > 1 ? 's' : ''} ${match.citationNumbers.join(', ')}`}
    >
      {match.text}
    </span>
  )
}
