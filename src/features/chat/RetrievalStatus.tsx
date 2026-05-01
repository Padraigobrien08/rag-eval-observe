'use client'

import { Loader2, Search, Zap, Layers, GitBranch } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface RetrievalStatusProps {
  ragModel: string
  isLoading: boolean
  /** After retrieval; show a lighter status while the model streams tokens */
  answerStreaming?: boolean
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

export default function RetrievalStatus({
  ragModel,
  isLoading,
  answerStreaming = false,
}: RetrievalStatusProps) {
  if (!isLoading) return null

  const info = modelInfo[ragModel] || modelInfo['vector-similarity']

  if (answerStreaming) {
    return (
      <div className="flex justify-start mb-4">
        <Card className="max-w-[80%] border-slate-200 bg-slate-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-600" />
              <span className="font-medium">Generating answer</span>
            </div>
            <CardDescription className="mt-2 text-xs text-slate-600">
              Streaming tokens from the model…
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-4">
      <Card className="max-w-[80%] border-blue-200 bg-blue-50/80 shadow-sm">
        <CardHeader className="space-y-0 p-4 pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-blue-900">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-600" />
            {info.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 px-4 pb-4 pt-0">
          {info.steps.map((step, index) => (
            <div key={index} className="flex items-center gap-2 text-xs text-blue-800">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>{step}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
