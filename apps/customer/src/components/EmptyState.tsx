import { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="max-w-md w-full">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-stone-100 rounded-full mb-4">
          <Icon className="w-10 h-10 text-stone-400" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-stone-900 mb-2">{title}</h3>

        {/* Description */}
        {description && (
          <p className="text-stone-600 mb-6 max-w-sm mx-auto">{description}</p>
        )}

        {/* Action Button */}
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white font-medium rounded-xl hover:shadow-lg transition-shadow"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

export default EmptyState
