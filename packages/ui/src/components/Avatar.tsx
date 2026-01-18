import { HTMLAttributes, forwardRef } from 'react'
import { User } from 'lucide-react'
import { cn } from '../utils/cn'

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fallback?: string
}

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, size = 'md', fallback, ...props }, ref) => {
    const sizes = {
      xs: 'w-6 h-6 text-xs',
      sm: 'w-8 h-8 text-sm',
      md: 'w-10 h-10 text-base',
      lg: 'w-12 h-12 text-lg',
      xl: 'w-16 h-16 text-xl',
    }

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-full overflow-hidden bg-gradient-to-br from-stone-100 to-amber-100 flex items-center justify-center text-stone-600 font-medium',
          sizes[size],
          className
        )}
        {...props}
      >
        {src ? (
          <img src={src} alt={alt || 'Avatar'} className="w-full h-full object-cover" />
        ) : fallback ? (
          <span>{fallback}</span>
        ) : (
          <User className="w-1/2 h-1/2" />
        )}
      </div>
    )
  }
)

Avatar.displayName = 'Avatar'

export default Avatar
