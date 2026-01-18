import { ReactNode } from 'react'
import { cn } from '../utils/cn'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export default function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('text-center py-12 px-4', className)}>
      {icon && <div className="flex justify-center mb-4 text-stone-400">{icon}</div>}
      <h3 className="text-lg font-medium text-stone-900 mb-2">{title}</h3>
      {description && <p className="text-stone-500 mb-6">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
