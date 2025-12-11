'use client'

import Nav from '@/components/Nav'
import IngestForm from '@/features/ingest/IngestForm'
import { Card } from '@/components/ui/Card'

export default function IngestPage() {
  return (
    <>
      <Nav />
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Ingest Document</h1>
          <Card variant="elevated" padding="lg">
            <IngestForm showSampleButton={process.env.NODE_ENV === 'development'} />
          </Card>
        </div>
      </div>
    </>
  )
}
