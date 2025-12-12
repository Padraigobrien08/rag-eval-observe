'use client'

import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void
}

const EXAMPLE_PROMPTS = [
  'What documents have been ingested?',
  'Summarize the main topics in the knowledge base',
  'How does RAG work?',
  'What are the benefits of retrieval-augmented generation?',
  'Explain the chunking process',
  'What is vector similarity search?',
]

export default function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  const handlePromptClick = (prompt: string) => {
    onSelectPrompt(prompt)
  }

  return (
    <div className="max-w-xl w-full px-4">
      <div className="text-center mb-4">
        <h1 className="text-lg font-semibold text-center">What can I help with?</h1>
        <p className="text-sm text-center text-muted-foreground mt-2">
          Ask me anything about your ingested documents
        </p>
      </div>
      <div className="mt-4 space-y-2">
        {EXAMPLE_PROMPTS.map((prompt, idx) => (
          <Button
            key={idx}
            variant="outline"
            className="w-full justify-start rounded-xl"
            onClick={() => handlePromptClick(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  )
}
