import './globals.css'

import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { Toaster } from '@/components/ui/sonner'

/** Only load Vercel Web Analytics when deployed on Vercel (avoids localhost 404 + console noise). */
const enableVercelAnalytics = process.env.VERCEL === '1'

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
        <Toaster richColors closeButton position="top-center" />
        {enableVercelAnalytics ? <Analytics /> : null}
      </body>
    </html>
  )
}
