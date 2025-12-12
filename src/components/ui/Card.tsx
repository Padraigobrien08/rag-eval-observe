import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Design tokens
const CARD_RADIUS = 'rounded-lg' // Can be changed to rounded-xl for larger cards
const CARD_BG = 'bg-white'
const CARD_BORDER = 'border border-gray-200/70'
const CARD_SHADOW = 'shadow-sm'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outlined' | 'elevated'
  radius?: 'default' | 'lg'
}

export function Card({
  children,
  className = '',
  padding = 'md',
  variant = 'default',
  radius = 'default',
}: CardProps) {
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  const variantClasses = {
    default: CARD_BG,
    outlined: `${CARD_BG} ${CARD_BORDER}`,
    elevated: `${CARD_BG} ${CARD_SHADOW}`,
  }

  const radiusClasses = {
    default: CARD_RADIUS,
    lg: 'rounded-xl',
  }

  return (
    <div
      className={cn(
        radiusClasses[radius],
        variantClasses[variant],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return <div className={cn('flex flex-col space-y-1.5', className)}>{children}</div>
}

interface CardTitleProps {
  children: ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

export function CardTitle({ children, className = '', as: Component = 'h3' }: CardTitleProps) {
  return (
    <Component className={cn('text-lg font-semibold text-gray-900 leading-none', className)}>
      {children}
    </Component>
  )
}

interface CardDescriptionProps {
  children: ReactNode
  className?: string
}

export function CardDescription({ children, className = '' }: CardDescriptionProps) {
  return <p className={cn('text-sm text-gray-500', className)}>{children}</p>
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={cn('', className)}>{children}</div>
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={cn('flex items-center pt-4 border-t border-gray-200/70', className)}>
      {children}
    </div>
  )
}

// Default export for backward compatibility
export default Card
