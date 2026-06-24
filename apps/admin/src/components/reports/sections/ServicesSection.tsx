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
  Wrench,
  MapPin,
  Calendar,
  DollarSign
} from 'lucide-react'
import {
  useReportsData,
  useGeographicalAnalytics,
  useServiceRevenueByCategory,
  useMonthlyServiceTrends
} from '../../../hooks/useAnalytics'
import { quickExportPDF, quickExportExcel } from '../../../lib/exportUtils'

interface ServicesSectionProps {
  selectedPeriod: 'daily' | 'weekly' | 'month' | '3_months' | '6_months' | 'year'
}

// Tooltip Component for better explanations
const Tooltip = ({ content, children }: { content: string, children: React.ReactNode }) => {
  const [show, setShow] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPos({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      })
    }
    setShow(true)
  }

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className="fixed z-[9999] px-3 py-2 bg-bliss-800 text-white text-xs rounded-lg pointer-events-none max-w-xs text-center"
          style={{
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-bliss-800"></div>
        </div>
      )}
    </div>
  )
}

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

  // Convert selectedPeriod to days
  const periodDays = {
    daily: 1,
    weekly: 7,
    month: 30,
    '3_months': 90,
    '6_months': 180,
    year: 365
  }

  const days = periodDays[selectedPeriod]

  // New enhanced analytics
  const geographicalData = useGeographicalAnalytics(days, 8)
  const serviceRevenueData = useServiceRevenueByCategory(days)
  const monthlyTrendsData = useMonthlyServiceTrends(6)

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
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-bliss-100">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-bliss-900 mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูลบริการ</h2>
            <p className="text-bliss-500 mb-6">
              {error?.message || 'ไม่สามารถโหลดข้อมูลบริการได้ กรุณาลองใหม่อีกครั้ง'}
            </p>
            <button
              onClick={() => {
                refetch.topServices()
                refetch.categories()
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-bliss-600 to-bliss-700 text-white rounded-xl font-medium hover:from-bliss-700 hover:to-bliss-800 transition"
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
          <h2 className="text-2xl font-bold text-bliss-900 flex items-center gap-2">
            🛎️ บริการและประเภท
            <Tooltip content="การวิเคราะห์บริการยอดนิยมและการกระจายตามประเภท | Popular services and category distribution analysis">
              <Info className="w-5 h-5 text-bliss-400 hover:text-bliss-600 cursor-help" />
            </Tooltip>
          </h2>
          <p className="text-bliss-500 mt-1">Services & Categories • การวิเคราะห์บริการและประเภท</p>
        </div>

        {/* Export Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            disabled={isExporting || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-bliss-600 to-bliss-700 text-white rounded-xl font-medium hover:from-bliss-700 hover:to-bliss-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Download className="w-5 h-5" />
            {isExporting ? 'กำลังส่งออก...' : 'ส่งออกบริการ'}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showExportDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-bliss-200 py-2 z-50">
              <div className="px-4 py-2 bg-bliss-50 border-b border-bliss-200">
                <p className="text-xs font-medium text-bliss-600">Export Services Data • ส่งออกข้อมูลบริการ</p>
              </div>
              <button
                onClick={handleExportPDF}
                disabled={isExporting || isLoading}
                className="w-full text-left px-4 py-3 hover:bg-bliss-50 flex items-center gap-3 text-bliss-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <div className="font-medium text-sm">Export as PDF</div>
                  <div className="text-xs text-bliss-500">ส่งออกเป็นไฟล์ PDF</div>
                </div>
              </button>
              <button
                onClick={handleExportExcel}
                disabled={isExporting || isLoading}
                className="w-full text-left px-4 py-3 hover:bg-bliss-50 flex items-center gap-3 text-bliss-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Table className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-sm">Export as Excel</div>
                  <div className="text-xs text-bliss-500">ส่งออกเป็นไฟล์ Excel</div>
                </div>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Service Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Services */}
        <div className="bg-gradient-to-br from-bliss-600 to-bliss-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-90">บริการยอดนิยม • Top Services</p>
              <p className="text-3xl font-bold mt-3 mb-2">
                {states.topServices.isLoading
                  ? <span className="block animate-pulse bg-white bg-opacity-20 h-8 w-12 rounded"></span>
                  : serviceStats.totalServices}
              </p>
              <p className="text-sm opacity-90">บริการ</p>
            </div>
            <Wrench className="w-12 h-12 opacity-80" />
          </div>
        </div>

        {/* Best Service */}
        <div className="bg-gradient-to-br from-bliss-500 to-bliss-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-70">บริการอันดับ 1 • #1 Service</p>
              <p className="text-lg font-bold mt-3 mb-2 truncate">
                {states.topServices.isLoading
                  ? <span className="block animate-pulse bg-bliss-600 bg-opacity-20 h-6 w-20 rounded"></span>
                  : serviceStats.topService || 'N/A'}
              </p>
              <p className="text-sm opacity-70">ยอดนิยมสุด</p>
            </div>
            <Award className="w-12 h-12 text-white opacity-80" />
          </div>
        </div>

        {/* Service Revenue */}
        <div className="bg-gradient-to-br from-bliss-600 to-bliss-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-90">รายได้บริการ • Service Revenue</p>
              <p className="text-3xl font-bold mt-3 mb-2">
                {states.topServices.isLoading
                  ? <span className="block animate-pulse bg-white bg-opacity-20 h-8 w-24 rounded"></span>
                  : `฿${serviceStats.totalRevenue.toLocaleString()}`}
              </p>
              <p className="text-sm opacity-90">รวมบริการยอดนิยม</p>
            </div>
            <TrendingUp className="w-12 h-12 opacity-80" />
          </div>
        </div>

        {/* Service Bookings */}
        <div className="bg-gradient-to-br from-bliss-500 to-bliss-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-90">การจองบริการ • Service Bookings</p>
              <p className="text-3xl font-bold mt-3 mb-2">
                {states.topServices.isLoading
                  ? <span className="block animate-pulse bg-white bg-opacity-20 h-8 w-16 rounded"></span>
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
        <div className="bg-white rounded-2xl shadow-lg border border-bliss-100 overflow-hidden">
          <div className="bg-gradient-to-r from-bliss-50 to-bliss-100 p-6 border-b border-bliss-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-bliss-600 to-bliss-700 rounded-lg flex items-center justify-center">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Tooltip content="Top performing services ranked by revenue and booking volume | บริการที่มีประสิทธิภาพสูงสุดจัดอันดับตามรายได้และปริมาณการจอง">
                    <h3 className="text-lg font-semibold text-bliss-900 flex items-center gap-2 cursor-help">
                      บริการยอดนิยม • Top Services
                      <Info className="w-4 h-4 text-bliss-400" />
                    </h3>
                  </Tooltip>
                  <p className="text-sm text-bliss-500">Performance ranking by revenue • การจัดอันดับประสิทธิภาพตามรายได้</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-bliss-200">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-bliss-700">Rank</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-bliss-700">Service</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-bliss-700">Revenue</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-bliss-700">Bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {states.topServices.isError ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-bliss-500">
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
                      <tr key={index} className="border-b border-bliss-100">
                        <td className="py-3 px-2"><div className="w-6 h-6 bg-bliss-200 rounded-full animate-pulse"></div></td>
                        <td className="py-3 px-2"><div className="w-24 h-4 bg-bliss-200 rounded animate-pulse"></div></td>
                        <td className="py-3 px-2"><div className="w-16 h-4 bg-bliss-200 rounded animate-pulse"></div></td>
                        <td className="py-3 px-2"><div className="w-12 h-4 bg-bliss-200 rounded animate-pulse"></div></td>
                      </tr>
                    ))
                  ) : (
                    (topServices || []).map((item) => (
                      <tr key={item.rank} className="border-b border-bliss-100 hover:bg-bliss-50 transition-colors">
                        <td className="py-3 px-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ${
                            item.rank === 1 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                            item.rank === 2 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                            item.rank === 3 ? 'bg-gradient-to-r from-bliss-600 to-bliss-700' :
                            'bg-gradient-to-r from-bliss-400 to-bliss-500'
                          }`}>
                            {item.rank}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="font-medium text-bliss-900 text-sm">{item.name}</div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="text-sm font-semibold text-pink-700">฿{item.revenue.toLocaleString()}</div>
                        </td>
                        <td className="py-3 px-2">
                          <div className="text-sm text-bliss-600 font-medium">{item.bookings}</div>
                        </td>
                      </tr>
                    ))
                  )}
                  {!isLoading && (!topServices || topServices.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-bliss-500">
                        <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm mb-1">No service data available</p>
                        <p className="text-xs text-bliss-400">ไม่มีข้อมูลบริการในช่วงเวลานี้</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-2xl shadow-lg border border-bliss-100 overflow-hidden">
          <div className="bg-gradient-to-r from-bliss-50 to-bliss-100 p-6 border-b border-bliss-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Tooltip content="Service category distribution showing booking patterns | การกระจายของหมวดบริการแสดงรูปแบบการจอง">
                    <h3 className="text-lg font-semibold text-bliss-900 flex items-center gap-2 cursor-help">
                      การจองตามหมวดหมู่ • Category Distribution
                      <Info className="w-4 h-4 text-bliss-400" />
                    </h3>
                  </Tooltip>
                  <p className="text-sm text-bliss-500">Booking patterns by category • รูปแบบการจองตามหมวดหมู่</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {states.categories.isError ? (
                <div className="text-center py-8 text-bliss-500">
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
                      <div className="w-20 h-4 bg-bliss-200 rounded animate-pulse"></div>
                      <div className="w-16 h-4 bg-bliss-200 rounded animate-pulse"></div>
                    </div>
                    <div className="h-3 bg-bliss-100 rounded-full overflow-hidden">
                      <div className="h-full bg-bliss-300 rounded-full animate-pulse" style={{ width: `${30 + Math.random() * 50}%` }} />
                    </div>
                  </div>
                ))
              ) : (
                (categories || []).map((item, index) => {
                  const colors = ['bg-pink-500', 'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-bliss-500']
                  const color = colors[index] || 'bg-bliss-500'
                  return (
                    <div key={item.category} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-bliss-700">{item.category}</span>
                        <span className="text-sm text-bliss-500 font-medium">
                          {item.count} bookings • {item.percentage}%
                        </span>
                      </div>
                      <div className="h-3 bg-bliss-100 rounded-full overflow-hidden">
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
                <div className="text-center py-8 text-bliss-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm mb-1">No booking data available</p>
                  <p className="text-xs text-bliss-400">ไม่มีข้อมูลการจองในช่วงเวลานี้</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Service Revenue by Category */}
      <div className="bg-white rounded-2xl shadow-lg border border-bliss-100 overflow-hidden">
        <div className="bg-gradient-to-r from-bliss-50 to-bliss-100 p-6 border-b border-bliss-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <Tooltip content="Revenue breakdown by service categories showing performance and growth | การแบ่งรายได้ตามหมวดบริการแสดงประสิทธิภาพและการเติบโต">
                <h3 className="text-lg font-semibold text-bliss-900 flex items-center gap-2 cursor-help">
                  รายได้ตามประเภทบริการ • Revenue by Service Type
                  <Info className="w-4 h-4 text-bliss-400" />
                </h3>
              </Tooltip>
              <p className="text-sm text-bliss-500">Performance and growth by category • ประสิทธิภาพและการเติบโตตามหมวดหมู่</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {serviceRevenueData.isError ? (
              <div className="col-span-2 text-center py-8 text-bliss-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm mb-2">Unable to load revenue data</p>
                <button
                  onClick={() => serviceRevenueData.refetch()}
                  className="text-emerald-600 hover:text-emerald-700 text-sm inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </button>
              </div>
            ) : serviceRevenueData.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="bg-bliss-50 rounded-xl p-4 animate-pulse">
                  <div className="w-24 h-4 bg-bliss-200 rounded mb-3"></div>
                  <div className="w-16 h-6 bg-bliss-200 rounded mb-2"></div>
                  <div className="w-20 h-3 bg-bliss-200 rounded"></div>
                </div>
              ))
            ) : (
              (serviceRevenueData.data || []).map((item: any, index) => {
                const colors = [
                  'border-emerald-200 bg-emerald-50 text-emerald-700',
                  'border-blue-200 bg-blue-50 text-blue-700',
                  'border-purple-200 bg-purple-50 text-purple-700',
                  'border-bliss-200 bg-bliss-50 text-bliss-700',
                  'border-pink-200 bg-pink-50 text-pink-700'
                ]
                const colorClass = colors[index % colors.length]

                return (
                  <div key={item.category} className={`rounded-xl p-4 border ${colorClass}`}>
                    <h4 className="font-semibold mb-1">{item.category_th}</h4>
                    <p className="text-2xl font-bold">฿{item.total_revenue?.toLocaleString() || '0'}</p>
                    <div className="flex items-center justify-between mt-2 text-sm">
                      <span>{item.total_bookings || 0} การจอง</span>
                      {item.growth_rate != null ? (
                        <span className={`font-medium ${item.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.growth_rate > 0 ? '+' : ''}{item.growth_rate.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="font-medium text-bliss-400">-</span>
                      )}
                    </div>
                    <p className="text-xs mt-1">Top: {item.top_service_name || 'N/A'}</p>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Geographical Breakdown */}
        <div className="bg-white rounded-2xl shadow-lg border border-bliss-100 overflow-hidden">
          <div className="bg-gradient-to-r from-bliss-50 to-bliss-100 p-6 border-b border-bliss-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <Tooltip content="Booking distribution across geographical areas including hotels and districts | การกระจายการจองในพื้นที่ทางภูมิศาสตร์รวมทั้งโรงแรมและเขต">
                  <h3 className="text-lg font-semibold text-bliss-900 flex items-center gap-2 cursor-help">
                    การจองตามพื้นที่ • Bookings by Area
                    <Info className="w-4 h-4 text-bliss-400" />
                  </h3>
                </Tooltip>
                <p className="text-sm text-bliss-500">Regional performance • ประสิทธิภาพตามภูมิภาค</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {geographicalData.isError ? (
                <div className="text-center py-8 text-bliss-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm mb-2">Unable to load geographical data</p>
                  <button
                    onClick={() => geographicalData.refetch()}
                    className="text-cyan-600 hover:text-cyan-700 text-sm inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                </div>
              ) : geographicalData.isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-bliss-50 rounded-lg animate-pulse">
                    <div className="w-24 h-4 bg-bliss-200 rounded"></div>
                    <div className="w-16 h-4 bg-bliss-200 rounded"></div>
                    <div className="w-12 h-4 bg-bliss-200 rounded"></div>
                  </div>
                ))
              ) : (
                (geographicalData.data || []).map((area: any, index) => (
                  <div key={area.area_name} className="group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${area.area_type === 'hotel' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                        <span className="text-sm font-medium text-bliss-700">{area.area_name}</span>
                        <span className="text-xs px-2 py-1 bg-bliss-100 text-bliss-500 rounded-full">
                          {area.area_type === 'hotel' ? 'โรงแรม' : 'เขต'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-bliss-900 font-semibold">
                          ฿{area.total_revenue?.toLocaleString() || '0'}
                        </span>
                        <div className="text-xs text-bliss-500">
                          {area.total_bookings || 0} การจอง • {area.completion_rate?.toFixed(1) || '0'}%
                        </div>
                      </div>
                    </div>
                    <div className="h-2 bg-bliss-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 group-hover:opacity-80 ${
                          area.area_type === 'hotel' ? 'bg-blue-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((area.total_revenue / Math.max(...(geographicalData.data || []).map((a: any) => a.total_revenue))) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Monthly Service Trends */}
        <div className="bg-white rounded-2xl shadow-lg border border-bliss-100 overflow-hidden">
          <div className="bg-gradient-to-r from-bliss-50 to-bliss-100 p-6 border-b border-bliss-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <div>
                <Tooltip content="Monthly trending of most popular services showing seasonal patterns | แนวโน้มรายเดือนของบริการยอดนิยมแสดงรูปแบบตามฤดูกาล">
                  <h3 className="text-lg font-semibold text-bliss-900 flex items-center gap-2 cursor-help">
                    แนวโน้มบริการรายเดือน • Monthly Service Trends
                    <Info className="w-4 h-4 text-bliss-400" />
                  </h3>
                </Tooltip>
                <p className="text-sm text-bliss-500">Seasonal patterns • รูปแบบตามฤดูกาล</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {monthlyTrendsData.isError ? (
                <div className="text-center py-8 text-bliss-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm mb-2">Unable to load trends data</p>
                  <button
                    onClick={() => monthlyTrendsData.refetch()}
                    className="text-indigo-600 hover:text-indigo-700 text-sm inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </button>
                </div>
              ) : monthlyTrendsData.isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-bliss-50 rounded-lg animate-pulse">
                    <div className="w-16 h-4 bg-bliss-200 rounded"></div>
                    <div className="w-24 h-4 bg-bliss-200 rounded"></div>
                    <div className="w-8 h-4 bg-bliss-200 rounded"></div>
                  </div>
                ))
              ) : (
                (() => {
                  // Group by month for better display
                  const groupedTrends = (monthlyTrendsData.data || []).reduce((acc: any, item: any) => {
                    if (!acc[item.month_year]) {
                      acc[item.month_year] = []
                    }
                    acc[item.month_year].push(item)
                    return acc
                  }, {})

                  return Object.entries(groupedTrends).slice(0, 3).map(([month, services]: [string, any]) => (
                    <div key={month} className="border border-bliss-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-bliss-900">{month}</h4>
                        <span className="text-xs text-bliss-500">Top {services.length}</span>
                      </div>
                      <div className="space-y-2">
                        {services.slice(0, 3).map((service: any, index: number) => (
                          <div key={service.service_name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                index === 0 ? 'bg-yellow-500' :
                                index === 1 ? 'bg-gray-400' :
                                'bg-bliss-600'
                              }`}>
                                {service.rank_position}
                              </div>
                              <span className="text-bliss-700">{service.service_name}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-medium text-bliss-900">
                                ฿{service.revenue?.toLocaleString() || '0'}
                              </div>
                              <div className="text-xs text-bliss-500">
                                {service.bookings || 0} การจอง
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                })()
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default ServicesSection