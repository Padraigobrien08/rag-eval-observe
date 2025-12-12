'use client'

const STORAGE_KEY = 'rag-sidebar-preferences'

export interface SidebarPreferences {
  width: number
  collapsed: boolean
}

const DEFAULT_PREFERENCES: SidebarPreferences = {
  width: 320, // 80 * 4px = 320px (w-80)
  collapsed: false,
}

const MIN_WIDTH = 200
const MAX_WIDTH = 600

export function loadSidebarPreferences(): SidebarPreferences {
  if (typeof window === 'undefined') {
    return DEFAULT_PREFERENCES
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return {
        width: Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, parsed.width || DEFAULT_PREFERENCES.width)),
        collapsed: parsed.collapsed ?? DEFAULT_PREFERENCES.collapsed,
      }
    }
  } catch (error) {
    console.error('Failed to load sidebar preferences:', error)
  }

  return DEFAULT_PREFERENCES
}

export function saveSidebarPreferences(preferences: Partial<SidebarPreferences>): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const current = loadSidebarPreferences()
    const updated = { ...current, ...preferences }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('Failed to save sidebar preferences:', error)
  }
}

export { MIN_WIDTH, MAX_WIDTH }
