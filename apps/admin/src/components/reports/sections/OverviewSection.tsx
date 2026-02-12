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
  PieChart,
  Repeat,
  Heart,
  Star,
  UserPlus
} from 'lucide-react'
import {
  useReportsData,
  useCustomerBehaviorAnalytics,
  useCustomerSegments,
  useCustomerSatisfactionMetrics
} from '../../../hooks/useAnalytics'
import { quickExportPDF, quickExportExcel } from '../../../lib/exportUtils'
import BusinessReportGenerator from '../BusinessReportGenerator'
import BusinessInsightsAnalyzer from '../BusinessInsightsAnalyzer'

interface OverviewSectionProps {
  selectedPeriod: 'daily' | 'weekly' | 'month' | '3_months' | '6_months' | 'year'
}

// Tooltip Component for better explanations
const Tooltip = ({ content, children }: { content: string, children: React.ReactNode }) => (
  <div className="group relative inline-block">
    {children}
    <div className="absolute bottom-full left-0 mb-2 px-4 py-3 bg-stone-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 w-80">
      <div className="text-left leading-relaxed whitespace-normal">
        {content}
      </div>
      <div className="absolute top-full left-6 border-4 border-transparent border-t-stone-800"></div>
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

  // Convert selectedPeriod to days for customer behavior analytics
  const periodDays = {
    daily: 1,
    weekly: 7,
    month: 30,
    '3_months': 90,
    '6_months': 180,
    year: 365
  }

  const days = periodDays[selectedPeriod]

  // Customer behavior analytics
  const customerBehavior = useCustomerBehaviorAnalytics(days)
  const customerSegments = useCustomerSegments(days)
  const customerSatisfaction = useCustomerSatisfactionMetrics(days)

  // Export handlers
  const handleExportPDF = async () => {
    if (!dashboardStats) {
      alert('No data available for export. Please wait for data to load. • ไม่มีข้อมูลสำหรับส่งออก กรุณารอให้ข้อมูลโหลดเสร็จก่อน')
      return
    }

    setIsExporting(true)
    try {
      await quickExportPDF(dashboardStats, [], [], [], selectedPeriod, null, [], [])
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
      await quickExportExcel(dashboardStats, [], [], [], selectedPeriod, null, [], [])
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
      {/* Business Report Generator */}
      <BusinessReportGenerator selectedPeriod={selectedPeriod} />

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
            <div className="text-stone-500 mt-1">Business Overview • สถิติรวมและแนวโน้มธุรกิจ</div>
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
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-stone-200 hover:shadow-md transition-all duration-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 opacity-20 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex-1">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">รายได้รวม</p>
              <div className="text-3xl font-bold text-stone-900 mb-1">
                {states.dashboardStats.isLoading
                  ? <div className="animate-pulse bg-stone-200 h-8 w-24 rounded"></div>
                  : states.dashboardStats.isError
                  ? <AlertCircle className="w-8 h-8 text-red-500" />
                  : `฿${(dashboardStats?.totalRevenue || 0).toLocaleString()}`}
              </div>
              {dashboardStats?.revenueGrowth && (
                <div className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                  dashboardStats.revenueGrowth >= 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {(dashboardStats.revenueGrowth > 0 ? '+' : '') + dashboardStats.revenueGrowth.toFixed(1)}%
                </div>
              )}
            </div>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Total Bookings Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-stone-200 hover:shadow-md transition-all duration-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 opacity-20 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex-1">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">การจอง</p>
              <div className="text-3xl font-bold text-stone-900 mb-1">
                {states.dashboardStats.isLoading
                  ? <div className="animate-pulse bg-stone-200 h-8 w-20 rounded"></div>
                  : states.dashboardStats.isError
                  ? <AlertCircle className="w-8 h-8 text-red-500" />
                  : (dashboardStats?.totalBookings || 0).toLocaleString()}
              </div>
              {dashboardStats?.bookingsGrowth && (
                <div className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                  dashboardStats.bookingsGrowth >= 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {(dashboardStats.bookingsGrowth > 0 ? '+' : '') + dashboardStats.bookingsGrowth.toFixed(1)}%
                </div>
              )}
            </div>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* New Customers Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-stone-200 hover:shadow-md transition-all duration-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 opacity-20 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex-1">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">ลูกค้าใหม่</p>
              <div className="text-3xl font-bold text-stone-900 mb-1">
                {states.dashboardStats.isLoading
                  ? <div className="animate-pulse bg-stone-200 h-8 w-16 rounded"></div>
                  : states.dashboardStats.isError
                  ? <AlertCircle className="w-8 h-8 text-red-500" />
                  : (dashboardStats?.newCustomers || 0).toLocaleString()}
              </div>
              {dashboardStats?.newCustomersGrowth && (
                <div className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                  dashboardStats.newCustomersGrowth >= 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {(dashboardStats.newCustomersGrowth > 0 ? '+' : '') + dashboardStats.newCustomersGrowth.toFixed(0)}
                </div>
              )}
            </div>
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <Users className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Average Booking Value Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-stone-200 hover:shadow-md transition-all duration-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 opacity-20 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="flex-1">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">ค่าเฉลี่ย</p>
              <div className="text-3xl font-bold text-stone-900 mb-1">
                {states.dashboardStats.isLoading
                  ? <div className="animate-pulse bg-stone-200 h-8 w-24 rounded"></div>
                  : states.dashboardStats.isError
                  ? <AlertCircle className="w-8 h-8 text-red-500" />
                  : `฿${(dashboardStats?.avgBookingValue || 0).toLocaleString()}`}
              </div>
              {dashboardStats?.avgValueGrowth && (
                <div className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                  dashboardStats.avgValueGrowth >= 0
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {(dashboardStats.avgValueGrowth > 0 ? '+' : '') + dashboardStats.avgValueGrowth.toFixed(1)}%
                </div>
              )}
            </div>
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Customer Behavior Analytics Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden">
        <div className="bg-gradient-to-r from-stone-50 to-stone-100 p-6 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl flex items-center justify-center shadow-lg">
              <Repeat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                พฤติกรรมลูกค้า
                <Tooltip content="การวิเคราะห์พฤติกรรมลูกค้า รวมถึงอัตราการจองซ้ำ และความภักดี | Customer behavior analysis including repeat booking rates and loyalty metrics">
                  <Info className="w-5 h-5 text-stone-400 hover:text-purple-600 cursor-help" />
                </Tooltip>
              </h3>
              <p className="text-stone-500 mt-1">Customer Behavior Analytics • การวิเคราะห์พฤติกรรมและความภักดีของลูกค้า</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer Behavior Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Repeat Booking Rate */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-stone-200 hover:shadow-md transition-all duration-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 opacity-20 rounded-full transform translate-x-16 -translate-y-16"></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex-1">
                  <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">อัตราการจองซ้ำ</p>
                  <div className="text-3xl font-bold text-stone-900 mb-1">
                    {customerBehavior.isLoading
                      ? <div className="animate-pulse bg-stone-200 h-8 w-16 rounded"></div>
                      : customerBehavior.isError
                      ? <AlertCircle className="w-8 h-8 text-red-500" />
                      : `${customerBehavior.data?.repeat_booking_rate || 0}%`}
                  </div>
                  {customerBehavior.data?.returning_customer_growth && (
                    <div className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                      customerBehavior.data.returning_customer_growth >= 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {(customerBehavior.data.returning_customer_growth > 0 ? '+' : '') + customerBehavior.data.returning_customer_growth.toFixed(1)}%
                    </div>
                  )}
                </div>
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                  <Repeat className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* Customer Lifetime Value */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-stone-200 hover:shadow-md transition-all duration-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 opacity-20 rounded-full transform translate-x-16 -translate-y-16"></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex-1">
                  <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">ค่าเฉลี่ยลูกค้า</p>
                  <div className="text-3xl font-bold text-stone-900 mb-1">
                    {customerBehavior.isLoading
                      ? <div className="animate-pulse bg-stone-200 h-8 w-20 rounded"></div>
                      : customerBehavior.isError
                      ? <AlertCircle className="w-8 h-8 text-red-500" />
                      : `฿${customerBehavior.data?.avg_customer_lifetime_value?.toLocaleString() || '0'}`}
                  </div>
                  {customerBehavior.data?.clv_growth && (
                    <div className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                      customerBehavior.data.clv_growth >= 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {(customerBehavior.data.clv_growth > 0 ? '+' : '') + customerBehavior.data.clv_growth.toFixed(1)}%
                    </div>
                  )}
                </div>
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                  <Heart className="w-8 h-8 text-emerald-600" />
                </div>
              </div>
            </div>

            {/* Customer Retention Rate */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-stone-200 hover:shadow-md transition-all duration-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 opacity-20 rounded-full transform translate-x-16 -translate-y-16"></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex-1">
                  <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">อัตราการกลับมา</p>
                  <div className="text-3xl font-bold text-stone-900 mb-1">
                    {customerBehavior.isLoading
                      ? <div className="animate-pulse bg-stone-200 h-8 w-16 rounded"></div>
                      : customerBehavior.isError
                      ? <AlertCircle className="w-8 h-8 text-red-500" />
                      : `${customerBehavior.data?.customer_retention_rate || 0}%`}
                  </div>
                  <div className="text-xs text-stone-500">
                    Churn: {customerBehavior.data?.churn_rate || 0}%
                  </div>
                </div>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserPlus className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* Customer Satisfaction */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-stone-200 hover:shadow-md transition-all duration-200 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-50 opacity-20 rounded-full transform translate-x-16 -translate-y-16"></div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex-1">
                  <p className="text-xs text-stone-500 uppercase tracking-wide mb-2">ความพึงพอใจ</p>
                  <div className="text-3xl font-bold text-stone-900 mb-1">
                    {customerSatisfaction.isLoading
                      ? <div className="animate-pulse bg-stone-200 h-8 w-12 rounded"></div>
                      : customerSatisfaction.isError
                      ? <AlertCircle className="w-8 h-8 text-red-500" />
                      : `${customerSatisfaction.data?.avg_rating?.toFixed(1) || '0.0'}/5`}
                  </div>
                  <div className="text-xs text-stone-500">
                    {customerSatisfaction.data?.satisfaction_rate || 0}% Satisfied
                  </div>
                </div>
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Star className="w-8 h-8 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Customer Segments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="bg-gradient-to-r from-stone-50 to-stone-100 p-4 border-b border-stone-200">
                <h4 className="font-semibold text-stone-900">กลุ่มลูกค้า • Customer Segments</h4>
                <p className="text-sm text-stone-500">แบ่งตามความถี่และมูลค่าการจอง</p>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  {customerSegments.isError ? (
                    <div className="text-center py-4 text-stone-500">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">ไม่สามารถโหลดข้อมูลได้</p>
                    </div>
                  ) : customerSegments.isLoading ? (
                    Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg animate-pulse">
                        <div className="w-20 h-4 bg-stone-200 rounded"></div>
                        <div className="w-12 h-4 bg-stone-200 rounded"></div>
                        <div className="w-16 h-4 bg-stone-200 rounded"></div>
                      </div>
                    ))
                  ) : (
                    (customerSegments.data || []).map((segment: any, index) => {
                      const colors = ['bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500']
                      const bgColors = ['bg-purple-50', 'bg-blue-50', 'bg-green-50', 'bg-yellow-50']

                      // Define segment criteria tooltips
                      const segmentCriteria = {
                        'VIP Customers': 'เกณฑ์: จอง ≥10 ครั้ง หรือ ใช้จ่าย ≥10,000 บาท | Criteria: ≥10 bookings OR ≥10,000 THB spending',
                        'Loyal Customers': 'เกณฑ์: จอง ≥5 ครั้ง หรือ ใช้จ่าย ≥5,000 บาท | Criteria: ≥5 bookings OR ≥5,000 THB spending',
                        'Regular Customers': 'เกณฑ์: จอง ≥2 ครั้ง | Criteria: ≥2 bookings',
                        'New Customers': 'เกณฑ์: จอง 1 ครั้ง | Criteria: 1 booking only'
                      }

                      return (
                        <div key={segment.segment_name} className={`${bgColors[index % bgColors.length]} rounded-lg p-3 border border-stone-200`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${colors[index % colors.length]}`}></div>
                              <Tooltip content={segmentCriteria[segment.segment_name as keyof typeof segmentCriteria] || 'ไม่มีข้อมูลเกณฑ์'}>
                                <span className="font-medium text-stone-900 cursor-help flex items-center gap-1">
                                  {segment.segment_name}
                                  <Info className="w-4 h-4 text-stone-400 hover:text-amber-600" />
                                </span>
                              </Tooltip>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-stone-900">{segment.customer_count || 0} คน</div>
                              <div className="text-xs text-stone-500">{segment.percentage_of_total || 0}%</div>
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-stone-600">
                            Avg: ฿{segment.avg_booking_value?.toLocaleString() || '0'} •
                            Total: ฿{segment.total_revenue?.toLocaleString() || '0'}
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="bg-gradient-to-r from-stone-50 to-stone-100 p-4 border-b border-stone-200">
                <h4 className="font-semibold text-stone-900">ข้อมูลเชิงลึก • Insights</h4>
                <p className="text-sm text-stone-500">การวิเคราะห์แนวโน้มลูกค้า</p>
              </div>
              <div className="p-4 space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Repeat className="w-5 h-5 text-purple-700" />
                    <span className="font-medium text-purple-800">Repeat Booking Analysis</span>
                  </div>
                  <p className="text-sm text-purple-700">
                    {customerBehavior.data?.repeat_booking_rate && customerBehavior.data.repeat_booking_rate > 30
                      ? `อัตราการจองซ้ำสูง ${customerBehavior.data.repeat_booking_rate}% แสดงถึงความพึงพอใจของลูกค้า`
                      : customerBehavior.data?.repeat_booking_rate
                      ? `อัตราการจองซ้ำ ${customerBehavior.data.repeat_booking_rate}% อาจต้องปรับปรุงการบริการ`
                      : 'ไม่มีข้อมูลเพียงพอสำหรับการวิเคราะห์'}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-5 h-5 text-green-700" />
                    <span className="font-medium text-green-800">Customer Loyalty</span>
                  </div>
                  <p className="text-sm text-green-700">
                    {customerBehavior.data?.avg_time_between_bookings && customerBehavior.data.avg_time_between_bookings > 0
                      ? `ลูกค้าจองซ้ำโดยเฉลี่ยทุก ${customerBehavior.data.avg_time_between_bookings.toFixed(0)} วัน`
                      : 'ยังไม่มีข้อมูลการจองซ้ำเพียงพอ'}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-5 h-5 text-yellow-700" />
                    <span className="font-medium text-yellow-800">Service Quality</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    {customerSatisfaction.data?.satisfaction_rate && customerSatisfaction.data.satisfaction_rate > 80
                      ? `คะแนนความพึงพอใจสูง ${customerSatisfaction.data.satisfaction_rate}% จาก ${customerSatisfaction.data.total_reviews} รีวิว`
                      : `ควรปรับปรุงคุณภาพการบริการ (${customerSatisfaction.data?.satisfaction_rate || 0}% ความพึงพอใจ)`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Additional insights section */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 p-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-4">ข้อมูลเชิงลึกธุรกิจ • Business Insights</h3>
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

      {/* Business Insights Analyzer */}
      <BusinessInsightsAnalyzer selectedPeriod={selectedPeriod} />
    </div>
  )
}

export default OverviewSection