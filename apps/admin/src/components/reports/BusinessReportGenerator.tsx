import { useState, useEffect } from 'react'
import {
  TrendingUp,
  FileBarChart,
  Download,
  Calendar,
  Users,
  DollarSign,
  Star,
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart,
  Activity,
  RefreshCw,
  FileText,
  XCircle
} from 'lucide-react'
import { useReportsData, useStaffOverview, useStaffPerformance } from '../../hooks/useAnalytics'
import { exportComprehensiveExcel, exportComprehensivePDF } from '../../lib/comprehensiveExport'
import supabase from '../../lib/supabase'

interface BusinessReportGeneratorProps {
  selectedPeriod: 'daily' | 'weekly' | 'month' | '3_months' | '6_months' | 'year'
}

interface RealTimeBookingData {
  totalBookings: number
  completedBookings: number
  pendingBookings: number
  cancelledBookings: number
  totalRevenue: number
  avgBookingValue: number
  // New KPI metrics
  yearlyRevenue: number
  hotelRevenue: number
  hotelRevenuePercentage: number
  directCustomerRevenue: number
  directCustomerRevenuePercentage: number
  repeatBookingRate: number
  cancellationRate: number
  topServices: Array<{
    name: string
    count: number
    revenue: number
  }>
  customerStats: {
    totalCustomers: number
    repeatCustomers: number
    newCustomers: number
  }
  staffStats: {
    totalActiveStaff: number
    avgRating: number
    totalEarnings: number
  }
}

function BusinessReportGenerator({ selectedPeriod }: BusinessReportGeneratorProps) {
  const [realTimeData, setRealTimeData] = useState<RealTimeBookingData | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportGenerated, setReportGenerated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Get analytics data
  const reportsData = useReportsData(selectedPeriod)
  const staffOverview = useStaffOverview(30)
  const staffPerformance = useStaffPerformance(30, 10)

  // Fetch real-time booking data directly from database
  const fetchRealTimeData = async () => {
    try {
      setError(null)

      // Calculate date range based on selected period
      const now = new Date()
      let startDate: Date

      // Use rolling window to match RPC functions (period_days)
      const periodDaysMap: Record<string, number> = {
        daily: 1,
        weekly: 7,
        month: 30,
        '3_months': 90,
        '6_months': 180,
        year: 365
      }
      const days = periodDaysMap[selectedPeriod] || 30
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

      // Get current period booking statistics
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('status, final_price, service_id, customer_id, created_at, is_hotel_booking, hotel_id, services(name_th)')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (bookingsError) throw bookingsError

      // Get selected period booking statistics (for KPIs) - non-cancelled bookings (matches RPC logic)
      const { data: yearlyBookingsData, error: yearlyBookingsError } = await supabase
        .from('bookings')
        .select('status, final_price, is_hotel_booking, hotel_id, customer_id, created_at')
        .gte('created_at', startDate.toISOString())
        .neq('status', 'cancelled')

      if (yearlyBookingsError) throw yearlyBookingsError

      if (bookingsError) throw bookingsError

      // Get customer data for selected period
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, created_at')
        .gte('created_at', startDate.toISOString())

      if (customersError) throw customersError

      // Get staff data with ratings
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id, status, rating, total_earnings')
        .eq('status', 'active')

      if (staffError) throw staffError

      // Process current period bookings data
      const totalBookings = bookingsData?.length || 0
      const completedBookings = bookingsData?.filter(b => b.status === 'completed')?.length || 0
      const pendingBookings = bookingsData?.filter(b => b.status === 'pending')?.length || 0
      const cancelledBookings = bookingsData?.filter(b => b.status === 'cancelled')?.length || 0

      // Revenue from non-cancelled bookings (matches RPC get_dashboard_stats logic)
      const nonCancelledBookings = bookingsData?.filter(b => b.status !== 'cancelled') || []
      const totalRevenue = nonCancelledBookings.reduce((sum, b) => sum + (b.final_price || 0), 0)

      const avgBookingValue = nonCancelledBookings.length > 0 ? totalRevenue / nonCancelledBookings.length : 0

      // Calculate new KPI metrics for selected period

      // 1. Period Revenue (฿ ช่วงที่เลือก)
      const periodRevenue = yearlyBookingsData
        ?.reduce((sum, b) => sum + (b.final_price || 0), 0) || 0

      // 2. Hotel vs Direct Customer Revenue for selected period
      const hotelBookingsData = yearlyBookingsData?.filter(b => b.is_hotel_booking === true) || []
      const directCustomerBookingsData = yearlyBookingsData?.filter(b => b.is_hotel_booking === false) || []

      const hotelRevenue = hotelBookingsData.reduce((sum, b) => sum + (b.final_price || 0), 0)
      const directCustomerRevenue = directCustomerBookingsData.reduce((sum, b) => sum + (b.final_price || 0), 0)

      const hotelRevenuePercentage = periodRevenue > 0 ? (hotelRevenue / periodRevenue) * 100 : 0
      const directCustomerRevenuePercentage = periodRevenue > 0 ? (directCustomerRevenue / periodRevenue) * 100 : 0

      // 3. Repeat Booking Rate (%) for selected period
      const customerBookingCounts = yearlyBookingsData?.reduce((acc, booking) => {
        const customerId = booking.customer_id
        if (customerId) {
          acc[customerId] = (acc[customerId] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>) || {}

      const totalUniqueCustomers = Object.keys(customerBookingCounts).length
      const repeatCustomers = Object.values(customerBookingCounts).filter(count => count > 1).length
      const repeatBookingRate = totalUniqueCustomers > 0 ? (repeatCustomers / totalUniqueCustomers) * 100 : 0

      // 4. Cancellation Rate (%) - from all bookings (not just yearly)
      const cancellationRate = totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0

      // Process services data
      const serviceMap = new Map()
      bookingsData?.forEach(booking => {
        if (booking.status === 'completed' && booking.services) {
          const serviceName = booking.services.name_th
          if (!serviceMap.has(serviceName)) {
            serviceMap.set(serviceName, { name: serviceName, count: 0, revenue: 0 })
          }
          const service = serviceMap.get(serviceName)
          service.count += 1
          service.revenue += booking.final_price || 0
        }
      })

      const topServices = Array.from(serviceMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      // Process customer data for selected period
      const totalCustomers = customersData?.length || 0
      const newCustomers = totalCustomers // All customers in the query are new for the selected period

      const uniqueCustomerIds = new Set(bookingsData?.map(b => b.customer_id))
      const customerBookingCountsOld = bookingsData
        ?.reduce((acc, booking) => {
          const customerId = booking.customer_id
          if (customerId) {
            acc[customerId] = (acc[customerId] || 0) + 1
          }
          return acc
        }, {} as Record<string, number>)

      const repeatCustomersCount = Object.values(customerBookingCountsOld || {})
        .filter(count => count > 1).length

      // Process staff data
      const totalActiveStaff = staffData?.length || 0
      const ratedStaff = staffData?.filter(s => s.rating && s.rating > 0) || []
      const avgRating = ratedStaff.length > 0
        ? ratedStaff.reduce((sum, s) => sum + s.rating, 0) / ratedStaff.length
        : 0
      const totalEarnings = staffData?.reduce((sum, s) => sum + (s.total_earnings || 0), 0) || 0

      setRealTimeData({
        totalBookings,
        completedBookings,
        pendingBookings,
        cancelledBookings,
        totalRevenue,
        avgBookingValue,
        // New KPI metrics
        yearlyRevenue: periodRevenue,
        hotelRevenue,
        hotelRevenuePercentage,
        directCustomerRevenue,
        directCustomerRevenuePercentage,
        repeatBookingRate,
        cancellationRate,
        topServices,
        customerStats: {
          totalCustomers,
          repeatCustomers: repeatCustomersCount,
          newCustomers
        },
        staffStats: {
          totalActiveStaff,
          avgRating,
          totalEarnings
        }
      })

    } catch (err: any) {
      console.error('Error fetching real-time data:', err)
      setError(err.message || 'ไม่สามารถโหลดข้อมูลได้')
    }
  }

  // Generate comprehensive business report
  const generateBusinessReport = async () => {
    setIsGeneratingReport(true)
    try {
      await fetchRealTimeData()
      setReportGenerated(true)
    } catch (err) {
      console.error('Error generating report:', err)
    } finally {
      setIsGeneratingReport(false)
    }
  }

  // Export functions
  const handleExportExcel = async () => {
    setIsExporting(true)
    try {
      const periodDays = {
        daily: 1,
        weekly: 7,
        month: 30,
        '3_months': 90,
        '6_months': 180,
        year: 365
      }
      await exportComprehensiveExcel(periodDays[selectedPeriod])
      setShowExportMenu(false)
    } catch (error) {
      console.error('Export Excel failed:', error)
      alert('ไม่สามารถส่งออกไฟล์ Excel ได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      const periodDays = {
        daily: 1,
        weekly: 7,
        month: 30,
        '3_months': 90,
        '6_months': 180,
        year: 365
      }
      await exportComprehensivePDF(periodDays[selectedPeriod])
      setShowExportMenu(false)
    } catch (error) {
      console.error('Export PDF failed:', error)
      alert('ไม่สามารถส่งออกไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsExporting(false)
    }
  }

  // Auto-refresh data every 5 minutes
  useEffect(() => {
    fetchRealTimeData()
    const interval = setInterval(fetchRealTimeData, 5 * 60 * 1000) // 5 minutes
    return () => clearInterval(interval)
  }, [selectedPeriod])

  // Calculate completion rate
  const completionRate = realTimeData ?
    realTimeData.totalBookings > 0
      ? (realTimeData.completedBookings / realTimeData.totalBookings) * 100
      : 0
    : 0

  // Calculate customer retention rate
  const customerRetentionRate = realTimeData ?
    realTimeData.customerStats.totalCustomers > 0
      ? (realTimeData.customerStats.repeatCustomers / realTimeData.customerStats.totalCustomers) * 100
      : 0
    : 0

  // Get period label for UI
  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'daily': return 'วันนี้'
      case 'weekly': return 'สัปดาห์นี้'
      case 'month': return 'เดือนนี้'
      case '3_months': return '3 เดือนนี้'
      case '6_months': return '6 เดือนนี้'
      case 'year': return 'ปีนี้'
      default: return 'เดือนนี้'
    }
  }

  return (
    <div className="space-y-6">
      {/* Export Button */}
      <div className="flex justify-end">
        <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isExporting || !realTimeData}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-medium hover:from-green-700 hover:to-green-800 transition disabled:opacity-50 shadow-lg"
              >
                {isExporting ? (
                  <>
                    <Activity className="w-5 h-5 animate-pulse" />
                    กำลังส่งออก...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    ส่งออกรายงาน
                  </>
                )}
              </button>

              {showExportMenu && realTimeData && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-stone-200 py-2 z-20">
                  <div className="px-4 py-2 bg-stone-50 border-b border-stone-200">
                    <p className="text-xs font-medium text-stone-600">ส่งออกรายงานครบวงจร</p>
                  </div>
                  <button
                    onClick={handleExportExcel}
                    disabled={isExporting}
                    className="w-full text-left px-4 py-3 hover:bg-stone-50 flex items-center gap-3 text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <FileBarChart className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Excel รายละเอียด</div>
                      <div className="text-xs text-stone-500">ไฟล์ CSV พร้อมข้อมูลครบถ้วน</div>
                    </div>
                  </button>
                  <button
                    onClick={handleExportPDF}
                    disabled={isExporting}
                    className="w-full text-left px-4 py-3 hover:bg-stone-50 flex items-center gap-3 text-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">PDF สรุปผล</div>
                      <div className="text-xs text-stone-500">รายงานสรุปแบบอ่านง่าย</div>
                    </div>
                  </button>
                </div>
              )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">เกิดข้อผิดพลาด</h3>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {reportGenerated && !error && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-900">รายงานสร้างเสร็จสิ้น</h3>
              <p className="text-green-700 text-sm mt-1">
                ได้ข้อมูลล่าสุดจากฐานข้อมูลแล้ว • Updated with latest database information
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Business Metrics */}
      {realTimeData && (
        <>
          {/* 6 Key Performance Indicator Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. รายได้รวม (฿ ทั้งปี) */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-stone-200 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-500 mb-1">รายได้รวม{getPeriodLabel()}</p>
                  <p className="text-3xl font-bold text-green-700">
                    ฿{realTimeData.yearlyRevenue.toLocaleString()}
                  </p>
                  <p className="text-sm text-stone-600 mt-1">
                    ช่วงเวลา: {getPeriodLabel()}
                  </p>
                </div>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </div>
            </div>

            {/* 2. จองทั้งหมด (ครั้ง + เฉลี่ย ฿/ครั้ง) */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-stone-200 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-500 mb-1">การจองทั้งหมด</p>
                  <p className="text-3xl font-bold text-blue-700">
                    {realTimeData.totalBookings.toLocaleString()} ครั้ง
                  </p>
                  <p className="text-sm text-stone-600 mt-1">
                    เฉลี่ย ฿{realTimeData.avgBookingValue.toLocaleString()}/ครั้ง
                  </p>
                </div>
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>

            {/* 3. รายได้จากโรงแรม (฿ + %) */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-stone-200 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-500 mb-1">รายได้จากโรงแรม</p>
                  <p className="text-3xl font-bold text-purple-700">
                    ฿{realTimeData.hotelRevenue.toLocaleString()}
                  </p>
                  <p className="text-sm text-stone-600 mt-1">
                    {realTimeData.hotelRevenuePercentage.toFixed(1)}% ของรายได้รวม
                  </p>
                </div>
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-purple-600" />
                </div>
              </div>
            </div>

            {/* 4. รายได้ลูกค้าตรง (฿ + %) */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-stone-200 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-500 mb-1">รายได้ลูกค้าตรง</p>
                  <p className="text-3xl font-bold text-amber-700">
                    ฿{realTimeData.directCustomerRevenue.toLocaleString()}
                  </p>
                  <p className="text-sm text-stone-600 mt-1">
                    {realTimeData.directCustomerRevenuePercentage.toFixed(1)}% ของรายได้รวม
                  </p>
                </div>
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
                  <Star className="w-8 h-8 text-amber-600" />
                </div>
              </div>
            </div>

            {/* 5. อัตราจองซ้ำ Repeat Booking Rate (%) */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-stone-200 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-500 mb-1">อัตราจองซ้ำ</p>
                  <p className="text-3xl font-bold text-teal-700">
                    {realTimeData.repeatBookingRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-stone-600 mt-1">
                    Repeat Booking Rate
                  </p>
                </div>
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-teal-600" />
                </div>
              </div>
            </div>

            {/* 6. อัตรายกเลิก (%) */}
            <div className="bg-white rounded-2xl shadow-sm p-6 border border-stone-200 hover:shadow-lg transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-500 mb-1">อัตรายกเลิก</p>
                  <p className="text-3xl font-bold text-red-700">
                    {realTimeData.cancellationRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-stone-600 mt-1">
                    จาก {realTimeData.totalBookings} การจองทั้งหมด
                  </p>
                </div>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Status Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="bg-gradient-to-r from-stone-50 to-stone-100 p-4 border-b">
                <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  สถานะการจอง • Booking Status
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <span className="font-medium text-green-800">เสร็จสิ้น (Completed)</span>
                  <div className="text-right">
                    <div className="font-bold text-green-900">{realTimeData.completedBookings}</div>
                    <div className="text-xs text-green-600">
                      {realTimeData.totalBookings > 0 ? ((realTimeData.completedBookings / realTimeData.totalBookings) * 100).toFixed(1) : '0.0'}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <span className="font-medium text-yellow-800">รอดำเนินการ (Pending)</span>
                  <div className="text-right">
                    <div className="font-bold text-yellow-900">{realTimeData.pendingBookings}</div>
                    <div className="text-xs text-yellow-600">
                      {realTimeData.totalBookings > 0 ? ((realTimeData.pendingBookings / realTimeData.totalBookings) * 100).toFixed(1) : '0.0'}%
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <span className="font-medium text-red-800">ยกเลิก (Cancelled)</span>
                  <div className="text-right">
                    <div className="font-bold text-red-900">{realTimeData.cancelledBookings}</div>
                    <div className="text-xs text-red-600">
                      {realTimeData.totalBookings > 0 ? ((realTimeData.cancelledBookings / realTimeData.totalBookings) * 100).toFixed(1) : '0.0'}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Services */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="bg-gradient-to-r from-stone-50 to-stone-100 p-4 border-b">
                <h3 className="font-semibold text-stone-900 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-amber-600" />
                  บริการยอดนิยม • Top Services
                </h3>
              </div>
              <div className="p-6 space-y-4">
                {realTimeData.topServices.map((service, index) => (
                  <div key={service.name} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center font-bold text-amber-700">
                        {index + 1}
                      </div>
                      <span className="font-medium text-stone-900">{service.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-stone-900">฿{service.revenue.toLocaleString()}</div>
                      <div className="text-xs text-stone-500">{service.count} การจอง</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </>
      )}
    </div>
  )
}

export default BusinessReportGenerator