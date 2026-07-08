'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'

const EvalRunsHub = dynamic(() => import('./EvalRunsHub'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-10 text-sm text-slate-600">
      Loading eval…
    </div>
  ),
})

function Fallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-10 text-sm text-slate-600">
      Loading eval…
    </div>
  )
}

export default function EvalRunsPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <EvalRunsHub />
    </Suspense>
  )
}
