import { ReactNode } from 'react'
import { cn } from '../../utils/cn'

export interface FooterProps {
  children: ReactNode
  className?: string
}

export default function Footer({ children, className }: FooterProps) {
  return (
    <footer className={cn('bg-white/80 backdrop-blur-sm border-t border-stone-200 py-8 mt-12', className)}>
      <div className="container mx-auto px-4">
        {children}
      </div>
    </footer>
  )
}
