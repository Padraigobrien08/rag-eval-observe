import './globals.css'

import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/react'

export const metadata: Metadata = {
  title: 'RAG Eval',
  description: 'RAG evaluation console',
  icons: {
    icon: '/RAGEvalIcon.png',
    apple: '/RAGEvalIcon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-50 text-gray-900">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
