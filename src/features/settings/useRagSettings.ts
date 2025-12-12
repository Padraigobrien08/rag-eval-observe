'use client'

import { useState } from 'react'

export function useRagSettings() {
  const [topK, setTopK] = useState<number | undefined>(undefined)
  const [debug, setDebug] = useState<boolean>(false)

  const updateSettings = (updates: { topK?: number; debug?: boolean }) => {
    if (updates.topK !== undefined) {
      setTopK(updates.topK)
    }
    if (updates.debug !== undefined) {
      setDebug(updates.debug)
    }
  }

  return {
    settings: {
      topK: topK ?? 8,
      debug,
    },
    updateSettings,
    // Keep individual getters for backward compatibility
    topK,
    debug,
    setTopK,
    setDebug,
  }
}
