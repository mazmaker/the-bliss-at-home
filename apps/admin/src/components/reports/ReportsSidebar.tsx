import {
  Building2,
  Users,
  Sparkles,
  TrendingUp,
  PieChart,
  BarChart3
} from 'lucide-react'

export type ReportSection = 'overview' | 'sales' | 'hotels' | 'staff' | 'services'

interface ReportsSidebarProps {
  activeSection: ReportSection
  onSectionChange: (section: ReportSection) => void
}

interface MenuItem {
  id: ReportSection
  icon: React.ElementType
  label: {
    th: string
    en: string
  }
  color: string
  hoverColor: string
  activeColor: string
  bgColor: string
}

const menuItems: MenuItem[] = [
  {
    id: 'overview',
    icon: PieChart,
    label: { th: 'ภาพรวม', en: 'Overview' },
    color: 'text-amber-600',
    hoverColor: 'hover:bg-amber-50',
    activeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    bgColor: 'bg-amber-500'
  },
  {
    id: 'sales',
    icon: BarChart3,
    label: { th: 'ยอดขาย', en: 'Sales' },
    color: 'text-emerald-600',
    hoverColor: 'hover:bg-emerald-50',
    activeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    bgColor: 'bg-emerald-500'
  },
  {
    id: 'hotels',
    icon: Building2,
    label: { th: 'โรงแรม', en: 'Hotels' },
    color: 'text-purple-600',
    hoverColor: 'hover:bg-purple-50',
    activeColor: 'bg-purple-100 text-purple-700 border-purple-200',
    bgColor: 'bg-purple-500'
  },
  {
    id: 'staff',
    icon: Users,
    label: { th: 'พนักงาน', en: 'Staff' },
    color: 'text-amber-600',
    hoverColor: 'hover:bg-amber-50',
    activeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    bgColor: 'bg-amber-500'
  },
  {
    id: 'services',
    icon: Sparkles,
    label: { th: 'บริการ', en: 'Services' },
    color: 'text-pink-600',
    hoverColor: 'hover:bg-pink-50',
    activeColor: 'bg-pink-100 text-pink-700 border-pink-200',
    bgColor: 'bg-pink-500'
  }
]

function ReportsSidebar({ activeSection, onSectionChange }: ReportsSidebarProps) {
  return (
    <div className="w-64 bg-white rounded-2xl shadow-lg border border-stone-100 h-fit sticky top-6">
      {/* Header */}
      <div className="p-6 border-b border-stone-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-amber-600 to-amber-700 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-stone-900">รายงาน</h2>
            <p className="text-sm text-stone-500">Analytics</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id

            return (
              <li key={item.id}>
                <button
                  onClick={() => onSectionChange(item.id)}
                  className={`
                    w-full flex items-center gap-4 px-4 py-4 rounded-xl border transition-all duration-200
                    ${isActive
                      ? `${item.activeColor} shadow-sm`
                      : `border-transparent ${item.hoverColor} hover:border-stone-200 hover:shadow-sm`
                    }
                    group
                  `}
                >
                  {/* Professional Icon Background */}
                  <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
                    ${isActive
                      ? `${item.bgColor} shadow-lg`
                      : 'bg-stone-100 group-hover:bg-stone-200'
                    }
                  `}>
                    <Icon className={`
                      w-5 h-5 transition-all duration-200
                      ${isActive ? 'text-white' : `${item.color} group-hover:scale-110`}
                    `} />
                  </div>

                  {/* Labels */}
                  <div className="flex-1 text-left">
                    <div className={`font-semibold text-sm transition-colors duration-200 ${isActive ? 'text-stone-900' : 'text-stone-700 group-hover:text-stone-900'}`}>
                      {item.label.th}
                    </div>
                    <div className={`text-xs transition-colors duration-200 ${isActive ? 'text-stone-600' : 'text-stone-500 group-hover:text-stone-600'}`}>
                      {item.label.en}
                    </div>
                  </div>

                  {/* Active indicator */}
                  {isActive && (
                    <div className={`w-1 h-10 ${item.bgColor} rounded-full shadow-sm`} />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-stone-200">
        <div className="bg-gradient-to-r from-stone-50 to-stone-100 rounded-xl p-3">
          <div className="text-xs text-stone-600 text-center">
            <div className="font-medium mb-1">📈 The Bliss Massage at Home</div>
            <div className="text-stone-500">Business Intelligence</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsSidebar