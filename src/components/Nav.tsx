'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Nav() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link
              href="/"
              className="flex items-center px-4 text-lg font-semibold text-gray-900 hover:text-blue-600"
            >
              RAG Eval
            </Link>
            <div className="flex space-x-1 ml-8">
              <Link
                href="/playground"
                className={`flex items-center px-4 text-sm font-medium transition-colors ${
                  isActive('/playground')
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Playground
              </Link>
              <Link
                href="/ingest"
                className={`flex items-center px-4 text-sm font-medium transition-colors ${
                  isActive('/ingest')
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Ingest
              </Link>
              <Link
                href="/metrics"
                className={`flex items-center px-4 text-sm font-medium transition-colors ${
                  isActive('/metrics')
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Metrics
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

