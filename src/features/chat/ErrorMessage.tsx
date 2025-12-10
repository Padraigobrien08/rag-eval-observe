'use client'

import Alert from '@/components/ui/Alert'

interface ErrorMessageProps {
  message: string
  requestId?: string
  status?: number
  onRetry?: () => void
}

export default function ErrorMessage({ message, requestId, status, onRetry }: ErrorMessageProps) {
  return (
    <Alert variant="error">
      <div className="space-y-3">
        <div className="font-semibold text-sm mb-2">{status ? `Error ${status}` : 'Error'}</div>
        <p className="text-sm">{message}</p>
        {requestId && (
          <div className="text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
            Request ID: {requestId}
          </div>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </Alert>
  )
}
