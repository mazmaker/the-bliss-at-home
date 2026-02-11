import { useState, useRef, useEffect } from 'react'
import {
  TrendingUp,
  DollarSign,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Download,
  FileText,
  Table,
  ChevronDown,
  Info
} from 'lucide-react'
import { useReportsData } from '../../../hooks/useAnalytics'
import { quickExportPDF, quickExportExcel } from '../../../lib/exportUtils'

interface SalesSectionProps {
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

function SalesSection({ selectedPeriod }: SalesSectionProps) {
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
    dailyRevenue,
    isLoading,
    isError,
    error,
    states,
    refetch
  } = useReportsData(selectedPeriod)

  // Export handlers
  const handleExportPDF = async () => {
    if (!dailyRevenue || dailyRevenue.length === 0) {
      alert('No sales data available for export. • ไม่มีข้อมูลยอดขายสำหรับส่งออก')
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
    if (!dailyRevenue || dailyRevenue.length === 0) {
      alert('No sales data available for export. • ไม่มีข้อมูลยอดขายสำหรับส่งออก')
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
            <h2 className="text-xl font-semibold text-stone-900 mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูลยอดขาย</h2>
            <p className="text-stone-500 mb-6">
              {error?.message || 'ไม่สามารถโหลดข้อมูลยอดขายได้ กรุณาลองใหม่อีกครั้ง'}
            </p>
            <button
              onClick={() => refetch.dailyRevenue()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-700 to-green-800 text-white rounded-xl font-medium hover:from-green-800 hover:to-green-900 transition"
            >
              <RefreshCw className="w-5 h-5" />
              ลองใหม่
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Section Header with Export */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
            💰 ยอดขายและการเงิน
            <Tooltip content="แนวโน้มรายได้และการวิเคราะห์ทางการเงิน | Revenue trends and financial analytics">
              <Info className="w-5 h-5 text-stone-400 hover:text-amber-600 cursor-help" />
            </Tooltip>
          </h2>
          <p className="text-stone-500 mt-1">Sales & Financial Analytics • แนวโน้มรายได้และประสิทธิภาพทางการเงิน</p>
        </div>

        {/* Export Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            disabled={isExporting || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:from-green-700 hover:to-green-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Download className="w-5 h-5" />
            {isExporting ? 'กำลังส่งออก...' : 'ส่งออกยอดขาย'}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showExportDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-10">
              <div className="px-4 py-2 bg-stone-50 border-b border-stone-200">
                <p className="text-xs font-medium text-stone-600">Export Sales Data • ส่งออกข้อมูลยอดขาย</p>
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

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-[#b6d387] to-[#9bc470] rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-90">รายได้รวม • Total Revenue</p>
              <p className="text-3xl font-bold mt-3 mb-2">
                {states.dashboardStats.isLoading
                  ? <div className="animate-pulse bg-white bg-opacity-20 h-8 w-24 rounded"></div>
                  : `฿${(dashboardStats?.totalRevenue || 0).toLocaleString()}`}
              </p>
              <p className="text-sm opacity-90">ในช่วงเวลาที่เลือก</p>
            </div>
            <DollarSign className="w-12 h-12 opacity-80" />
          </div>
        </div>

        {/* Average Daily Revenue */}
        <div className="bg-gradient-to-br from-[#d29b25] to-[#c08a20] rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-90">รายได้เฉลี่ย • Avg Daily</p>
              <p className="text-3xl font-bold mt-3 mb-2">
                {states.dashboardStats.isLoading
                  ? <div className="animate-pulse bg-white bg-opacity-20 h-8 w-24 rounded"></div>
                  : `฿${((dashboardStats?.totalRevenue || 0) / (dailyRevenue?.length || 1)).toLocaleString()}`}
              </p>
              <p className="text-sm opacity-90">ต่อวัน</p>
            </div>
            <BarChart3 className="w-12 h-12 opacity-80" />
          </div>
        </div>

        {/* Revenue Growth */}
        <div className="bg-gradient-to-br from-[#ffe79d] to-[#ffd773] rounded-2xl shadow-lg p-6 text-stone-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-70">การเติบโต • Growth</p>
              <p className="text-3xl font-bold mt-3 mb-2">
                {states.dashboardStats.isLoading
                  ? <div className="animate-pulse bg-stone-600 bg-opacity-20 h-8 w-16 rounded"></div>
                  : `${(dashboardStats?.revenueGrowth || 0) > 0 ? '+' : ''}${(dashboardStats?.revenueGrowth || 0).toFixed(1)}%`}
              </p>
              <p className="text-sm opacity-70">เมื่อเทียบช่วงก่อน</p>
            </div>
            <TrendingUp className="w-12 h-12 text-stone-700 opacity-80" />
          </div>
        </div>
      </div>

      {/* Daily Revenue Chart */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden">
        <div className="bg-gradient-to-r from-stone-50 to-stone-100 p-6 border-b border-stone-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-green-700 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <Tooltip content="Daily revenue trends showing business performance over time | แนวโน้มรายได้รายวันแสดงประสิทธิภาพทางธุรกิจตลอดเวลา">
                  <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2 cursor-help">
                    รายได้รายวัน • Daily Revenue Trends
                    <Info className="w-4 h-4 text-stone-400" />
                  </h3>
                </Tooltip>
                <p className="text-sm text-stone-500">Financial performance tracking • ติดตามประสิทธิภาพทางการเงิน</p>
              </div>
            </div>
            <div className="text-sm text-stone-500">
              Last {dailyRevenue?.length || 7} days
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="h-64 flex items-end justify-between gap-2">
            {states.dailyRevenue.isError ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-stone-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm mb-2">Unable to load revenue data</p>
                  <p className="text-xs text-stone-400 mb-3">ไม่สามารถโหลดข้อมูลรายได้ได้</p>
                  <button
                    onClick={() => refetch.dailyRevenue()}
                    className="text-green-600 hover:text-green-700 text-sm inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry • ลองใหม่
                  </button>
                </div>
              </div>
            ) : states.dailyRevenue.isLoading ? (
              Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-stone-200 rounded-t-lg animate-pulse" style={{ height: `${20 + Math.random() * 60}%` }} />
                  <div className="w-6 h-3 bg-stone-200 rounded animate-pulse"></div>
                </div>
              ))
            ) : (
              (dailyRevenue || []).slice(-7).map((item, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2 group relative">
                  <div
                    className="w-full bg-gradient-to-t from-green-700 to-green-600 rounded-t-lg transition-all hover:from-green-800 hover:to-green-700 cursor-pointer"
                    style={{ height: `${Math.max(item.value || 0, 5)}%` }}
                  />
                  <span className="text-xs text-stone-500 font-medium">{item.day}</span>
                  <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-stone-800 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-10">
                    <div className="text-center">
                      <div className="font-semibold">฿{item.revenue?.toLocaleString() || 0}</div>
                      <div className="text-stone-300 text-xs">{item.bookings || 0} bookings</div>
                    </div>
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-r from-green-700 to-green-600 rounded"></div>
              <span className="text-stone-600">รายได้ • Revenue (฿)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Insights */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 p-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
          📈 การวิเคราะห์ทางการเงิน • Financial Analysis
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-stone-700">Revenue Performance • ประสิทธิภาพรายได้</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="text-green-800 font-medium">Peak Day</span>
                <span className="text-green-900 font-bold">
                  {dailyRevenue && dailyRevenue.length > 0
                    ? `฿${Math.max(...dailyRevenue.map(d => d.revenue || 0)).toLocaleString()}`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                <span className="text-red-800 font-medium">Lowest Day</span>
                <span className="text-red-900 font-bold">
                  {dailyRevenue && dailyRevenue.length > 0
                    ? `฿${Math.min(...dailyRevenue.map(d => d.revenue || 0)).toLocaleString()}`
                    : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-blue-800 font-medium">Consistency</span>
                <span className="text-blue-900 font-bold">
                  {dailyRevenue && dailyRevenue.length > 0
                    ? `${(((dailyRevenue.filter(d => d.revenue && d.revenue > 0).length / dailyRevenue.length) * 100).toFixed(0))}%`
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-stone-700">Revenue Trends • แนวโน้มรายได้</h4>
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-amber-700" />
                  <span className="font-medium text-amber-800">Growth Trend</span>
                </div>
                <p className="text-sm text-amber-700">
                  {dashboardStats?.revenueGrowth && dashboardStats.revenueGrowth > 0
                    ? `Revenue is trending upward by ${dashboardStats.revenueGrowth.toFixed(1)}%`
                    : dashboardStats?.revenueGrowth && dashboardStats.revenueGrowth < 0
                    ? `Revenue declined by ${Math.abs(dashboardStats.revenueGrowth).toFixed(1)}%`
                    : 'Insufficient data for trend analysis'}
                </p>
              </div>
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-5 h-5 text-blue-700" />
                  <span className="font-medium text-blue-800">Forecast</span>
                </div>
                <p className="text-sm text-blue-700">
                  Based on current trends, next period revenue projection varies depending on market conditions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SalesSection