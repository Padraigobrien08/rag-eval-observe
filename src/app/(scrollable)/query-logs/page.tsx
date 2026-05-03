import dynamic from 'next/dynamic'

const QueryLogsExplorerClient = dynamic(() => import('./QueryLogsExplorerClient'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-10 text-sm text-slate-600">
      Loading query logs…
    </div>
  ),
})

export default function QueryLogsPage() {
  return <QueryLogsExplorerClient />
}
