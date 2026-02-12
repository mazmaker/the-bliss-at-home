import { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import ReportsSidebar, { type ReportSection } from '../components/reports/ReportsSidebar'
import OverviewSection from '../components/reports/sections/OverviewSection'
import SalesSection from '../components/reports/sections/SalesSection'
import HotelSection from '../components/reports/sections/HotelSection'
import StaffSection from '../components/reports/sections/StaffSection'
import ServicesSection from '../components/reports/sections/ServicesSection'

// Bilingual period labels
const periodLabels = {
  daily: { th: 'รายวัน', en: 'Daily' },
  weekly: { th: 'สัปดาห์นี้', en: 'This Week' },
  month: { th: 'เดือนนี้', en: 'This Month' },
  '3_months': { th: '3 เดือนนี้', en: 'Last 3 Months' },
  '6_months': { th: '6 เดือนนี้', en: 'Last 6 Months' },
  year: { th: 'ปีนี้', en: 'This Year' }
} as const

function Reports() {
  const [activeSection, setActiveSection] = useState<ReportSection>('overview')
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'month' | '3_months' | '6_months' | 'year'>('month')

  // Handle period change
  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPeriod = e.target.value as 'daily' | 'weekly' | 'month' | '3_months' | '6_months' | 'year'
    setSelectedPeriod(newPeriod)
    console.log('Period changed to:', newPeriod) // Debug log
  }

  // Render content based on active section
  const renderSectionContent = () => {
    const commonProps = { selectedPeriod }

    switch (activeSection) {
      case 'overview':
        return <OverviewSection {...commonProps} />
      case 'sales':
        return <SalesSection {...commonProps} />
      case 'hotels':
        return <HotelSection {...commonProps} />
      case 'staff':
        return <StaffSection {...commonProps} />
      case 'services':
        return <ServicesSection {...commonProps} />
      default:
        return <OverviewSection {...commonProps} />
    }
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar Navigation */}
      <ReportsSidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      {/* Main Content Area */}
      <div className="flex-1 space-y-6">
        {/* Header with Period Selector */}
        <div className="bg-gradient-to-r from-stone-50 to-stone-100 rounded-2xl p-6 border border-stone-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-amber-600 to-amber-700 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-stone-900">
                  รายงานและการวิเคราะห์
                </h1>
                <p className="text-stone-500">Reports & Analytics Dashboard</p>
              </div>
            </div>

            {/* Period Selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-stone-700">
                ช่วงเวลา • Period:
              </label>
              <select
                className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500 shadow-sm min-w-[160px]"
                value={selectedPeriod}
                onChange={handlePeriodChange}
              >
                {Object.entries(periodLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label.th} • {label.en}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Dynamic Section Content */}
        {renderSectionContent()}
      </div>
    </div>
  )
}

export default Reports