import { useState, ReactNode, ButtonHTMLAttributes } from 'react'
import { cn } from '../utils/cn'

export interface Tab {
  id: string
  label: string
  icon?: ReactNode
  content: ReactNode
  disabled?: boolean
}

export interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  variant?: 'underline' | 'pills'
  className?: string
}

export default function Tabs({ tabs, defaultTab, variant = 'underline', className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)

  const activeTabData = tabs.find((tab) => tab.id === activeTab)

  if (variant === 'pills') {
    return (
      <div className={className}>
        <div className="flex flex-wrap gap-2 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={cn(
                'px-4 py-2 rounded-xl font-medium transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-amber-700 to-amber-800 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              )}
            >
              {tab.icon && <span className="mr-2">{tab.icon}</span>}
              {tab.label}
            </button>
          ))}
        </div>
        <div>{activeTabData?.content}</div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex border-b border-stone-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={cn(
              'px-4 py-3 font-medium transition-all duration-200 border-b-2 -mb-px',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              activeTab === tab.id
                ? 'border-amber-700 text-amber-700'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
            )}
          >
            {tab.icon && <span className="mr-2 inline-flex">{tab.icon}</span>}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-6">{activeTabData?.content}</div>
    </div>
  )
}
