'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SettingsSheet({ open, onOpenChange }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4 text-sm text-slate-600">
          {/* You can wire topK/debug/etc later; this is just a visual stub */}
          <p>RAG settings will go here: Top K, debug mode, hybrid search, etc.</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
