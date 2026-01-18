import { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  className?: string
  position?: 'left' | 'right'
}

export default function Sidebar({
  isOpen,
  onClose,
  children,
  className,
  position = 'left',
}: SidebarProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 h-full w-64 bg-white border-r border-stone-200 z-50 transition-transform duration-300',
          'lg:relative lg:z-0 lg:translate-x-0',
          position === 'left' ? 'left-0' : 'right-0',
          isOpen ? 'translate-x-0' : position === 'left' ? '-translate-x-full' : 'translate-x-full',
          className
        )}
      >
        <div className="flex flex-col h-full">
          {/* Close button for mobile */}
          <div className="flex items-center justify-between p-4 lg:hidden border-b border-stone-200">
            <span className="font-semibold text-stone-900">เมนู</span>
            <button
              onClick={onClose}
              className="p-2 hover:bg-stone-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </div>
      </aside>
    </>
  )
}
