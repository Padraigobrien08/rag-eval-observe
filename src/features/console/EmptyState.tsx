'use client'

import { Button } from '@/components/ui/button'

export default function EmptyState({ onSelectPrompt }: { onSelectPrompt?: (s: string) => void }) {
  const prompts = [
    'What documents have been ingested?',
    'Summarize the main topics in the knowledge base',
    'How does RAG work?',
    'What are the benefits of retrieval-augmented generation?',
    'Explain the chunking process',
    'What is vector similarity search?',
  ]

  return (
    <div className="h-full flex items-center justify-center">
      <div className="max-w-xl w-full px-4">
        <h2 className="text-lg font-semibold text-center text-gray-900">What can I help with?</h2>
        <p className="mt-1 text-sm text-center text-muted-foreground">
          Ask me anything about your ingested documents.
        </p>
        <div className="mt-4 space-y-2">
          {prompts.map(p => (
            <Button
              key={p}
              type="button"
              variant="outline"
              className="w-full justify-start rounded-xl"
              onClick={() => onSelectPrompt?.(p)}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
