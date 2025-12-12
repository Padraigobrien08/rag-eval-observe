'use client'

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
  return (
    <div className="flex flex-col items-center justify-center max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-semibold text-gray-900 mb-3">RAG Eval</h1>
        <p className="text-lg text-gray-600">What can I help with?</p>
      </div>
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3">
        {EXAMPLE_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(prompt)}
            className="text-left px-4 py-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 transition-all"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
