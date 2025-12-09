'use client'

import Nav from '@/components/Nav'
import IngestForm from '@/features/ingest/IngestForm'

export default function IngestPage() {
  return (
    <>
      <Nav />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Ingest Document
          </h1>
          <div className="bg-white rounded-lg shadow p-6">
            <IngestForm showSampleButton={process.env.NODE_ENV === 'development'} />
          </div>
        </div>
      </div>
    </>
  )
}

