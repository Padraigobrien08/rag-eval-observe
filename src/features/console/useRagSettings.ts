'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  loadPlaygroundSettings,
  savePlaygroundSettings,
  type PlaygroundSettings,
} from '@/lib/storage/playgroundSettings'

export function useRagSettings() {
  const [settings, setSettings] = useState<PlaygroundSettings>(() =>
    loadPlaygroundSettings()
  )

  // Save to localStorage whenever settings change
  useEffect(() => {
    savePlaygroundSettings(settings)
  }, [settings])

  const updateTopK = useCallback((value: number) => {
    setSettings(prev => ({ ...prev, topK: value }))
  }, [])

  const updateDebugMode = useCallback((value: boolean) => {
    setSettings(prev => ({ ...prev, debug: value }))
  }, [])

  const updateFilterSource = useCallback((value: string) => {
    setSettings(prev => ({ ...prev, filterSource: value }))
  }, [])

  const updateFilterTitle = useCallback((value: string) => {
    setSettings(prev => ({ ...prev, filterTitle: value }))
  }, [])

  const clearFilters = useCallback(() => {
    setSettings(prev => ({ ...prev, filterSource: '', filterTitle: '' }))
  }, [])

  const setDocumentFilter = useCallback(
    (source: string, title?: string) => {
      setSettings(prev => ({
        ...prev,
        filterSource: source,
        filterTitle: title || '',
      }))
    },
    []
  )

  return {
    settings,
    updateTopK,
    updateDebugMode,
    updateFilterSource,
    updateFilterTitle,
    clearFilters,
    setDocumentFilter,
  }
}

