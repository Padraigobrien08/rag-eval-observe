'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart3 } from 'lucide-react'

interface HeaderProps {
  connectionStatus: { ok: boolean; db?: boolean } | null
  onMetricsClick: () => void
  onNewChat: () => void
}

export default function Header({ connectionStatus, onMetricsClick, onNewChat }: HeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 border-b bg-white/80 backdrop-blur">
      {/* Left: Title */}
      <div>
        <h1 className="text-lg font-semibold text-slate-900">RAG Eval</h1>
        <p className="text-xs text-muted-foreground">RAG evaluation console</p>
      </div>

      {/* Right: Status and Actions */}
      <div className="flex items-center gap-2">
        {/* Connection Status */}
        {connectionStatus && (
          <Badge
            variant={connectionStatus.ok && connectionStatus.db ? 'default' : 'destructive'}
            className="gap-1.5"
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                connectionStatus.ok && connectionStatus.db ? 'bg-white' : 'bg-white'
              }`}
            />
            {connectionStatus.ok && connectionStatus.db ? 'Connected' : 'Disconnected'}
          </Badge>
        )}

        {/* Metrics Button */}
        <Button variant="outline" size="sm" onClick={onMetricsClick}>
          <BarChart3 className="h-4 w-4" />
          Metrics
        </Button>

        {/* New Chat Button */}
        <Button variant="ghost" size="sm" onClick={onNewChat}>
          New chat
        </Button>
      </div>
    </div>
  )
}
