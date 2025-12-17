'use client'

import { useState } from 'react'
import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { useLocalStorage } from '@/features/settings/useLocalStorage'

export default function ConsoleLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage<boolean>(
    'rag-eval-sidebar-collapsed',
    false
  )

  return (
    <>
      {/* Desktop: Grid layout with collapsible sidebar */}
      <div
        className="hidden lg:grid h-screen w-full overflow-hidden bg-slate-50"
        style={{
          gridTemplateColumns: sidebarCollapsed
            ? '64px 1fr'
            : 'minmax(240px, 280px) 1fr',
          minHeight: '100vh',
          transition: 'grid-template-columns 0.2s ease-in-out',
        }}
      >
        {/* Left: sidebar - collapsible on desktop */}
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Right: main panel - fills remaining space */}
        <div className="flex min-w-0 overflow-hidden" style={{ minHeight: 0 }}>
          <ChatPanel sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        </div>
      </div>

      {/* Mobile/Tablet: Single column with drawer sidebar */}
      <div className="lg:hidden flex h-screen w-full overflow-hidden bg-slate-50">
        {/* Main panel - full width on mobile */}
        <div className="flex min-w-0 flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <ChatPanel sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        </div>

        {/* Sidebar as drawer on mobile */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[280px] max-w-[85vw] p-0 overflow-hidden">
            <div className="h-full">
              <Sidebar collapsed={false} onToggleCollapse={() => {}} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
