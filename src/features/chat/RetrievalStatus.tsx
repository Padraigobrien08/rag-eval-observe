'use client'

import { Loader2, Search, Zap, Layers, GitBranch } from 'lucide-react'

interface RetrievalStatusProps {
  ragModel: string
  isLoading: boolean
}

const modelInfo: Record<string, { name: string; icon: React.ReactNode; steps: string[] }> = {
  'vector-similarity': {
    name: 'Vector Similarity Search',
    icon: <Search className="h-4 w-4" />,
    steps: ['Generating query embedding', 'Searching vector database', 'Ranking results'],
  },
  'hybrid-search': {
    name: 'Hybrid Search',
    icon: <Layers className="h-4 w-4" />,
    steps: [
      'Generating query embedding',
      'Running vector similarity search',
      'Running BM25 keyword search',
      'Fusing results with RRF',
      'Ranking fused results',
    ],
  },
  reranking: {
    name: 'Reranking',
    icon: <Zap className="h-4 w-4" />,
    steps: [
      'Generating query embedding',
      'Retrieving initial candidates',
      'Applying reranker model',
      'Reordering results',
    ],
  },
  'multi-query': {
    name: 'Multi-Query',
    icon: <GitBranch className="h-4 w-4" />,
    steps: [
      'Generating query variations',
      'Retrieving for each variation',
      'Merging and deduplicating',
      'Ranking merged results',
    ],
  },
}

export default function RetrievalStatus({ ragModel, isLoading }: RetrievalStatusProps) {
  if (!isLoading) return null

  const info = modelInfo[ragModel] || modelInfo['vector-similarity']

  return (
    <div className="flex justify-start mb-4">
      <div
        className="rounded-2xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm"
        style={{ maxWidth: '80%' }}
      >
        <div className="flex items-center gap-2 mb-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <span className="font-semibold text-blue-900">{info.name}</span>
        </div>
        <div className="space-y-1.5 mt-2">
          {info.steps.map((step, index) => (
            <div key={index} className="flex items-center gap-2 text-blue-700 text-xs">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
