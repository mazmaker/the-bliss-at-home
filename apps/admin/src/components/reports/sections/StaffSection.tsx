import { useState, useRef, useEffect } from 'react'
import {
  Download,
  FileText,
  Table,
  ChevronDown,
  Info,
  Users
} from 'lucide-react'
import StaffReports from '../StaffReports'
import { useStaffOverview, useStaffPerformance, useStaffEarnings } from '../../../hooks/useAnalytics'
import { quickExportPDF, quickExportExcel } from '../../../lib/exportUtils'

interface StaffSectionProps {
  selectedPeriod: 'daily' | 'weekly' | 'month' | '3_months' | '6_months' | 'year'
}

// Tooltip Component for better explanations
const Tooltip = ({ content, children }: { content: string, children: React.ReactNode }) => (
  <div className="group relative inline-block">
    {children}
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-stone-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
      {content}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
    </div>
  </div>
)

function StaffSection({ selectedPeriod }: StaffSectionProps) {
  const [showExportDropdown, setShowExportDropdown] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Convert selectedPeriod to days for staff analytics
  const periodDays = {
    daily: 1,
    weekly: 7,
    month: 30,
    '3_months': 90,
    '6_months': 180,
    year: 365
  }

  const days = periodDays[selectedPeriod]

  const staffOverview = useStaffOverview(days)
  const staffPerformance = useStaffPerformance(days, 10)
  const staffEarnings = useStaffEarnings(days)

  // Export handlers
  const handleExportPDF = async () => {
    if (!staffOverview.data && !staffPerformance.data && !staffEarnings.data) {
      alert('No staff data available for export. • ไม่มีข้อมูลพนักงานสำหรับส่งออก')
      return
    }

    setIsExporting(true)
    try {
      await quickExportPDF(
        null, // dashboardStats
        [], // categories
        [], // topServices
        [], // hotelPerformance
        selectedPeriod,
        staffOverview.data,
        staffPerformance.data,
        staffEarnings.data
      )
    } catch (error) {
      console.error('Export PDF failed:', error)
      alert('Failed to export PDF file. Please try again. • ไม่สามารถส่งออกไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsExporting(false)
      setShowExportDropdown(false)
    }
  }

  const handleExportExcel = async () => {
    if (!staffOverview.data && !staffPerformance.data && !staffEarnings.data) {
      alert('No staff data available for export. • ไม่มีข้อมูลพนักงานสำหรับส่งออก')
      return
    }

    setIsExporting(true)
    try {
      await quickExportExcel(
        null, // dashboardStats
        [], // categories
        [], // topServices
        [], // hotelPerformance
        selectedPeriod,
        staffOverview.data,
        staffPerformance.data,
        staffEarnings.data
      )
    } catch (error) {
      console.error('Export Excel failed:', error)
      alert('Failed to export Excel file. Please try again. • ไม่สามารถส่งออกไฟล์ Excel ได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsExporting(false)
      setShowExportDropdown(false)
    }
  }

  const isLoading = staffOverview.isLoading || staffPerformance.isLoading || staffEarnings.isLoading

  return (
    <div className="space-y-6">
      {/* Section Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            👥 ประสิทธิภาพพนักงาน
            <Tooltip content="การวิเคราะห์ประสิทธิภาพและรายได้ของพนักงาน | Staff performance and earnings analytics">
              <Info className="w-5 h-5 text-stone-400 hover:text-amber-600 cursor-help" />
            </Tooltip>
          </h2>
          <p className="text-stone-500 mt-1">Staff Performance Analytics • การวิเคราะห์ประสิทธิภาพพนักงาน</p>
        </div>

        {/* Export Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            disabled={isExporting || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl font-medium hover:from-amber-700 hover:to-amber-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Download className="w-5 h-5" />
            {isExporting ? 'กำลังส่งออก...' : 'ส่งออกพนักงาน'}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showExportDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-10">
              <div className="px-4 py-2 bg-stone-50 border-b border-stone-200">
                <p className="text-xs font-medium text-stone-600">Export Staff Data • ส่งออกข้อมูลพนักงาน</p>
              </div>
              <button
                onClick={handleExportPDF}
                disabled={isExporting || isLoading}
                className="w-full text-left px-4 py-3 hover:bg-stone-50 flex items-center gap-3 text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <div className="font-medium text-sm">Export as PDF</div>
                  <div className="text-xs text-stone-500">ส่งออกเป็นไฟล์ PDF</div>
                </div>
              </button>
              <button
                onClick={handleExportExcel}
                disabled={isExporting || isLoading}
                className="w-full text-left px-4 py-3 hover:bg-stone-50 flex items-center gap-3 text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Table className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-sm">Export as Excel</div>
                  <div className="text-xs text-stone-500">ส่งออกเป็นไฟล์ Excel</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Staff Reports Content */}
      <StaffReports selectedPeriod={selectedPeriod} />

      {/* Additional Staff Insights */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 p-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
          📈 ข้อมูลเชิงลึกพนักงาน • Staff Insights
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-stone-700">Workforce Performance • ประสิทธิภาพทีมงาน</h4>
            <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-amber-700" />
                <span className="font-medium text-amber-800">Team Size</span>
              </div>
              <p className="text-sm text-amber-700">
                {staffOverview.data?.totalStaff
                  ? `Currently managing ${staffOverview.data.totalStaff} staff members with ${staffOverview.data.activeStaff} active workers`
                  : 'Loading staff information...'}
              </p>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-green-700" />
                <span className="font-medium text-green-800">Earnings Performance</span>
              </div>
              <p className="text-sm text-green-700">
                {staffOverview.data?.totalEarnings
                  ? `Total staff earnings: ฿${staffOverview.data.totalEarnings.toLocaleString()} with average of ฿${Math.round(staffOverview.data.avgEarningsPerStaff || 0).toLocaleString()} per staff`
                  : 'Loading earnings information...'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-stone-700">Quality Metrics • เมตริกคุณภาพ</h4>
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-purple-700" />
                <span className="font-medium text-purple-800">Service Rating</span>
              </div>
              <p className="text-sm text-purple-700">
                {staffOverview.data?.avgRating
                  ? `Average staff rating: ${staffOverview.data.avgRating.toFixed(1)} out of 5.0 stars`
                  : 'Loading rating information...'}
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-5 h-5 text-blue-700" />
                <span className="font-medium text-blue-800">Productivity</span>
              </div>
              <p className="text-sm text-blue-700">
                {staffOverview.data?.totalBookingsHandled
                  ? `Total bookings handled: ${staffOverview.data.totalBookingsHandled.toLocaleString()} jobs completed`
                  : 'Loading productivity information...'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StaffSection