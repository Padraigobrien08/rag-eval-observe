'use client'

import { useLocalStorage } from './useLocalStorage'

export type RagModel = 'vector-similarity' | 'hybrid-search' | 'reranking' | 'multi-query'

export function useRagSettings() {
  const [topK, setTopK] = useLocalStorage<number | undefined>('rag-eval-top-k', undefined)
  const [debug, setDebug] = useLocalStorage<boolean>('rag-eval-debug', false)
  const [ragModel, setRagModel] = useLocalStorage<RagModel>(
    'rag-eval-rag-model',
    'vector-similarity'
  )

  const updateSettings = (updates: { topK?: number; debug?: boolean; ragModel?: RagModel }) => {
    if (updates.topK !== undefined) {
      setTopK(updates.topK)
    }
    if (updates.debug !== undefined) {
      setDebug(updates.debug)
    }
    if (updates.ragModel !== undefined) {
      setRagModel(updates.ragModel)
    }
  }

  return {
    settings: {
      topK: topK ?? 8,
      debug,
      ragModel: ragModel ?? 'vector-similarity',
    },
    updateSettings,
    // Keep individual getters for backward compatibility
    topK,
    debug,
    ragModel: ragModel ?? 'vector-similarity',
    setTopK,
    setDebug,
    setRagModel,
  }
}
