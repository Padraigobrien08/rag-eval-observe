import type { Metadata } from 'next'
import './globals.css'
import { RagSettingsProvider } from '@/features/settings/useRagSettings'

export const metadata: Metadata = {
  title: 'RAG Eval Observability',
  description: 'RAG evaluation and observability platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" style={{ height: '100%' }}>
      <body className="h-full overflow-hidden m-0 p-0" style={{ height: '100%', margin: 0, padding: 0, overflow: 'hidden' }}>
        <div className="h-full w-full" style={{ height: '100%', width: '100%' }}>
          <RagSettingsProvider>{children}</RagSettingsProvider>
        </div>
      </body>
    </html>
  )
}
