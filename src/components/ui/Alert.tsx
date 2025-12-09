import { ReactNode } from 'react'

interface AlertProps {
  children: ReactNode
  variant?: 'info' | 'success' | 'warning' | 'error'
  className?: string
}

export default function Alert({
  children,
  variant = 'info',
  className = '',
}: AlertProps) {
  const variantClasses = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  }

  return (
    <div
      className={`rounded-lg border p-4 ${variantClasses[variant]} ${className}`}
    >
      {children}
    </div>
  )
}

