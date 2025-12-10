'use client'

import { useState, useEffect, useCallback } from 'react'
import { loadRecentIngests, type RecentIngest } from '@/lib/storage/recentIngests'

export function useRecentIngests(refreshTrigger?: number) {
  const [ingests, setIngests] = useState<RecentIngest[]>([])

  const refresh = useCallback(() => {
    setIngests(loadRecentIngests())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh, refreshTrigger])

  return { ingests, refresh }
}
