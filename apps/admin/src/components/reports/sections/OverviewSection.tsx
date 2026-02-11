import { useState, useRef, useEffect } from 'react'
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  AlertCircle,
  Download,
  FileText,
  Table,
  ChevronDown,
  Info,
  PieChart
} from 'lucide-react'
import { useReportsData } from '../../../hooks/useAnalytics'
import { quickExportPDF, quickExportExcel } from '../../../lib/exportUtils'

interface OverviewSectionProps {
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

function OverviewSection({ selectedPeriod }: OverviewSectionProps) {
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

  const {
    dashboardStats,
    isLoading,
    isError,
    error,
    states
  } = useReportsData(selectedPeriod)

  // Export handlers
  const handleExportPDF = async () => {
    if (!dashboardStats) {
      alert('No data available for export. Please wait for data to load. • ไม่มีข้อมูลสำหรับส่งออก กรุณารอให้ข้อมูลโหลดเสร็จก่อน')
      return
    }

    setIsExporting(true)
    try {
      await quickExportPDF(dashboardStats, [], [], [], selectedPeriod, null, null, null)
    } catch (error) {
      console.error('Export PDF failed:', error)
      alert('Failed to export PDF file. Please try again. • ไม่สามารถส่งออกไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsExporting(false)
      setShowExportDropdown(false)
    }
  }

  const handleExportExcel = async () => {
    if (!dashboardStats) {
      alert('No data available for export. Please wait for data to load. • ไม่มีข้อมูลสำหรับส่งออก กรุณารอให้ข้อมูลโหลดเสร็จก่อน')
      return
    }

    setIsExporting(true)
    try {
      await quickExportExcel(dashboardStats, [], [], [], selectedPeriod, null, null, null)
    } catch (error) {
      console.error('Export Excel failed:', error)
      alert('Failed to export Excel file. Please try again. • ไม่สามารถส่งออกไฟล์ Excel ได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsExporting(false)
      setShowExportDropdown(false)
    }
  }

  // Show error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-stone-100">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-stone-900 mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูล</h2>
            <p className="text-stone-500 mb-6">
              {error?.message || 'ไม่สามารถโหลดข้อมูลรายงานได้ กรุณาลองใหม่อีกครั้ง'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Section Header with Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-r from-amber-600 to-amber-700 rounded-xl flex items-center justify-center shadow-lg">
            <PieChart className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
              ภาพรวมธุรกิจ
              <Tooltip content="สถิติรวมของธุรกิจในช่วงเวลาที่เลือก | Overall business statistics for selected period">
                <Info className="w-5 h-5 text-stone-400 hover:text-amber-600 cursor-help" />
              </Tooltip>
            </h2>
            <p className="text-stone-500 mt-1">Business Overview • สถิติรวมและแนวโน้มธุรกิจ</p>
          </div>
        </div>

        {/* Export Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            disabled={isExporting || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Download className="w-5 h-5" />
            {isExporting ? 'กำลังส่งออก...' : 'ส่งออกรายงาน'}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showExportDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-10">
              <div className="px-4 py-2 bg-stone-50 border-b border-stone-200">
                <p className="text-xs font-medium text-stone-600">Export Overview • ส่งออกภาพรวม</p>
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

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Revenue Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 opacity-30 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <Tooltip content="Total revenue from all completed bookings in selected period | รายได้รวมจากการจองที่เสร็จสิ้นแล้วในช่วงเวลาที่เลือก">
                <p className="text-sm text-stone-600 flex items-center gap-2 cursor-help">
                  รายได้รวม • Total Revenue
                  <Info className="w-3 h-3" />
                </p>
              </Tooltip>
              <p className="text-3xl font-bold mt-3 mb-2 text-stone-900">
                {states.dashboardStats.isLoading
                  ? <div className="animate-pulse bg-stone-200 h-8 w-24 rounded"></div>
                  : states.dashboardStats.isError
                  ? <AlertCircle className="w-8 h-8 text-red-500" />
                  : `฿${(dashboardStats?.totalRevenue || 0).toLocaleString()}`}
              </p>
              <p className="text-sm text-stone-500 flex items-center gap-1">
                {states.dashboardStats.isLoading
                  ? <div className="animate-pulse bg-stone-200 h-3 w-20 rounded"></div>
                  : states.dashboardStats.isError
                  ? 'Data unavailable • ข้อมูลไม่พร้อมใช้งาน'
                  : dashboardStats?.revenueGrowth ? (
                    <>
                      <TrendingUp className={`w-3 h-3 ${dashboardStats.revenueGrowth < 0 ? 'rotate-180 text-red-500' : 'text-green-500'}`} />
                      <span className={dashboardStats.revenueGrowth < 0 ? 'text-red-500' : 'text-green-500'}>
                        {(dashboardStats.revenueGrowth > 0 ? '+' : '') + dashboardStats.revenueGrowth.toFixed(1)}% from last period
                      </span>
                    </>
                  ) : 'No comparison data • ไม่มีข้อมูลเปรียบเทียบ'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Total Bookings Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 opacity-30 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <Tooltip content="Total number of completed bookings in selected period | จำนวนการจองที่เสร็จสิ้นแล้วในช่วงเวลาที่เลือก">
                <p className="text-sm text-stone-600 flex items-center gap-2 cursor-help">
                  การจองทั้งหมด • Total Bookings
                  <Info className="w-3 h-3" />
                </p>
              </Tooltip>
              <p className="text-3xl font-bold mt-3 mb-2 text-stone-900">
                {states.dashboardStats.isLoading
                  ? <div className="animate-pulse bg-stone-200 h-8 w-16 rounded"></div>
                  : states.dashboardStats.isError
                  ? <AlertCircle className="w-8 h-8 text-red-500" />
                  : (dashboardStats?.totalBookings || 0).toLocaleString()}
              </p>
              <p className="text-sm text-stone-500 flex items-center gap-1">
                {states.dashboardStats.isLoading
                  ? <div className="animate-pulse bg-stone-200 h-3 w-20 rounded"></div>
                  : states.dashboardStats.isError
                  ? 'Data unavailable • ข้อมูลไม่พร้อมใช้งาน'
                  : dashboardStats?.bookingsGrowth ? (
                    <>
                      <TrendingUp className={`w-3 h-3 ${dashboardStats.bookingsGrowth < 0 ? 'rotate-180 text-red-500' : 'text-green-500'}`} />
                      <span className={dashboardStats.bookingsGrowth < 0 ? 'text-red-500' : 'text-green-500'}>
                        {(dashboardStats.bookingsGrowth > 0 ? '+' : '') + dashboardStats.bookingsGrowth.toFixed(1)}% from last period
                      </span>
                    </>
                  ) : 'No comparison data • ไม่มีข้อมูลเปรียบเทียบ'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* New Customers Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-purple-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 opacity-30 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <Tooltip content="Number of new customers who made their first booking in selected period | จำนวนลูกค้าใหม่ที่ทำการจองครั้งแรกในช่วงเวลาที่เลือก">
                <p className="text-sm text-stone-600 flex items-center gap-2 cursor-help">
                  ลูกค้าใหม่ • New Customers
                  <Info className="w-3 h-3" />
                </p>
              </Tooltip>
              <p className="text-3xl font-bold mt-3 mb-2 text-stone-900">
                {states.dashboardStats.isLoading
                  ? <div className="animate-pulse bg-stone-200 h-8 w-12 rounded"></div>
                  : states.dashboardStats.isError
                  ? <AlertCircle className="w-8 h-8 text-red-500" />
                  : (dashboardStats?.newCustomers || 0).toLocaleString()}
              </p>
              <p className="text-sm text-stone-500 flex items-center gap-1">
                {states.dashboardStats.isLoading
                  ? <div className="animate-pulse bg-stone-200 h-3 w-20 rounded"></div>
                  : states.dashboardStats.isError
                  ? 'Data unavailable • ข้อมูลไม่พร้อมใช้งาน'
                  : dashboardStats?.newCustomersGrowth ? (
                    <>
                      <TrendingUp className={`w-3 h-3 ${dashboardStats.newCustomersGrowth < 0 ? 'rotate-180 text-red-500' : 'text-green-500'}`} />
                      <span className={dashboardStats.newCustomersGrowth < 0 ? 'text-red-500' : 'text-green-500'}>
                        {(dashboardStats.newCustomersGrowth > 0 ? '+' : '') + dashboardStats.newCustomersGrowth.toFixed(0)} people
                      </span>
                    </>
                  ) : 'No comparison data • ไม่มีข้อมูลเปรียบเทียบ'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Average Booking Value Card */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-amber-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 opacity-30 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <Tooltip content="Average value per booking transaction in selected period | มูลค่าเฉลี่ยต่อการจองหนึ่งครั้งในช่วงเวลาที่เลือก">
                <p className="text-sm text-stone-600 flex items-center gap-2 cursor-help">
                  ค่าเฉลี่ยต่อการจอง • Average Value
                  <Info className="w-3 h-3" />
                </p>
              </Tooltip>
              <p className="text-3xl font-bold mt-3 mb-2 text-stone-900">
                {states.dashboardStats.isLoading
                  ? <div className="animate-pulse bg-stone-200 h-8 w-20 rounded"></div>
                  : states.dashboardStats.isError
                  ? <AlertCircle className="w-8 h-8 text-red-500" />
                  : `฿${(dashboardStats?.avgBookingValue || 0).toLocaleString()}`}
              </p>
              <p className="text-sm text-stone-500 flex items-center gap-1">
                {states.dashboardStats.isLoading
                  ? <div className="animate-pulse bg-stone-200 h-3 w-20 rounded"></div>
                  : states.dashboardStats.isError
                  ? 'Data unavailable • ข้อมูลไม่พร้อมใช้งาน'
                  : dashboardStats?.avgValueGrowth ? (
                    <>
                      <TrendingUp className={`w-3 h-3 ${dashboardStats.avgValueGrowth < 0 ? 'rotate-180 text-red-500' : 'text-green-500'}`} />
                      <span className={dashboardStats.avgValueGrowth < 0 ? 'text-red-500' : 'text-green-500'}>
                        {(dashboardStats.avgValueGrowth > 0 ? '+' : '') + dashboardStats.avgValueGrowth.toFixed(1)}% from last period
                      </span>
                    </>
                  ) : 'No comparison data • ไม่มีข้อมูลเปรียบเทียบ'}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Additional insights section */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 p-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">ข้อมูลเชิงลึก • Business Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-stone-900">การเติบโตของธุรกิจ</h4>
                <p className="text-sm text-stone-600">
                  {dashboardStats?.revenueGrowth && dashboardStats.revenueGrowth > 0
                    ? `ธุรกิจเติบโตดีขึ้น ${dashboardStats.revenueGrowth.toFixed(1)}% เมื่อเทียบกับช่วงก่อนหน้า`
                    : 'ยังไม่มีข้อมูลการเติบโตเพียงพอ'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-stone-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-stone-900">ฐานลูกค้า</h4>
                <p className="text-sm text-stone-600">
                  {dashboardStats?.newCustomers
                    ? `มีลูกค้าใหม่ ${dashboardStats.newCustomers} คนในช่วงเวลานี้`
                    : 'ยังไม่มีข้อมูลลูกค้าใหม่'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OverviewSection