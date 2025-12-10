import type { ChatMessage } from '@/features/chat/types'

/**
 * Format chat messages as Markdown transcript
 */
export function formatTranscriptAsMarkdown(messages: ChatMessage[]): string {
  const lines: string[] = []
  lines.push('# Chat Transcript\n')
  lines.push(`Generated: ${new Date().toLocaleString()}\n`)

  for (const message of messages) {
    if (message.role === 'user') {
      lines.push('## User\n')
      lines.push(message.content)
      lines.push('')
    } else {
      lines.push('## Assistant\n')
      lines.push(message.content)
      lines.push('')

      // Add citations if available
      if (message.meta?.citations && message.meta.citations.length > 0) {
        lines.push('### Citations\n')
        message.meta.citations.forEach((citation, idx) => {
          lines.push(`${idx + 1}. **${citation.title || 'Untitled'}**`)
          if (citation.source) {
            lines.push(`   - Source: ${citation.source}`)
          }
          if (citation.chunk_index !== undefined) {
            lines.push(`   - Chunk Index: ${citation.chunk_index}`)
          }
          if (citation.document_id) {
            lines.push(`   - Document ID: ${citation.document_id}`)
          }
          lines.push('')
        })
      }

      // Add metadata if available
      if (message.meta) {
        const meta: string[] = []
        if (message.meta.latencyMs !== undefined) {
          meta.push(`Latency: ${message.meta.latencyMs}ms`)
        }
        if (message.meta.tokenUsage) {
          const tokens = message.meta.tokenUsage
          meta.push(
            `Tokens: ${tokens.total_tokens || 0} (${tokens.prompt_tokens || 0} prompt + ${tokens.completion_tokens || 0} completion)`
          )
        }
        if (meta.length > 0) {
          lines.push('### Metadata\n')
          lines.push(meta.join(' | '))
          lines.push('')
        }
      }
    }
    lines.push('---\n')
  }

  return lines.join('\n')
}

/**
 * Download transcript as .md file
 */
export function downloadTranscript(messages: ChatMessage[], filename?: string): void {
  const markdown = formatTranscriptAsMarkdown(messages)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `chat-transcript-${new Date().toISOString().split('T')[0]}.md`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Copy transcript to clipboard
 */
export async function copyTranscript(messages: ChatMessage[]): Promise<void> {
  const markdown = formatTranscriptAsMarkdown(messages)
  await navigator.clipboard.writeText(markdown)
}

