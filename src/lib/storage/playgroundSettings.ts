'use client'

const STORAGE_KEY = 'rag-playground-settings'

export interface PlaygroundSettings {
  topK: number
  debug: boolean
  filterSource: string
  filterTitle: string
}

const DEFAULT_SETTINGS: PlaygroundSettings = {
  topK: 8,
  debug: false,
  filterSource: '',
  filterTitle: '',
}

export function loadPlaygroundSettings(): PlaygroundSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SETTINGS
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        // Ensure topK is a number
        topK: typeof parsed.topK === 'number' ? parsed.topK : DEFAULT_SETTINGS.topK,
        // Ensure debug is a boolean
        debug: typeof parsed.debug === 'boolean' ? parsed.debug : DEFAULT_SETTINGS.debug,
      }
    }
  } catch (error) {
    console.error('Failed to load playground settings:', error)
  }

  return DEFAULT_SETTINGS
}

export function savePlaygroundSettings(settings: Partial<PlaygroundSettings>): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const current = loadPlaygroundSettings()
    const updated = { ...current, ...settings }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to save playground settings:', error)
  }
}
