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
    <div className="max-w-5xl w-full">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Start a conversation</h3>
            <p className="text-sm text-gray-500">
              Ask questions about your documents or try one of these example prompts:
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {EXAMPLE_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => onSelectPrompt(prompt)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-full hover:bg-gray-100 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors break-words"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
    </div>
  )
}
