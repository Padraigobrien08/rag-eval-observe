'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useRagSettings } from '@/features/settings/useRagSettings'
import { Separator } from '@/components/ui/separator'

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { settings, setTopK, setDebug } = useRagSettings()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure your RAG query settings</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Query Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Query settings</h3>

            {/* Top K */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="topK" className="text-sm font-medium">
                  Top K
                </Label>
                <span className="text-xs text-muted-foreground">Number of chunks to retrieve</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTopK(Math.max(1, settings.topK - 1))}
                  disabled={settings.topK <= 1}
                  className="w-8 h-8 rounded border border-input bg-background text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg
                    className="w-4 h-4 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 12H4"
                    />
                  </svg>
                </button>
                <Input
                  id="topK"
                  type="number"
                  min={1}
                  max={50}
                  value={settings.topK}
                  onChange={e => {
                    const value = parseInt(e.target.value, 10)
                    if (!isNaN(value) && value >= 1 && value <= 50) {
                      setTopK(value)
                    }
                  }}
                  className="w-16 text-center"
                />
                <button
                  onClick={() => setTopK(Math.min(50, settings.topK + 1))}
                  disabled={settings.topK >= 50}
                  className="w-8 h-8 rounded border border-input bg-background text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <svg
                    className="w-4 h-4 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Debug Mode */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="debug" className="text-sm font-medium">
                  Debug mode
                </Label>
                <p className="text-xs text-muted-foreground">Show retrieved chunks and scores</p>
              </div>
              <Switch id="debug" checked={settings.debug} onCheckedChange={setDebug} />
            </div>
          </div>

          <Separator />

          {/* Experimental */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Experimental</h3>

            {/* Reranker */}
            <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Reranker</Label>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </div>
              <Switch disabled />
            </div>

            {/* Hybrid Search */}
            <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Hybrid search</Label>
                <p className="text-xs text-muted-foreground">Coming soon</p>
              </div>
              <Switch disabled />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
