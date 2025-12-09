'use client'

import { useEffect } from 'react'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastProps {
  toast: Toast
  onDismiss: (id: string) => void
}

export default function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id)
    }, 5000) // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const bgColor =
    toast.type === 'success'
      ? 'bg-green-50 border-green-200'
      : toast.type === 'error'
      ? 'bg-red-50 border-red-200'
      : 'bg-blue-50 border-blue-200'

  const textColor =
    toast.type === 'success'
      ? 'text-green-800'
      : toast.type === 'error'
      ? 'text-red-800'
      : 'text-blue-800'

  const iconColor =
    toast.type === 'success'
      ? 'text-green-400'
      : toast.type === 'error'
      ? 'text-red-400'
      : 'text-blue-400'

  return (
    <div
      className={`${bgColor} border rounded-lg shadow-lg p-4 mb-3 min-w-[300px] max-w-md animate-slide-in-right`}
    >
      <div className="flex items-start">
        <div className={`flex-shrink-0 ${iconColor}`}>
          {toast.type === 'success' && (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {toast.type === 'error' && (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {toast.type === 'info' && (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${textColor}`}>{toast.message}</p>
          {toast.action && (
            <button
              onClick={() => {
                toast.action?.onClick()
                onDismiss(toast.id)
              }}
              className={`mt-2 text-sm font-medium ${textColor} underline hover:opacity-80`}
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className={`ml-4 flex-shrink-0 ${textColor} hover:opacity-70 focus:outline-none`}
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

