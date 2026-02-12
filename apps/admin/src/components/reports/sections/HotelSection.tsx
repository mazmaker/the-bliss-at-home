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
  Star,
  Building2,
  Award,
  CreditCard,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  Banknote,
  Wallet,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Send,
  AlertTriangle
} from 'lucide-react'
import { useReportsData } from '../../../hooks/useAnalytics'
import { quickExportPDF, quickExportExcel } from '../../../lib/exportUtils'

interface HotelSectionProps {
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
    avgRating: hotelPerformance.reduce((sum, hotel) => sum + hotel.avg_rating, 0) / hotelPerformance.length,
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
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-10">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Partners */}
        <div className="bg-gradient-to-br from-[#d29b25] to-[#c08a20] rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-90">โรงแรมพาร์ทเนอร์ • Hotel Partners</p>
              <p className="text-3xl font-bold mt-3 mb-2">
                {states.hotelPerformance.isLoading
                  ? <div className="animate-pulse bg-white bg-opacity-20 h-8 w-12 rounded"></div>
                  : hotelStats?.totalHotels || 0}
              </p>
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
              <p className="text-lg font-bold mt-3 mb-2 truncate">
                {states.hotelPerformance.isLoading
                  ? <div className="animate-pulse bg-stone-600 bg-opacity-20 h-6 w-20 rounded"></div>
                  : hotelStats?.topPerformer || 'N/A'}
              </p>
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
              <p className="text-3xl font-bold mt-3 mb-2">
                {states.hotelPerformance.isLoading
                  ? <div className="animate-pulse bg-white bg-opacity-20 h-8 w-24 rounded"></div>
                  : `฿${(hotelStats?.totalRevenue || 0).toLocaleString()}`}
              </p>
              <p className="text-sm opacity-90">รวมทั้งหมด</p>
            </div>
            <DollarSign className="w-12 h-12 opacity-80" />
          </div>
        </div>

        {/* Average Rating */}
        <div className="bg-gradient-to-br from-[#d29b25] to-[#b8841f] rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full transform translate-x-16 -translate-y-16"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-90">คะแนนเฉลี่ย • Avg Rating</p>
              <p className="text-3xl font-bold mt-3 mb-2">
                {states.hotelPerformance.isLoading
                  ? <div className="animate-pulse bg-white bg-opacity-20 h-8 w-16 rounded"></div>
                  : (hotelStats?.avgRating || 0).toFixed(1)}
              </p>
              <p className="text-sm opacity-90">จาก 5.0 ดาว</p>
            </div>
            <Star className="w-12 h-12 opacity-80" />
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
                        {hotel.avg_rating > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-3 h-3 text-yellow-400" />
                            <span className="text-xs text-stone-600">{hotel.avg_rating.toFixed(1)} ({hotel.total_reviews} reviews)</span>
                          </div>
                        )}
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
                      <div className="text-right">
                        <span className="font-semibold text-stone-700">{hotel.unique_customers}</span>
                        <div className="text-xs text-green-600">ใหม่ +{hotel.new_customers}</div>
                      </div>
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
                    {hotel.revenue_growth !== 0 && (
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

                    {/* Commission */}
                    <div className="flex justify-between items-center pt-2 border-t border-stone-200">
                      <span className="text-stone-500 text-xs">คอมมิชชั่น:</span>
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
              <p className="text-sm text-stone-500">Invoice management and payment tracking • การจัดการใบแจ้งหนี้และติดตามการชำระเงิน</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Payment Overview Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-6 h-6" />
                <span className="text-sm font-medium">Paid Hotels</span>
              </div>
              <div className="text-2xl font-bold mb-1">
                {states.hotelPerformance.isLoading ? (
                  <div className="animate-pulse bg-white bg-opacity-20 h-6 w-12 rounded"></div>
                ) : (
                  (hotelPerformance || []).filter(h => h.payment_status === 'paid').length
                )}
              </div>
              <div className="text-xs opacity-80">
                ฿{(hotelPerformance || [])
                  .filter(h => h.payment_status === 'paid')
                  .reduce((sum, h) => sum + (h.amount_due || 0), 0)
                  .toLocaleString()}
              </div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-6 h-6" />
                <span className="text-sm font-medium">Pending Payment</span>
              </div>
              <div className="text-2xl font-bold mb-1">
                {states.hotelPerformance.isLoading ? (
                  <div className="animate-pulse bg-white bg-opacity-20 h-6 w-12 rounded"></div>
                ) : (
                  (hotelPerformance || []).filter(h => h.payment_status === 'pending').length
                )}
              </div>
              <div className="text-xs opacity-80">
                ฿{(hotelPerformance || [])
                  .filter(h => h.payment_status === 'pending')
                  .reduce((sum, h) => sum + (h.amount_due || 0), 0)
                  .toLocaleString()}
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-6 h-6" />
                <span className="text-sm font-medium">Overdue</span>
              </div>
              <div className="text-2xl font-bold mb-1">
                {states.hotelPerformance.isLoading ? (
                  <div className="animate-pulse bg-white bg-opacity-20 h-6 w-12 rounded"></div>
                ) : (
                  (hotelPerformance || []).filter(h => h.payment_status === 'overdue').length
                )}
              </div>
              <div className="text-xs opacity-80">
                ฿{(hotelPerformance || [])
                  .filter(h => h.payment_status === 'overdue')
                  .reduce((sum, h) => sum + (h.amount_due || 0), 0)
                  .toLocaleString()}
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <Calculator className="w-6 h-6" />
                <span className="text-sm font-medium">Total Outstanding</span>
              </div>
              <div className="text-2xl font-bold mb-1">
                {states.hotelPerformance.isLoading ? (
                  <div className="animate-pulse bg-white bg-opacity-20 h-6 w-20 rounded"></div>
                ) : (
                  `฿${(hotelPerformance || [])
                    .filter(h => h.payment_status !== 'paid')
                    .reduce((sum, h) => sum + (h.amount_due || 0), 0)
                    .toLocaleString()}`
                )}
              </div>
              <div className="text-xs opacity-80">Unpaid invoices</div>
            </div>
          </div>

          {/* Payment Status Table */}
          <div className="bg-stone-50 rounded-xl p-6 mb-8">
            <h4 className="font-semibold text-stone-900 mb-4">📋 สถานะการชำระเงิน • Payment Status</h4>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-200 text-left">
                    <th className="pb-3 text-sm font-semibold text-stone-700">Hotel Name</th>
                    <th className="pb-3 text-sm font-semibold text-stone-700 text-right">Revenue Share</th>
                    <th className="pb-3 text-sm font-semibold text-stone-700 text-right">Commission</th>
                    <th className="pb-3 text-sm font-semibold text-stone-700 text-right">Amount Due</th>
                    <th className="pb-3 text-sm font-semibold text-stone-700 text-center">Status</th>
                    <th className="pb-3 text-sm font-semibold text-stone-700 text-center">Due Date</th>
                    <th className="pb-3 text-sm font-semibold text-stone-700 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {states.hotelPerformance.isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-stone-100">
                        <td className="py-3">
                          <div className="animate-pulse bg-stone-200 h-4 w-32 rounded"></div>
                        </td>
                        <td className="py-3 text-right">
                          <div className="animate-pulse bg-stone-200 h-4 w-20 rounded ml-auto"></div>
                        </td>
                        <td className="py-3 text-right">
                          <div className="animate-pulse bg-stone-200 h-4 w-16 rounded ml-auto"></div>
                        </td>
                        <td className="py-3 text-right">
                          <div className="animate-pulse bg-stone-200 h-4 w-20 rounded ml-auto"></div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="animate-pulse bg-stone-200 h-6 w-16 rounded mx-auto"></div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="animate-pulse bg-stone-200 h-4 w-20 rounded mx-auto"></div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="animate-pulse bg-stone-200 h-6 w-16 rounded mx-auto"></div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    (hotelPerformance || []).map((hotel, index) => {
                      // Calculate payment details (mock data for demonstration)
                      const revenueShare = hotel.total_revenue * 0.70 // 70% to hotel
                      const commissionAmount = hotel.total_revenue * 0.30 // 30% platform commission
                      const amountDue = revenueShare - (hotel.advance_payment || 0)
                      const paymentStatus = amountDue <= 0 ? 'paid' :
                        (Date.now() - (hotel.last_payment_date || Date.now())) > 30 * 24 * 60 * 60 * 1000 ? 'overdue' : 'pending'

                      return (
                        <tr key={index} className="border-b border-stone-100 hover:bg-white transition-colors">
                          <td className="py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                {hotel.hotel_name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <div className="font-medium text-stone-900">{hotel.hotel_name}</div>
                                <div className="text-xs text-stone-500">{hotel.total_bookings} bookings</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-right">
                            <span className="font-bold text-green-600">฿{revenueShare.toLocaleString()}</span>
                            <div className="text-xs text-stone-500">70% share</div>
                          </td>
                          <td className="py-3 text-right">
                            <span className="text-red-600 font-semibold">฿{commissionAmount.toLocaleString()}</span>
                            <div className="text-xs text-stone-500">30% commission</div>
                          </td>
                          <td className="py-3 text-right">
                            <span className="font-bold text-stone-900">฿{Math.max(amountDue, 0).toLocaleString()}</span>
                          </td>
                          <td className="py-3 text-center">
                            {paymentStatus === 'paid' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                <CheckCircle className="w-3 h-3" />
                                Paid
                              </span>
                            ) : paymentStatus === 'pending' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                <AlertTriangle className="w-3 h-3" />
                                Overdue
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Calendar className="w-3 h-3 text-stone-400" />
                              <span className="text-xs text-stone-600">
                                {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('th-TH')}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded">
                                <Eye className="w-4 h-4" />
                              </button>
                              {paymentStatus !== 'paid' && (
                                <button className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 rounded">
                                  <Send className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Methods & Financial Setup */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Payment Methods */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-6 h-6 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Payment Methods</h4>
              </div>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-900">Bank Transfer</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Primary</span>
                  </div>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>Processing Time: 1-2 business days</div>
                    <div>Fee: Free for amounts over ฿10,000</div>
                    <div>Automatic reconciliation: Yes</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-900">Digital Wallet</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Secondary</span>
                  </div>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>Processing Time: Instant</div>
                    <div>Fee: 2.5% transaction fee</div>
                    <div>Automatic reconciliation: Yes</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-blue-900">Check Payment</span>
                    <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">Available</span>
                  </div>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>Processing Time: 5-7 business days</div>
                    <div>Fee: ฿50 processing fee</div>
                    <div>Manual reconciliation required</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Sharing & Commission Structure */}
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-6 rounded-xl border border-emerald-200">
              <div className="flex items-center gap-3 mb-4">
                <Banknote className="w-6 h-6 text-emerald-600" />
                <h4 className="font-semibold text-emerald-900">Revenue Sharing</h4>
              </div>
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-emerald-900">Hotel Revenue Share</span>
                    <span className="text-2xl font-bold text-emerald-600">70%</span>
                  </div>
                  <div className="text-sm text-emerald-700">
                    Hotels receive 70% of all booking revenue after service completion
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-emerald-900">Platform Commission</span>
                    <span className="text-2xl font-bold text-emerald-600">30%</span>
                  </div>
                  <div className="text-sm text-emerald-700">
                    Covers platform operations, staff payments, and service quality assurance
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-emerald-900">Payment Schedule</span>
                    <span className="text-sm font-semibold text-emerald-600">Weekly</span>
                  </div>
                  <div className="text-sm text-emerald-700">
                    Payments processed every Friday for completed services from the previous week
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-emerald-900">Minimum Payout</span>
                    <span className="text-sm font-semibold text-emerald-600">฿1,000</span>
                  </div>
                  <div className="text-sm text-emerald-700">
                    Minimum threshold for automated payments. Smaller amounts roll over to next period.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Generation & Management */}
          <div className="bg-stone-50 rounded-xl p-6 mt-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Wallet className="w-6 h-6 text-stone-600" />
                <h4 className="font-semibold text-stone-900">📄 การจัดการใบแจ้งหนี้ • Invoice Management</h4>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                  Generate Invoices
                </button>
                <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm">
                  Process Payments
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-lg border border-stone-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h5 className="font-medium text-stone-900">Pending Invoices</h5>
                    <p className="text-sm text-stone-500">Ready for generation</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {states.hotelPerformance.isLoading ? (
                    <div className="animate-pulse bg-stone-200 h-6 w-8 rounded"></div>
                  ) : (
                    (hotelPerformance || []).filter(h => !h.invoice_generated).length
                  )}
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  Total value: ฿{(hotelPerformance || [])
                    .filter(h => !h.invoice_generated)
                    .reduce((sum, h) => sum + h.total_revenue * 0.70, 0)
                    .toLocaleString()}
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-stone-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h5 className="font-medium text-stone-900">Sent Invoices</h5>
                    <p className="text-sm text-stone-500">Awaiting payment</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-amber-600">
                  {states.hotelPerformance.isLoading ? (
                    <div className="animate-pulse bg-stone-200 h-6 w-8 rounded"></div>
                  ) : (
                    (hotelPerformance || []).filter(h => h.invoice_generated && h.payment_status === 'pending').length
                  )}
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  Average days outstanding: 12 days
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-stone-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h5 className="font-medium text-stone-900">Paid Invoices</h5>
                    <p className="text-sm text-stone-500">Completed payments</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {states.hotelPerformance.isLoading ? (
                    <div className="animate-pulse bg-stone-200 h-6 w-8 rounded"></div>
                  ) : (
                    (hotelPerformance || []).filter(h => h.payment_status === 'paid').length
                  )}
                </div>
                <div className="text-xs text-stone-500 mt-1">
                  This month: ฿{(hotelPerformance || [])
                    .filter(h => h.payment_status === 'paid')
                    .reduce((sum, h) => sum + h.total_revenue * 0.70, 0)
                    .toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HotelSection