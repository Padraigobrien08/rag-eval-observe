import './globals.css'

import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'

export const metadata: Metadata = {
  title: 'RAG Eval',
  description: 'RAG evaluation console',
  icons: {
    icon: '/RAGEvalIcon.png',
    apple: '/RAGEvalIcon.png',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-gray-900">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
