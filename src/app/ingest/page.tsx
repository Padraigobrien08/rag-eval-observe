'use client'

import { useRouter } from 'next/navigation'
import Nav from '@/components/Nav'
import IngestForm from '@/features/ingest/IngestForm'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useRecentIngests } from '@/features/ingest/useRecentIngests'
import { useRagSettings } from '@/features/settings/useRagSettings'
import type { RecentIngest } from '@/lib/storage/recentIngests'

export default function IngestPage() {
  const router = useRouter()
  const { ingests } = useRecentIngests()
  const { selectDocument } = useRagSettings()
  const recentIngests = ingests.slice(0, 5) // Last 5 ingests

  const handleUseAsFilter = (ingest: RecentIngest) => {
    selectDocument({ source: ingest.source, title: ingest.title })
    router.push('/')
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(date)
    } catch {
      return 'Unknown'
    }
  }

  return (
    <>
      <Nav />
      <div className="min-h-screen bg-neutral-50/50 py-8">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Ingest document</h1>
            <p className="text-sm text-gray-500 mt-1">Add content to your RAG knowledge base.</p>
          </div>

          {/* Main Content - Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ingest Form - Takes 2 columns on large screens */}
            <div className="lg:col-span-2">
              <Card variant="outlined" padding="lg" radius="lg">
                <IngestForm showSampleButton={process.env.NODE_ENV === 'development'} />
              </Card>
            </div>

            {/* Recent Ingests Card - Takes 1 column on large screens */}
            <div className="lg:col-span-1">
              <Card variant="outlined" padding="md" radius="lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold">Recent ingests</CardTitle>
                </CardHeader>
                <CardContent>
                  {recentIngests.length === 0 ? (
                    <p className="text-xs text-gray-500">No recent ingests</p>
                  ) : (
                    <div className="space-y-3">
                      {recentIngests.map(ingest => (
                        <div
                          key={ingest.document_id}
                          className="border border-gray-200 rounded-lg p-3 space-y-2"
                        >
                          {/* Title/Source */}
                          <div>
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {ingest.title || ingest.source}
                            </div>
                            {ingest.title && (
                              <div className="text-xs text-gray-500 truncate mt-0.5">
                                {ingest.source}
                              </div>
                            )}
                          </div>

                          {/* Metadata */}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{ingest.chunks_created} chunks</span>
                            <span>{formatDate(ingest.created_at)}</span>
                          </div>

                          {/* Use as Filter Button */}
                          <button
                            onClick={() => handleUseAsFilter(ingest)}
                            className="w-full px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                          >
                            Use as filter
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
