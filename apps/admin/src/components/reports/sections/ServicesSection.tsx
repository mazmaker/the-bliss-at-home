import { useState, useRef, useEffect } from 'react'
import {
  TrendingUp,
  Award,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Download,
  FileText,
  Table,
  ChevronDown,
  Info,
  Wrench
} from 'lucide-react'
import { useReportsData } from '../../../hooks/useAnalytics'
import { quickExportPDF, quickExportExcel } from '../../../lib/exportUtils'

interface ServicesSectionProps {
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

function ServicesSection({ selectedPeriod }: ServicesSectionProps) {
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
    categories,
    topServices,
    isLoading,
    isError,
    error,
    states,
    refetch
  } = useReportsData(selectedPeriod)

  // Export handlers
  const handleExportPDF = async () => {
    if ((!categories || categories.length === 0) && (!topServices || topServices.length === 0)) {
      alert('No services data available for export. • ไม่มีข้อมูลบริการสำหรับส่งออก')
      return
    }

    setIsExporting(true)
    try {
      await quickExportPDF(dashboardStats, categories || [], topServices || [], [], selectedPeriod, null, null, null)
    } catch (error) {
      console.error('Export PDF failed:', error)
      alert('Failed to export PDF file. Please try again. • ไม่สามารถส่งออกไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsExporting(false)
      setShowExportDropdown(false)
    }
  }

  const handleExportExcel = async () => {
    if ((!categories || categories.length === 0) && (!topServices || topServices.length === 0)) {
      alert('No services data available for export. • ไม่มีข้อมูลบริการสำหรับส่งออก')
      return
    }

    setIsExporting(true)
    try {
      await quickExportExcel(dashboardStats, categories || [], topServices || [], [], selectedPeriod, null, null, null)
    } catch (error) {
      console.error('Export Excel failed:', error)
      alert('Failed to export Excel file. Please try again. • ไม่สามารถส่งออกไฟล์ Excel ได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsExporting(false)
      setShowExportDropdown(false)
    }
  }

  // Calculate service summary stats
  const serviceStats = {
    totalServices: topServices?.length || 0,
    topService: topServices?.[0]?.name || '',
    totalRevenue: topServices?.reduce((sum, service) => sum + service.revenue, 0) || 0,
    totalBookings: topServices?.reduce((sum, service) => sum + service.bookings, 0) || 0
  }

  // Show error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-stone-100">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-stone-900 mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูลบริการ</h2>
            <p className="text-stone-500 mb-6">
              {error?.message || 'ไม่สามารถโหลดข้อมูลบริการได้ กรุณาลองใหม่อีกครั้ง'}
            </p>
            <button
              onClick={() => {
                refetch.topServices()
                refetch.categories()
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-700 to-pink-800 text-white rounded-xl font-medium hover:from-pink-800 hover:to-pink-900 transition"
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
            🛎️ บริการและประเภท
            <Tooltip content="การวิเคราะห์บริการยอดนิยมและการกระจายตามประเภท | Popular services and category distribution analysis">
              <Info className="w-5 h-5 text-stone-400 hover:text-amber-600 cursor-help" />
            </Tooltip>
          </h2>
          <p className="text-stone-500 mt-1">Services & Categories • การวิเคราะห์บริการและประเภท</p>
        </div>

        {/* Export Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            disabled={isExporting || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-600 to-pink-700 text-white rounded-xl font-medium hover:from-pink-700 hover:to-pink-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Download className="w-5 h-5" />
            {isExporting ? 'กำลังส่งออก...' : 'ส่งออกบริการ'}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showExportDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-10">
              <div className="px-4 py-2 bg-stone-50 border-b border-stone-200">
                <p className="text-xs font-medium text-stone-600">Export Services Data • ส่งออกข้อมูลบริการ</p>
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

      {/* Service Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Services */}
        <div className="bg-gradient-to-br from-[#d29b25] to-[#c08a20] rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-90">บริการยอดนิยม • Top Services</p>
              <p className="text-3xl font-bold mt-3 mb-2">
                {states.topServices.isLoading
                  ? <div className="animate-pulse bg-white bg-opacity-20 h-8 w-12 rounded"></div>
                  : serviceStats.totalServices}
              </p>
              <p className="text-sm opacity-90">บริการ</p>
            </div>
            <Wrench className="w-12 h-12 opacity-80" />
          </div>
        </div>

        {/* Best Service */}
        <div className="bg-gradient-to-br from-[#ffe79d] to-[#ffd773] rounded-2xl shadow-lg p-6 text-stone-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-70">บริการอันดับ 1 • #1 Service</p>
              <p className="text-lg font-bold mt-3 mb-2 truncate">
                {states.topServices.isLoading
                  ? <div className="animate-pulse bg-stone-600 bg-opacity-20 h-6 w-20 rounded"></div>
                  : serviceStats.topService || 'N/A'}
              </p>
              <p className="text-sm opacity-70">ยอดนิยมสุด</p>
            </div>
            <Award className="w-12 h-12 text-stone-700 opacity-80" />
          </div>
        </div>

        {/* Service Revenue */}
        <div className="bg-gradient-to-br from-[#b6d387] to-[#9bc470] rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-90">รายได้บริการ • Service Revenue</p>
              <p className="text-3xl font-bold mt-3 mb-2">
                {states.topServices.isLoading
                  ? <div className="animate-pulse bg-white bg-opacity-20 h-8 w-24 rounded"></div>
                  : `฿${serviceStats.totalRevenue.toLocaleString()}`}
              </p>
              <p className="text-sm opacity-90">รวมบริการยอดนิยม</p>
            </div>
            <TrendingUp className="w-12 h-12 opacity-80" />
          </div>
        </div>

        {/* Service Bookings */}
        <div className="bg-gradient-to-br from-[#d29b25] to-[#b8841f] rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-90">การจองบริการ • Service Bookings</p>
              <p className="text-3xl font-bold mt-3 mb-2">
                {states.topServices.isLoading
                  ? <div className="animate-pulse bg-white bg-opacity-20 h-8 w-16 rounded"></div>
                  : serviceStats.totalBookings.toLocaleString()}
              </p>
              <p className="text-sm opacity-90">การจองทั้งหมด</p>
            </div>
            <BarChart3 className="w-12 h-12 opacity-80" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Services Table */}
        <div className="bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden">
          <div className="bg-gradient-to-r from-stone-50 to-stone-100 p-6 border-b border-stone-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-pink-600 to-pink-700 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Tooltip content="Top performing services ranked by revenue and booking volume | บริการที่มีประสิทธิภาพสูงสุดจัดอันดับตามรายได้และปริมาณการจอง">
                    <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2 cursor-help">
                      บริการยอดนิยม • Top Services
                      <Info className="w-4 h-4 text-stone-400" />
                    </h3>
                  </Tooltip>
                  <p className="text-sm text-stone-500">Performance ranking by revenue • การจัดอันดับประสิทธิภาพตามรายได้</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-200">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-stone-700">Rank</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-stone-700">Service</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-stone-700">Revenue</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-stone-700">Bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {states.topServices.isError ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-stone-500">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm mb-2">Unable to load top services data</p>
                        <button
                          onClick={() => refetch.topServices()}
                          className="text-pink-600 hover:text-pink-700 text-sm inline-flex items-center gap-1"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Retry
                        </button>
                      </td>
                    </tr>
                  ) : states.topServices.isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-stone-100">
                        <td className="py-3 px-2"><div className="w-6 h-6 bg-stone-200 rounded-full animate-pulse"></div></td>
                        <td className="py-3 px-2"><div className="w-24 h-4 bg-stone-200 rounded animate-pulse"></div></td>
                        <td className="py-3 px-2"><div className="w-16 h-4 bg-stone-200 rounded animate-pulse"></div></td>
                        <td className="py-3 px-2"><div className="w-12 h-4 bg-stone-200 rounded animate-pulse"></div></td>
                      </tr>
                    ))
                  ) : (
                    (topServices || []).map((item) => (
                      <tr key={item.rank} className="border-b border-stone-100 hover:bg-stone-50 transition-colors">
                        <td className="py-3 px-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                            item.rank === 1 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                            item.rank === 2 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                            item.rank === 3 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
                            'bg-gradient-to-r from-stone-400 to-stone-500'
                          }`}>
                            {item.rank}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="font-medium text-stone-900 text-sm">{item.name}</div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="text-sm font-semibold text-pink-700">฿{item.revenue.toLocaleString()}</div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="text-sm text-stone-600 font-medium">{item.bookings}</div>
                        </td>
                      </tr>
                    ))
                  )}
                  {!isLoading && (!topServices || topServices.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-stone-500">
                        <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm mb-1">No service data available</p>
                        <p className="text-xs text-stone-400">ไม่มีข้อมูลบริการในช่วงเวลานี้</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden">
          <div className="bg-gradient-to-r from-stone-50 to-stone-100 p-6 border-b border-stone-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Tooltip content="Service category distribution showing booking patterns | การกระจายของหมวดบริการแสดงรูปแบบการจอง">
                    <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2 cursor-help">
                      การจองตามหมวดหมู่ • Category Distribution
                      <Info className="w-4 h-4 text-stone-400" />
                    </h3>
                  </Tooltip>
                  <p className="text-sm text-stone-500">Booking patterns by category • รูปแบบการจองตามหมวดหมู่</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {states.categories.isError ? (
                <div className="text-center py-8 text-stone-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm mb-2">Unable to load category data</p>
                  <button
                    onClick={() => refetch.categories()}
                    className="text-blue-600 hover:text-blue-700 text-sm inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                </div>
              ) : states.categories.isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-20 h-4 bg-stone-200 rounded animate-pulse"></div>
                      <div className="w-16 h-4 bg-stone-200 rounded animate-pulse"></div>
                    </div>
                    <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-stone-300 rounded-full animate-pulse" style={{ width: `${30 + Math.random() * 50}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                (categories || []).map((item, index) => {
                  const colors = ['bg-pink-500', 'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500']
                  const color = colors[index] || 'bg-stone-500'
                  return (
                    <div key={item.category} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-stone-700">{item.category}</span>
                        <span className="text-sm text-stone-500 font-medium">
                          {item.count} bookings • {item.percentage}%
                        </span>
                      </div>
                      <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${color} rounded-full transition-all duration-500 group-hover:opacity-80`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })
              )}
              {!isLoading && (!categories || categories.length === 0) && (
                <div className="text-center py-8 text-stone-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm mb-1">No booking data available</p>
                  <p className="text-xs text-stone-400">ไม่มีข้อมูลการจองในช่วงเวลานี้</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Service Insights */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 p-6">
        <h3 className="text-lg font-semibold text-stone-900 mb-4 flex items-center gap-2">
          💡 ข้อมูลเชิงลึกบริการ • Service Insights
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-stone-700">Popular Trends • แนวโน้มยอดนิยม</h4>
            <div className="bg-gradient-to-r from-pink-50 to-pink-100 p-4 rounded-lg border border-pink-200">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-pink-700" />
                <span className="font-medium text-pink-800">Most Popular</span>
              </div>
              <p className="text-sm text-pink-700">
                {serviceStats.topService
                  ? `${serviceStats.topService} is currently the most popular service`
                  : 'Insufficient data for trend analysis'}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-stone-700">Performance Metrics • เมตริกประสิทธิภาพ</h4>
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-700" />
                <span className="font-medium text-blue-800">Service Diversity</span>
              </div>
              <p className="text-sm text-blue-700">
                {serviceStats.totalServices > 0
                  ? `Currently offering ${serviceStats.totalServices} popular services with strong booking performance`
                  : 'No service data available'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServicesSection