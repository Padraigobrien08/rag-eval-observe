'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type AlertVariant = 'info' | 'success' | 'warning' | 'error'

interface AlertProps {
  variant?: AlertVariant
  title?: string
  description?: string | ReactNode
  children?: ReactNode
  className?: string
}

const variantStyles: Record<
  AlertVariant,
  { border: string; bg: string; text: string; icon?: string }
> = {
  info: {
    border: 'border-blue-500',
    bg: 'bg-blue-50',
    text: 'text-blue-900',
  },
  success: {
    border: 'border-green-500',
    bg: 'bg-green-50',
    text: 'text-green-900',
  },
  warning: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-50',
    text: 'text-yellow-900',
  },
  error: {
    border: 'border-red-500',
    bg: 'bg-red-50',
    text: 'text-red-900',
  },
}

export default function Alert({
  variant = 'info',
  title,
  description,
  children,
  className,
}: AlertProps) {
  const styles = variantStyles[variant]

  return (
    <div
      className={cn(
        'rounded-lg border-l-4 shadow-sm',
        styles.border,
        styles.bg,
        styles.text,
        'p-4',
        className
      )}
    >
      {title && <h4 className="font-semibold mb-1 text-sm">{title}</h4>}
      {description && (
        <div className="text-sm">
          {typeof description === 'string' ? <p>{description}</p> : description}
        </div>
      )}
      {children && <div className="text-sm mt-2">{children}</div>}
    </div>
  )
}
