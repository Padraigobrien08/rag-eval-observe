import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RAG Eval Observability',
  description: 'RAG evaluation and observability platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
