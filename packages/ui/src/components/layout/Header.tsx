import { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface HeaderProps {
  children: ReactNode
  className?: string
  sticky?: boolean
}

export default function Header({ children, className, sticky = false }: HeaderProps) {
  return (
    <header
      className={cn(
        'bg-white/80 backdrop-blur-md border-b border-stone-200',
        sticky && 'sticky top-0 z-40',
        className
      )}
    >
      <div className="container mx-auto px-4">
        {children}
      </div>
    </header>
  )
}
