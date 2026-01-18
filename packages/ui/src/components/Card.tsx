import { HTMLAttributes, forwardRef } from 'react'
import { cn } from '../utils/cn'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'selected' | 'hover'
  noPadding?: boolean
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', noPadding = false, children, ...props }, ref) => {
    const baseStyles = 'bg-white rounded-2xl shadow-lg transition-all duration-200'

    const variants = {
      default: 'border border-stone-100',
      selected: 'border-2 border-amber-500',
      hover: 'border border-stone-100 hover:border-amber-300 hover:shadow-xl',
    }

    return (
      <div
        ref={ref}
        className={cn(
          baseStyles,
          variants[variant],
          !noPadding && 'p-6',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export default Card
