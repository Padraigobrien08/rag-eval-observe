/**
 * Citation parsing utilities for detecting and extracting citation markers from text.
 */

export interface CitationMatch {
  /** The full matched text (e.g., "[1]", "[1][3]") */
  text: string
  /** The start index in the original text */
  startIndex: number
  /** The end index in the original text */
  endIndex: number
  /** Array of citation numbers referenced (e.g., [1, 3] for "[1][3]") */
  citationNumbers: number[]
}

/**
 * Parse citation patterns from text.
 * Detects patterns like [1], [2], [1][3], etc.
 *
 * @param text - The text to parse
 * @returns Array of citation matches found in the text
 *
 * @example
 * parseCitations("This is text [1] and more [2][3].")
 * // Returns:
 * // [
 * //   { text: "[1]", startIndex: 13, endIndex: 16, citationNumbers: [1] },
 * //   { text: "[2][3]", startIndex: 26, endIndex: 32, citationNumbers: [2, 3] }
 * // ]
 */
export function parseCitations(text: string): CitationMatch[] {
  // Pattern matches [1], [2], [1][3], etc.
  // Matches consecutive citation markers like [1][2][3]
  const citationPattern = /(\[\d+\](?:\[\d+\])*)/g
  const matches: CitationMatch[] = []
  let match: RegExpExecArray | null

  while ((match = citationPattern.exec(text)) !== null) {
    const fullMatch = match[0]
    const startIndex = match.index
    const endIndex = startIndex + fullMatch.length

    // Extract all citation numbers from the match
    // e.g., "[1][3]" -> [1, 3]
    const numberPattern = /\[(\d+)\]/g
    const citationNumbers: number[] = []
    let numberMatch: RegExpExecArray | null

    while ((numberMatch = numberPattern.exec(fullMatch)) !== null) {
      const num = parseInt(numberMatch[1], 10)
      if (!isNaN(num) && num > 0) {
        citationNumbers.push(num)
      }
    }

    if (citationNumbers.length > 0) {
      matches.push({
        text: fullMatch,
        startIndex,
        endIndex,
        citationNumbers,
      })
    }
  }

  return matches
}

/**
 * Split text into segments with citation markers identified.
 * Returns an array of segments that alternate between text and citations.
 *
 * @param text - The text to split
 * @returns Array of segments, where each segment is either plain text or a citation match
 */
export function splitTextWithCitations(text: string): Array<string | CitationMatch> {
  const citations = parseCitations(text)
  const segments: Array<string | CitationMatch> = []

  if (citations.length === 0) {
    return [text]
  }

  let lastIndex = 0

  for (const citation of citations) {
    // Add text before citation
    if (citation.startIndex > lastIndex) {
      const textSegment = text.slice(lastIndex, citation.startIndex)
      if (textSegment.length > 0) {
        segments.push(textSegment)
      }
    }

    // Add citation
    segments.push(citation)

    lastIndex = citation.endIndex
  }

  // Add remaining text after last citation
  if (lastIndex < text.length) {
    const remainingText = text.slice(lastIndex)
    if (remainingText.length > 0) {
      segments.push(remainingText)
    }
  }

  return segments
}
