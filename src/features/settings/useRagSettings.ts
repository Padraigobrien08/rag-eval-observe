'use client'

import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react'
import {
  loadPlaygroundSettings,
  savePlaygroundSettings,
  type PlaygroundSettings,
} from '@/lib/storage/playgroundSettings'

export interface RagSettings {
  topK: number
  debug: boolean
  filters: {
    source?: string
    title?: string
  }
  activeDocument?: {
    source: string
    title?: string
  }
}

interface RagSettingsContextType {
  settings: RagSettings
  setTopK: (value: number) => void
  setDebug: (value: boolean) => void
  setFilters: (filters: { source?: string; title?: string }) => void
  selectDocument: (document: { source: string; title?: string }) => void
  clearDocumentSelection: () => void
}

type RagSettingsAction =
  | { type: 'SET_TOP_K'; payload: number }
  | { type: 'SET_DEBUG'; payload: boolean }
  | { type: 'SET_FILTERS'; payload: { source?: string; title?: string } }
  | { type: 'SELECT_DOCUMENT'; payload: { source: string; title?: string } }
  | { type: 'CLEAR_DOCUMENT_SELECTION' }
  | { type: 'LOAD_SETTINGS'; payload: PlaygroundSettings }

function loadSettings(): RagSettings {
  const stored = loadPlaygroundSettings()
  return {
    topK: stored.topK,
    debug: stored.debug,
    filters: {
      source: stored.filterSource || undefined,
      title: stored.filterTitle || undefined,
    },
    activeDocument: stored.filterSource
      ? {
          source: stored.filterSource,
          title: stored.filterTitle || undefined,
        }
      : undefined,
  }
}

function settingsReducer(
  state: RagSettings,
  action: RagSettingsAction
): RagSettings {
  switch (action.type) {
    case 'SET_TOP_K':
      return { ...state, topK: action.payload }
    case 'SET_DEBUG':
      return { ...state, debug: action.payload }
    case 'SET_FILTERS':
      return {
        ...state,
        filters: action.payload,
        // Clear active document if filters are cleared
        activeDocument:
          action.payload.source || action.payload.title
            ? {
                source: action.payload.source || '',
                title: action.payload.title,
              }
            : undefined,
      }
    case 'SELECT_DOCUMENT':
      return {
        ...state,
        filters: {
          source: action.payload.source,
          title: action.payload.title,
        },
        activeDocument: action.payload,
      }
    case 'CLEAR_DOCUMENT_SELECTION':
      return {
        ...state,
        filters: {},
        activeDocument: undefined,
      }
    case 'LOAD_SETTINGS':
      return {
        topK: action.payload.topK,
        debug: action.payload.debug,
        filters: {
          source: action.payload.filterSource || undefined,
          title: action.payload.filterTitle || undefined,
        },
        activeDocument: action.payload.filterSource
          ? {
              source: action.payload.filterSource,
              title: action.payload.filterTitle || undefined,
            }
          : undefined,
      }
    default:
      return state
  }
}

const RagSettingsContext = createContext<RagSettingsContextType | undefined>(
  undefined
)

export function RagSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, dispatch] = useReducer(settingsReducer, loadSettings())

  // Persist to localStorage whenever settings change
  useEffect(() => {
    savePlaygroundSettings({
      topK: settings.topK,
      debug: settings.debug,
      filterSource: settings.filters.source || '',
      filterTitle: settings.filters.title || '',
    })
  }, [settings])

  const setTopK = (value: number) => {
    dispatch({ type: 'SET_TOP_K', payload: value })
  }

  const setDebug = (value: boolean) => {
    dispatch({ type: 'SET_DEBUG', payload: value })
  }

  const setFilters = (filters: { source?: string; title?: string }) => {
    dispatch({ type: 'SET_FILTERS', payload: filters })
  }

  const selectDocument = (document: { source: string; title?: string }) => {
    dispatch({ type: 'SELECT_DOCUMENT', payload: document })
  }

  const clearDocumentSelection = () => {
    dispatch({ type: 'CLEAR_DOCUMENT_SELECTION' })
  }

  return (
    <RagSettingsContext.Provider
      value={{
        settings,
        setTopK,
        setDebug,
        setFilters,
        selectDocument,
        clearDocumentSelection,
      }}
    >
      {children}
    </RagSettingsContext.Provider>
  )
}

export function useRagSettings(): RagSettingsContextType {
  const context = useContext(RagSettingsContext)
  if (context === undefined) {
    throw new Error('useRagSettings must be used within a RagSettingsProvider')
  }
  return context
}

