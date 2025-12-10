interface StatPillProps {
  label: string
  value: string | number
  className?: string
}

export default function StatPill({ label, value, className = '' }: StatPillProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="text-xs font-medium text-gray-500">{label}:</span>
      <span className="text-xs font-semibold text-gray-900">{value}</span>
    </div>
  )
}
