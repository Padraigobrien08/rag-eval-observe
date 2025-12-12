'use client'

// Simple markdown renderer component (reused from old AssistantMessage)
export default function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: JSX.Element[] = []
  let currentParagraph: string[] = []
  let inCodeBlock = false
  let codeBlockContent: string[] = []
  let inList = false
  let listItems: string[] = []
  let listOrdered = false

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join('\n')
      if (text.trim()) {
        elements.push(
          <p key={`p-${elements.length}`} className="text-sm leading-relaxed text-gray-900 mb-3">
            {renderInlineMarkdown(text)}
          </p>
        )
      }
      currentParagraph = []
    }
  }

  const flushCodeBlock = () => {
    if (codeBlockContent.length > 0) {
      elements.push(
        <pre
          key={`code-${elements.length}`}
          className="bg-gray-100 border border-gray-200 rounded-lg p-3 overflow-x-auto mb-3"
        >
          <code className="text-xs font-mono text-gray-800">{codeBlockContent.join('\n')}</code>
        </pre>
      )
      codeBlockContent = []
    }
  }

  const flushList = () => {
    if (listItems.length > 0) {
      const ListTag = listOrdered ? 'ol' : 'ul'
      elements.push(
        <ListTag
          key={`list-${elements.length}`}
          className={`text-sm text-gray-900 mb-3 ${listOrdered ? 'list-decimal' : 'list-disc'} ml-6 space-y-1`}
        >
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInlineMarkdown(item)}
            </li>
          ))}
        </ListTag>
      )
      listItems = []
      inList = false
    }
  }

  const renderInlineMarkdown = (text: string): (JSX.Element | string)[] => {
    const parts: (JSX.Element | string)[] = []
    let currentIndex = 0

    const boldRegex = /(\*\*|__)(.+?)\1/g
    const codeRegex = /`([^`]+)`/g
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g

    const matches: Array<{
      type: 'bold' | 'italic' | 'code' | 'link'
      start: number
      end: number
      content: string
      url?: string
    }> = []

    let match
    while ((match = boldRegex.exec(text)) !== null) {
      matches.push({
        type: 'bold',
        start: match.index,
        end: match.index + match[0].length,
        content: match[2],
      })
    }
    while ((match = codeRegex.exec(text)) !== null) {
      matches.push({
        type: 'code',
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
      })
    }
    while ((match = linkRegex.exec(text)) !== null) {
      matches.push({
        type: 'link',
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
        url: match[2],
      })
    }

    // Match italic *text* or _text_ (but not **text** or __text__)
    let italicIndex = 0
    while (italicIndex < text.length) {
      const char = text[italicIndex]
      if (char === '*' || char === '_') {
        const isBoldStart =
          (char === '*' && text[italicIndex + 1] === '*') ||
          (char === '_' && text[italicIndex + 1] === '_')
        const isBoldEnd =
          italicIndex > 0 &&
          ((text[italicIndex - 1] === '*' && char === '*') ||
            (text[italicIndex - 1] === '_' && char === '_'))

        if (!isBoldStart && !isBoldEnd) {
          const closingIndex = text.indexOf(char, italicIndex + 1)
          if (closingIndex > italicIndex + 1) {
            const isClosingBold = closingIndex < text.length - 1 && text[closingIndex + 1] === char
            const isClosingBoldStart = closingIndex > 0 && text[closingIndex - 1] === char

            if (!isClosingBold && !isClosingBoldStart) {
              let overlaps = false
              for (const existingMatch of matches) {
                if (
                  (italicIndex >= existingMatch.start && italicIndex < existingMatch.end) ||
                  (closingIndex + 1 > existingMatch.start && closingIndex + 1 <= existingMatch.end)
                ) {
                  overlaps = true
                  break
                }
              }

              if (!overlaps) {
                matches.push({
                  type: 'italic',
                  start: italicIndex,
                  end: closingIndex + 1,
                  content: text.substring(italicIndex + 1, closingIndex),
                })
                italicIndex = closingIndex + 1
                continue
              }
            }
          }
        }
      }
      italicIndex++
    }

    matches.sort((a, b) => a.start - b.start)

    const filteredMatches: typeof matches = []
    for (let i = 0; i < matches.length; i++) {
      const current = matches[i]
      let overlaps = false
      for (let j = 0; j < i; j++) {
        const prev = matches[j]
        if (
          (current.start >= prev.start && current.start < prev.end) ||
          (current.end > prev.start && current.end <= prev.end)
        ) {
          overlaps = true
          break
        }
      }
      if (!overlaps) {
        filteredMatches.push(current)
      }
    }

    for (const match of filteredMatches) {
      if (match.start > currentIndex) {
        parts.push(text.substring(currentIndex, match.start))
      }

      const key = `inline-${match.start}`
      switch (match.type) {
        case 'bold':
          parts.push(
            <strong key={key} className="font-semibold text-gray-900">
              {match.content}
            </strong>
          )
          break
        case 'italic':
          parts.push(
            <em key={key} className="italic">
              {match.content}
            </em>
          )
          break
        case 'code':
          parts.push(
            <code key={key} className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">
              {match.content}
            </code>
          )
          break
        case 'link':
          parts.push(
            <a
              key={key}
              href={match.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              {match.content}
            </a>
          )
          break
      }

      currentIndex = match.end
    }

    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex))
    }

    return parts.length > 0 ? parts : [text]
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock()
        inCodeBlock = false
      } else {
        flushParagraph()
        flushList()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      continue
    }

    if (trimmed.startsWith('#')) {
      flushParagraph()
      flushList()
      const level = trimmed.match(/^#+/)?.[0].length || 1
      const text = trimmed.substring(level).trim()
      const HeadingTag = `h${Math.min(level, 6)}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
      const headingClasses = {
        h1: 'text-lg font-semibold text-gray-900 mb-2 mt-4',
        h2: 'text-base font-semibold text-gray-900 mb-2 mt-3',
        h3: 'text-sm font-semibold text-gray-900 mb-1 mt-2',
        h4: 'text-sm font-semibold text-gray-900 mb-1 mt-2',
        h5: 'text-sm font-semibold text-gray-900 mb-1 mt-2',
        h6: 'text-sm font-semibold text-gray-900 mb-1 mt-2',
      }
      elements.push(
        <HeadingTag key={`h-${elements.length}`} className={headingClasses[HeadingTag]}>
          {renderInlineMarkdown(text)}
        </HeadingTag>
      )
      continue
    }

    const listMatch = trimmed.match(/^(\d+\.|\*|\-|\+)\s+(.+)$/)
    if (listMatch) {
      flushParagraph()
      const isOrdered = /^\d+\./.test(listMatch[1])
      if (!inList || (isOrdered && !listOrdered) || (!isOrdered && listOrdered)) {
        flushList()
        inList = true
        listOrdered = isOrdered
      }
      listItems.push(listMatch[2])
      continue
    }

    if (trimmed === '') {
      flushParagraph()
      flushList()
    } else {
      if (inList) {
        flushList()
      }
      currentParagraph.push(line)
    }
  }

  flushParagraph()
  flushList()
  flushCodeBlock()

  return <div className="markdown-content">{elements}</div>
}
