'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Plus, Settings } from 'lucide-react'
import IngestDialog from './IngestDialog'
import { useRagSettings } from '@/features/settings/useRagSettings'
import { useState } from 'react'

export default function Sidebar() {
  const [ingestOpen, setIngestOpen] = useState(false)
  const { topK, debug, setTopK, setDebug } = useRagSettings()
  const currentTopK = topK ?? 8

  return (
    <>
      <aside className="h-screen w-64 border-r border-slate-200 bg-white flex flex-col">
        <ScrollArea className="flex-1 min-h-0 space-y-6">
          {/* Documents */}
          <div>
            <div className="flex items-center justify-between px-4 py-2">
              <div className="text-xs font-semibold text-slate-500 tracking-wide">DOCUMENTS</div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Ingest document"
                onClick={() => setIngestOpen(true)}
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="px-4 text-xs text-slate-500">No documents yet.</p>
          </div>

          {/* Chats */}
          <div>
            <div className="flex items-center justify-between px-4 py-2">
              <div className="text-xs font-semibold text-slate-500 tracking-wide">CHATS</div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="New chat"
                onClick={() => {
                  // For now just a placeholder – real chat history later
                }}
                className="h-8 w-8"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="px-4 text-xs text-slate-500">No chats yet. Start a new chat.</p>
          </div>
        </ScrollArea>

        <div className="border-t border-slate-200 px-4 py-2">
          <Dialog>
            <DialogTrigger asChild>
              <button className="mt-auto mb-3 flex items-center gap-2 rounded-full px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </button>
            </DialogTrigger>
            <DialogContent className="p-6 md:p-10">
              <div className="space-y-6">
                {/* Header */}
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-900">Query settings</h2>
                  <p className="text-sm text-slate-500">
                    Control how many chunks are retrieved and whether debug info is shown.
                  </p>
                </div>

                {/* Top K section */}
                <section className="space-y-2">
                  <Label htmlFor="top-k" className="text-sm font-medium text-slate-800">
                    Top K
                  </Label>
                  <p className="text-xs text-slate-500">Number of chunks to retrieve per query.</p>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <Input
                        id="top-k"
                        type="number"
                        min={1}
                        max={50}
                        step={1}
                        value={currentTopK}
                        onChange={e => {
                          const value = Number(e.target.value)
                          if (!Number.isNaN(value)) {
                            const clamped = Math.min(50, Math.max(1, value))
                            setTopK(clamped)
                          }
                        }}
                        className="w-24 text-sm"
                      />
                      <span className="text-xs text-slate-500">chunks per query</span>
                    </div>
                    <Slider
                      min={1}
                      max={50}
                      step={1}
                      value={[currentTopK]}
                      onValueChange={([value]) => setTopK(value)}
                      className="w-full"
                    />
                  </div>
                </section>

                {/* Debug mode section */}
                <section className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                  <div className="space-y-1">
                    <Label htmlFor="debug-mode" className="text-sm font-medium text-slate-800">
                      Debug mode
                    </Label>
                    <p className="text-xs text-slate-500">
                      Show retrieved chunks and scores under answers.
                    </p>
                  </div>
                  <Switch
                    id="debug-mode"
                    checked={debug}
                    onCheckedChange={setDebug}
                    className="ml-4"
                  />
                </section>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </aside>

      <IngestDialog
        open={ingestOpen}
        onOpenChange={setIngestOpen}
        onSuccess={() => {
          // TODO: Refresh documents list when implemented
          // For now, this is a placeholder for future document list refresh
        }}
      />
    </>
  )
}
