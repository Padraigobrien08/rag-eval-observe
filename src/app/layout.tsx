import type { Metadata } from 'next'
import './globals.css'
import { RagSettingsProvider } from '@/features/settings/useRagSettings'

export const metadata: Metadata = {
  title: 'RAG Eval Observability',
  description: 'RAG evaluation and observability platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <RagSettingsProvider>{children}</RagSettingsProvider>
      </body>
    </html>
  )
}
