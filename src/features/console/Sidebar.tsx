'use client'

import { useState } from 'react'
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

export default function Sidebar() {
  const [ingestOpen, setIngestOpen] = useState(false)
  const { topK, debug, setTopK, setDebug } = useRagSettings()
  const currentTopK = topK ?? 8

  return (
    <>
      <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
        <ScrollArea className="flex-1 min-h-0 space-y-6">
          {/* Documents */}
          <div>
            <div className="flex items-center justify-between px-4 py-2">
              <div className="text-xs font-semibold tracking-wide text-slate-500">DOCUMENTS</div>
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
              <div className="text-xs font-semibold tracking-wide text-slate-500">CHATS</div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="New chat"
                onClick={() => {
                  // Placeholder – real chat history later
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

            <DialogContent className="w-[92vw] max-w-lg rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
              <div className="space-y-7">
                {/* Header */}
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-900">Query settings</h2>
                  <p className="text-sm text-slate-500">
                    Control how many chunks are retrieved and whether debug info is shown.
                  </p>
                </div>

                {/* Top K section */}
                <section className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="top-k" className="text-sm font-medium text-slate-900">
                      Top K
                    </Label>
                    <p className="text-xs text-slate-500">
                      Number of chunks to retrieve per query.
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
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
                        className="w-20 text-sm"
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
                <section className="flex items-center justify-between gap-6 rounded-xl bg-slate-50 px-4 py-3">
                  <div className="space-y-1">
                    <Label htmlFor="debug-mode" className="text-sm font-medium text-slate-900">
                      Debug mode
                    </Label>
                    <p className="text-xs text-slate-500">
                      Show retrieved chunks and scores under answers.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{debug ? 'On' : 'Off'}</span>
                    <Switch id="debug-mode" checked={debug} onCheckedChange={setDebug} />
                  </div>
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
        }}
      />
    </>
  )
}
