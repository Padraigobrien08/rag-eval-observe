import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outlined' | 'elevated'
}

export default function Card({
  children,
  className = '',
  padding = 'md',
  variant = 'default',
}: CardProps) {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  const variantClasses = {
    default: 'bg-white',
    outlined: 'bg-white border border-gray-200',
    elevated: 'bg-white shadow-sm',
  }

  return (
    <div
      className={`rounded-lg ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  )
}

