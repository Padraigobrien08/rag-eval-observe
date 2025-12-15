'use client'

import { useState } from 'react'

export type RagModel = 'vector-similarity' | 'hybrid-search' | 'reranking' | 'multi-query'

export function useRagSettings() {
  const [topK, setTopK] = useState<number | undefined>(undefined)
  const [debug, setDebug] = useState<boolean>(false)
  const [ragModel, setRagModel] = useState<RagModel>('vector-similarity')

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
      ragModel,
    },
    updateSettings,
    // Keep individual getters for backward compatibility
    topK,
    debug,
    ragModel,
    setTopK,
    setDebug,
    setRagModel,
  }
}
