import { useState, useRef, useEffect } from 'react'
import {
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
  AlertCircle,
  RefreshCw,
  Download,
  FileText,
  Table,
  ChevronDown,
  Info,
  Building2,
  Award,
  Receipt,
  Clock,
  CheckCircle,
  Calculator,
  AlertTriangle
} from 'lucide-react'
import { useReportsData } from '../../../hooks/useAnalytics'
import { quickExportPDF, quickExportExcel } from '../../../lib/exportUtils'

interface HotelSectionProps {
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
          className="fixed z-[9999] px-3 py-2 bg-stone-800 text-white text-xs rounded-lg pointer-events-none max-w-xs text-center"
          style={{
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
        </div>
      )}
    </div>
  )
}

function HotelSection({ selectedPeriod }: HotelSectionProps) {
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
    hotelPerformance,
    hotelInvoiceSummary,
    isLoading,
    isError,
    error,
    states,
    refetch
  } = useReportsData(selectedPeriod)

  // Export handlers
  const handleExportPDF = async () => {
    if (!hotelPerformance || hotelPerformance.length === 0) {
      alert('No hotel data available for export. • ไม่มีข้อมูลโรงแรมสำหรับส่งออก')
      return
    }

    setIsExporting(true)
    try {
      await quickExportPDF(dashboardStats, [], [], hotelPerformance, selectedPeriod, null, null, null)
    } catch (error) {
      console.error('Export PDF failed:', error)
      alert('Failed to export PDF file. Please try again. • ไม่สามารถส่งออกไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsExporting(false)
      setShowExportDropdown(false)
    }
  }

  const handleExportExcel = async () => {
    if (!hotelPerformance || hotelPerformance.length === 0) {
      alert('No hotel data available for export. • ไม่มีข้อมูลโรงแรมสำหรับส่งออก')
      return
    }

    setIsExporting(true)
    try {
      await quickExportExcel(dashboardStats, [], [], hotelPerformance, selectedPeriod, null, null, null)
    } catch (error) {
      console.error('Export Excel failed:', error)
      alert('Failed to export Excel file. Please try again. • ไม่สามารถส่งออกไฟล์ Excel ได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsExporting(false)
      setShowExportDropdown(false)
    }
  }

  // Calculate hotel summary stats
  const hotelStats = hotelPerformance ? {
    totalHotels: hotelPerformance.length,
    topPerformer: hotelPerformance[0]?.hotel_name || '',
    totalRevenue: hotelPerformance.reduce((sum, hotel) => sum + hotel.total_revenue, 0),
    totalBookings: hotelPerformance.reduce((sum, hotel) => sum + hotel.total_bookings, 0)
  } : null

  // Show error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-stone-100">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-stone-900 mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูลโรงแรม</h2>
            <p className="text-stone-500 mb-6">
              {error?.message || 'ไม่สามารถโหลดข้อมูลโรงแรมได้ กรุณาลองใหม่อีกครั้ง'}
            </p>
            <button
              onClick={() => refetch.hotelPerformance()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-700 to-purple-800 text-white rounded-xl font-medium hover:from-purple-800 hover:to-purple-900 transition"
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
            🏨 ประสิทธิภาพโรงแรม
            <Tooltip content="การวิเคราะห์ผลการดำเนินงานของพาร์ทเนอร์โรงแรม | Hotel partner performance analytics">
              <Info className="w-5 h-5 text-stone-400 hover:text-amber-600 cursor-help" />
            </Tooltip>
          </h2>
          <p className="text-stone-500 mt-1">Hotel Partners Analytics • การวิเคราะห์พาร์ทเนอร์โรงแรม</p>
        </div>

        {/* Export Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            disabled={isExporting || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl font-medium hover:from-purple-700 hover:to-purple-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Download className="w-5 h-5" />
            {isExporting ? 'กำลังส่งออก...' : 'ส่งออกโรงแรม'}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showExportDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-50">
              <div className="px-4 py-2 bg-stone-50 border-b border-stone-200">
                <p className="text-xs font-medium text-stone-600">Export Hotel Data • ส่งออกข้อมูลโรงแรม</p>
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

      {/* Hotel Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Total Partners */}
        <div className="bg-gradient-to-br from-[#d29b25] to-[#c08a20] rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-90">โรงแรมพาร์ทเนอร์ • Hotel Partners</p>
              <div className="text-3xl font-bold mt-3 mb-2">
                {states.hotelPerformance.isLoading
                  ? <div className="animate-pulse bg-white bg-opacity-20 h-8 w-12 rounded"></div>
                  : hotelStats?.totalHotels || 0}
              </div>
              <p className="text-sm opacity-90">ทั้งหมด</p>
            </div>
            <Building2 className="w-12 h-12 opacity-80" />
          </div>
        </div>

        {/* Top Performer */}
        <div className="bg-gradient-to-br from-[#ffe79d] to-[#ffd773] rounded-2xl shadow-lg p-6 text-stone-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-70">โรงแรมอันดับ 1 • Top Hotel</p>
              <div className="text-lg font-bold mt-3 mb-2 truncate">
                {states.hotelPerformance.isLoading
                  ? <div className="animate-pulse bg-stone-600 bg-opacity-20 h-6 w-20 rounded"></div>
                  : hotelStats?.topPerformer || 'N/A'}
              </div>
              <p className="text-sm opacity-70">ประสิทธิภาพสูงสุด</p>
            </div>
            <Award className="w-12 h-12 text-stone-700 opacity-80" />
          </div>
        </div>

        {/* Hotel Revenue */}
        <div className="bg-gradient-to-br from-[#b6d387] to-[#9bc470] rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-90">รายได้จากโรงแรม • Hotel Revenue</p>
              <div className="text-3xl font-bold mt-3 mb-2">
                {states.hotelPerformance.isLoading
                  ? <div className="animate-pulse bg-white bg-opacity-20 h-8 w-24 rounded"></div>
                  : `฿${(hotelStats?.totalRevenue || 0).toLocaleString()}`}
              </div>
              <p className="text-sm opacity-90">รวมทั้งหมด</p>
            </div>
            <DollarSign className="w-12 h-12 opacity-80" />
          </div>
        </div>

      </div>

      {/* Hotel Performance Grid */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden">
        <div className="bg-gradient-to-r from-stone-50 to-stone-100 p-6 border-b border-stone-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <Tooltip content="Comprehensive hotel partner analytics including customer retention, staff metrics, and growth data | การวิเคราะห์พาร์ทเนอร์โรงแรมครบถ้วน รวมถึงการรักษาลูกค้า เมตริกพนักงาน และข้อมูลการเติบโต">
                  <h3 className="text-lg font-semibold text-stone-900 flex items-center gap-2 cursor-help">
                    รายละเอียดโรงแรม • Hotel Performance Details
                    <Info className="w-4 h-4 text-stone-400" />
                  </h3>
                </Tooltip>
                <p className="text-sm text-stone-500">Complete performance analytics • การวิเคราะห์ประสิทธิภาพครบถ้วน</p>
              </div>
            </div>
            <div className="text-sm text-stone-500">
              {hotelPerformance?.length || 0} Hotels
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {states.hotelPerformance.isError ? (
              <div className="col-span-full text-center py-12 text-stone-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-2">Unable to load hotel performance data</p>
                <p className="text-xs text-stone-400 mb-4">ไม่สามารถโหลดข้อมูลประสิทธิภาพโรงแรมได้</p>
                <button
                  onClick={() => refetch.hotelPerformance()}
                  className="text-purple-600 hover:text-purple-700 text-sm inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry • ลองใหม่
                </button>
              </div>
            ) : states.hotelPerformance.isLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="p-5 bg-gradient-to-br from-stone-50 to-stone-100 rounded-xl border border-stone-200">
                  <div className="w-32 h-6 bg-stone-300 rounded mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="flex justify-between items-center">
                        <div className="w-20 h-4 bg-stone-200 rounded animate-pulse"></div>
                        <div className="w-16 h-4 bg-stone-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              (hotelPerformance || []).map((hotel) => (
                <div key={hotel.hotel_id} className="p-5 bg-gradient-to-br from-stone-50 to-stone-100 rounded-xl border border-stone-200 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                        hotel.rank === 1 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                        hotel.rank === 2 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                        hotel.rank === 3 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
                        'bg-gradient-to-r from-purple-500 to-purple-600'
                      }`}>
                        #{hotel.rank}
                      </div>
                      <div>
                        <h4 className="font-semibold text-stone-900 text-sm leading-tight">{hotel.hotel_name}</h4>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    {/* Basic Performance */}
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        การจอง:
                      </span>
                      <div className="text-right">
                        <span className="font-semibold text-stone-700">{hotel.completed_bookings}/{hotel.total_bookings}</span>
                        <div className="text-xs text-stone-500">({hotel.completion_rate.toFixed(1)}%)</div>
                      </div>
                    </div>

                    {/* Financial */}
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        รายได้:
                      </span>
                      <div className="text-right">
                        <span className="font-semibold text-green-700">฿{hotel.total_revenue.toLocaleString()}</span>
                        <div className="text-xs text-stone-500">฿{hotel.avg_booking_value.toLocaleString()}/งาน</div>
                      </div>
                    </div>

                    {/* Customer Metrics */}
                    <div className="flex justify-between items-center">
                      <span className="text-stone-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        ลูกค้า:
                      </span>
                      <span className="font-semibold text-stone-700">{hotel.unique_customers} คน</span>
                    </div>

                    {/* Staff Count */}
                    {hotel.staff_count > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-stone-500 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          พนักงาน:
                        </span>
                        <span className="font-semibold text-blue-700">{hotel.staff_count} คน</span>
                      </div>
                    )}

                    {/* Growth */}
                    {hotel.revenue_growth != null && hotel.revenue_growth !== 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-stone-500 text-xs">การเติบโต:</span>
                        <div className="flex items-center gap-1">
                          <TrendingUp className={`w-3 h-3 ${hotel.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600 rotate-180'}`} />
                          <span className={`text-xs font-medium ${hotel.revenue_growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {hotel.revenue_growth > 0 ? '+' : ''}{hotel.revenue_growth.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Discount */}
                    <div className="flex justify-between items-center pt-2 border-t border-stone-200">
                      <span className="text-stone-500 text-xs">ส่วนลด:</span>
                      <div className="text-right">
                        <span className="font-medium text-stone-600 text-xs">{hotel.commission_rate}%</span>
                        <div className="text-xs text-stone-500">฿{hotel.commission_earned.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            {!isLoading && (!hotelPerformance || hotelPerformance.length === 0) && (
              <div className="col-span-full text-center py-12 text-stone-500">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm mb-1">No hotel data available</p>
                <p className="text-xs text-stone-400">ไม่มีข้อมูลโรงแรมในช่วงเวลานี้</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hotel Payment Details & Invoice Management */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-6 border-b border-indigo-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-stone-900">💰 การชำระเงินโรงแรม • Hotel Payment Details</h3>
              <p className="text-sm text-stone-500">ติดตามสถานะใบแจ้งหนี้และการชำระเงินจากโรงแรม • Invoice and payment tracking</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Payment Overview Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-6 h-6" />
                <span className="text-sm font-medium">ชำระแล้ว • Paid</span>
              </div>
              <div className="text-2xl font-bold mb-1">
                {states.hotelInvoiceSummary?.isLoading ? (
                  <div className="animate-pulse bg-white bg-opacity-20 h-6 w-12 rounded"></div>
                ) : (
                  `${hotelInvoiceSummary?.paid_count ?? 0} รายการ`
                )}
              </div>
              <div className="text-xs opacity-80">
                ฿{(hotelInvoiceSummary?.paid_amount ?? 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-6 h-6" />
                <span className="text-sm font-medium">รอชำระ • Pending</span>
              </div>
              <div className="text-2xl font-bold mb-1">
                {states.hotelInvoiceSummary?.isLoading ? (
                  <div className="animate-pulse bg-white bg-opacity-20 h-6 w-12 rounded"></div>
                ) : (
                  `${hotelInvoiceSummary?.pending_count ?? 0} รายการ`
                )}
              </div>
              <div className="text-xs opacity-80">
                ฿{(hotelInvoiceSummary?.pending_amount ?? 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-6 h-6" />
                <span className="text-sm font-medium">เกินกำหนด • Overdue</span>
              </div>
              <div className="text-2xl font-bold mb-1">
                {states.hotelInvoiceSummary?.isLoading ? (
                  <div className="animate-pulse bg-white bg-opacity-20 h-6 w-12 rounded"></div>
                ) : (
                  `${hotelInvoiceSummary?.overdue_count ?? 0} รายการ`
                )}
              </div>
              <div className="text-xs opacity-80">
                ฿{(hotelInvoiceSummary?.overdue_amount ?? 0).toLocaleString()}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <Calculator className="w-6 h-6" />
                <span className="text-sm font-medium">ยอดค้างชำระรวม • Outstanding</span>
              </div>
              <div className="text-2xl font-bold mb-1">
                {states.hotelInvoiceSummary?.isLoading ? (
                  <div className="animate-pulse bg-white bg-opacity-20 h-6 w-20 rounded"></div>
                ) : (
                  `฿${(hotelInvoiceSummary?.total_outstanding ?? 0).toLocaleString()}`
                )}
              </div>
              <div className="text-xs opacity-80">ใบแจ้งหนี้ที่ยังไม่ชำระ</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HotelSection