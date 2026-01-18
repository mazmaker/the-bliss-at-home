import { HTMLAttributes } from 'react'
import { cn } from '../utils/cn'

export interface LoaderProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'white'
}

export default function Loader({ size = 'md', color = 'primary', className }: LoaderProps) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }

  const colors = {
    primary: 'border-amber-200 border-t-amber-700',
    white: 'border-white/30 border-t-white',
  }

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div
        className={cn(
          'rounded-full animate-spin',
          sizes[size],
          colors[color]
        )}
      />
    </div>
  )
}
