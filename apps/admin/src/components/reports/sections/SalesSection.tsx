import { useState, useRef, useEffect } from 'react'
import {
  DollarSign,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Download,
  FileText,
  Table,
  ChevronDown,
  Info,
  Target,
  PieChart,
  Wallet,
  Clock,
  CreditCard,
  Store,
  Users,
  Smartphone,
  Calculator,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react'
import {
  useReportsData,
  useAdvancedSalesMetrics,
  useSalesChannelAnalysis,
  usePaymentMethodAnalysis,
  useServiceRevenueByCategory,
  useTimeBasedRevenueAnalysis
} from '../../../hooks/useAnalytics'
import { quickExportPDF, quickExportExcel } from '../../../lib/exportUtils'

interface SalesSectionProps {
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

  // Period to days conversion
  const periodDays = {
    daily: 1,
    weekly: 7,
    month: 30,
    '3_months': 90,
    '6_months': 180,
    year: 365
  }

  const days = periodDays[selectedPeriod]

  // Basic reports data
  const {
    dashboardStats,
    dailyRevenue,
    isLoading,
    isError,
    error,
    states,
    refetch
  } = useReportsData(selectedPeriod)

  // Advanced analytics hooks
  const advancedSalesMetrics = useAdvancedSalesMetrics(days)
  const salesChannelAnalysis = useSalesChannelAnalysis(days)
  const paymentMethodAnalysis = usePaymentMethodAnalysis(days)
  const serviceRevenueByCategory = useServiceRevenueByCategory(days)
  const timeBasedRevenueAnalysis = useTimeBasedRevenueAnalysis(days)

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
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-bliss-100">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold text-bliss-900 mb-2">เกิดข้อผิดพลาดในการโหลดข้อมูลยอดขาย</h2>
            <p className="text-bliss-500 mb-6">
              {error?.message || 'ไม่สามารถโหลดข้อมูลยอดขายได้ กรุณาลองใหม่อีกครั้ง'}
            </p>
            <button
              onClick={() => refetch.dailyRevenue()}
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
            <Wallet className="w-6 h-6 text-bliss-600" />
            ยอดขายและการเงิน
            <Tooltip content="การวิเคราะห์ขายและการเงินระดับโลก | World-class sales and financial analytics">
              <Info className="w-5 h-5 text-bliss-400 hover:text-bliss-600 cursor-help" />
            </Tooltip>
          </h2>
          <p className="text-bliss-500 mt-1">World-class Sales Analytics • การวิเคราะห์ขายระดับโลก</p>
        </div>

        {/* Export Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowExportDropdown(!showExportDropdown)}
            disabled={isExporting || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-bliss-600 to-bliss-700 text-white rounded-xl font-medium hover:from-bliss-700 hover:to-bliss-800 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Download className="w-5 h-5" />
            {isExporting ? 'กำลังส่งออก...' : 'ส่งออกยอดขาย'}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showExportDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-bliss-200 py-2 z-50">
              <div className="px-4 py-2 bg-bliss-50 border-b border-bliss-200">
                <p className="text-xs font-medium text-bliss-600">Export Sales Data • ส่งออกข้อมูลยอดขาย</p>
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

      {/* Advanced Revenue Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Gross Revenue */}
        <div className="bg-gradient-to-br from-bliss-600 to-bliss-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full transform translate-x-8 -translate-y-8"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-90">รายได้รวม • Gross Revenue</p>
              <p className="text-2xl font-bold mt-2 mb-1">
                {advancedSalesMetrics.isLoading
                  ? <span className="block animate-pulse bg-white bg-opacity-20 h-6 w-20 rounded"></span>
                  : `฿${(advancedSalesMetrics.data?.gross_revenue || 0).toLocaleString()}`}
              </p>
              {advancedSalesMetrics.data?.revenue_growth_rate != null ? (
                <div className={`flex items-center gap-1 text-xs ${advancedSalesMetrics.data.revenue_growth_rate >= 0 ? '' : 'opacity-80'}`}>
                  {advancedSalesMetrics.data.revenue_growth_rate >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span>{advancedSalesMetrics.data.revenue_growth_rate > 0 ? '+' : ''}{advancedSalesMetrics.data.revenue_growth_rate.toFixed(1)}%</span>
                </div>
              ) : (
                <div className="text-xs opacity-60">ไม่มีข้อมูลเปรียบเทียบ</div>
              )}
            </div>
            <DollarSign className="w-8 h-8 opacity-80" />
          </div>
        </div>

        {/* Net Revenue */}
        <div className="bg-gradient-to-br from-bliss-600 to-bliss-700 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full transform translate-x-8 -translate-y-8"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-90">รายได้สุทธิ • Net Revenue</p>
              <p className="text-2xl font-bold mt-2 mb-1">
                {advancedSalesMetrics.isLoading
                  ? <span className="block animate-pulse bg-white bg-opacity-20 h-6 w-20 rounded"></span>
                  : `฿${(advancedSalesMetrics.data?.net_revenue || 0).toLocaleString()}`}
              </p>
              <div className="text-xs opacity-90">
                Gross Margin: {(advancedSalesMetrics.data?.gross_margin_percent || 0).toFixed(1)}%
              </div>
            </div>
            <Calculator className="w-8 h-8 opacity-80" />
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-gradient-to-br from-bliss-500 to-bliss-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full transform translate-x-8 -translate-y-8"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-70">AOV • มูลค่าเฉลี่ย</p>
              <p className="text-2xl font-bold mt-2 mb-1">
                {advancedSalesMetrics.isLoading
                  ? <span className="block animate-pulse bg-bliss-600 bg-opacity-20 h-6 w-20 rounded"></span>
                  : `฿${(advancedSalesMetrics.data?.average_order_value || 0).toLocaleString()}`}
              </p>
              <div className="text-xs opacity-70">
                Per booking
              </div>
            </div>
            <BarChart3 className="w-8 h-8 text-white opacity-80" />
          </div>
        </div>

        {/* Forecasting */}
        <div className="bg-gradient-to-br from-bliss-500 to-bliss-600 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full transform translate-x-8 -translate-y-8"></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex-1">
              <p className="text-sm opacity-90">พยากรณ์ • Forecast</p>
              <p className="text-2xl font-bold mt-2 mb-1">
                {advancedSalesMetrics.isLoading
                  ? <span className="block animate-pulse bg-white bg-opacity-20 h-6 w-20 rounded"></span>
                  : `฿${(advancedSalesMetrics.data?.projected_revenue || 0).toLocaleString()}`}
              </p>
              <div className="text-xs opacity-90">
                Target: {(advancedSalesMetrics.data?.target_achievement_percent || 0).toFixed(1)}%
              </div>
            </div>
            <Target className="w-8 h-8 opacity-80" />
          </div>
        </div>
      </div>

      {/* Sales Channel Analysis */}
      <div className="bg-white rounded-2xl shadow-lg border border-bliss-100 overflow-hidden">
        <div className="bg-gradient-to-r from-bliss-50 to-bliss-100 p-6 border-b border-bliss-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-bliss-600 to-bliss-700 rounded-lg flex items-center justify-center">
              <PieChart className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-bliss-900">📊 ช่องทางการขาย • Sales Channels</h3>
              <p className="text-sm text-bliss-500">Channel performance and market share • ประสิทธิภาพช่องทางและส่วนแบ่งตลาด</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {salesChannelAnalysis.isLoading ? (
              Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-bliss-200 h-6 w-24 rounded mb-2"></div>
                  <div className="bg-bliss-200 h-8 w-32 rounded mb-2"></div>
                  <div className="bg-bliss-200 h-4 w-20 rounded"></div>
                </div>
              ))
            ) : (
              (salesChannelAnalysis.data || []).filter((channel) => channel.channel_name !== 'Walk-in').map((channel, index) => {
                const iconMap = {
                  'Hotel Direct': Store,
                  'Customer App': Smartphone,
                }
                const Icon = iconMap[channel.channel_name] || Store

                const colorMap = {
                  'Hotel Direct': 'from-bliss-600 to-bliss-700',
                  'Customer App': 'from-bliss-500 to-bliss-600',
                }
                const bgColor = colorMap[channel.channel_name] || 'from-bliss-500 to-bliss-600'

                return (
                  <div key={index} className="p-4 rounded-xl border border-bliss-200 bg-gradient-to-br from-bliss-50 to-white">
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 bg-gradient-to-r ${bgColor} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-bliss-900">{channel.channel_name}</h4>
                        <p className="text-xs text-bliss-500">{channel.market_share_percent}% market share</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-bliss-600">Revenue:</span>
                        <span className="font-semibold">฿{channel.revenue?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bliss-600">Bookings:</span>
                        <span className="font-semibold">{channel.booking_count || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bliss-600">AVG Value:</span>
                        <span className="font-semibold">฿{channel.avg_booking_value?.toLocaleString() || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-bliss-600">Growth:</span>
                        {channel.growth_rate != null ? (
                          <span className={`font-semibold flex items-center gap-1 ${
                            channel.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {channel.growth_rate >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(channel.growth_rate).toFixed(1)}%
                          </span>
                        ) : (
                          <span className="font-semibold text-bliss-400">-</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Service Revenue by Category */}
      <div className="bg-white rounded-2xl shadow-lg border border-bliss-100 overflow-hidden">
        <div className="bg-gradient-to-r from-bliss-50 to-bliss-100 p-6 border-b border-bliss-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-bliss-600 to-bliss-700 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-bliss-900">🎯 รายได้ตามประเภทบริการ • Revenue by Service Type</h3>
              <p className="text-sm text-bliss-500">Performance breakdown by service categories • การแบ่งประสิทธิภาพตามหมวดบริการ</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {serviceRevenueByCategory.isLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="animate-pulse flex items-center gap-4">
                  <div className="bg-bliss-200 w-12 h-12 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="bg-bliss-200 h-4 w-32 rounded mb-2"></div>
                    <div className="bg-bliss-200 h-3 w-24 rounded"></div>
                  </div>
                  <div className="bg-bliss-200 h-6 w-20 rounded"></div>
                </div>
              ))
            ) : (
              (() => {
                const categories = serviceRevenueByCategory.data || []
                const totalRevenue = categories.reduce((sum, s) => sum + (s.total_revenue || 0), 0)
                return categories.map((service, index) => {
                  const colors = [
                    'from-bliss-700 to-bliss-800',
                    'from-bliss-600 to-bliss-700',
                    'from-bliss-500 to-bliss-600',
                    'from-bliss-400 to-bliss-500',
                    'from-bliss-300 to-bliss-400'
                  ]
                  const bgColor = colors[index % colors.length]
                  const marketShare = totalRevenue > 0 ? (service.total_revenue || 0) / totalRevenue * 100 : 0

                  return (
                    <div key={index} className="flex items-center gap-4 p-4 bg-bliss-50 rounded-lg">
                      <div className={`w-12 h-12 bg-gradient-to-r ${bgColor} rounded-lg flex items-center justify-center text-white font-bold text-lg`}>
                        {service.category?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-bliss-900">{service.category_th || service.category || 'Unknown'}</h4>
                        <div className="flex items-center gap-4 text-sm text-bliss-600">
                          <span>{service.total_bookings || 0} bookings</span>
                          <span>•</span>
                          <span>AVG: ฿{service.avg_price?.toLocaleString() || 0}</span>
                          <span>•</span>
                          {service.growth_rate != null ? (
                            <span className={`flex items-center gap-1 ${
                              service.growth_rate >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {service.growth_rate >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {Math.abs(service.growth_rate).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-bliss-400">-</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-bliss-900">฿{service.total_revenue?.toLocaleString() || 0}</div>
                        <div className="text-xs text-bliss-500">{marketShare.toFixed(1)}% share</div>
                      </div>
                    </div>
                  )
                })
              })()
            )}
          </div>
        </div>
      </div>

      {/* Payment Method Analysis */}
      <div className="bg-white rounded-2xl shadow-lg border border-bliss-100 overflow-hidden">
        <div className="bg-gradient-to-r from-bliss-50 to-bliss-100 p-6 border-b border-bliss-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-bliss-600 to-bliss-700 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-bliss-900">💳 วิธีการชำระเงิน • Payment Methods</h3>
              <p className="text-sm text-bliss-500">Payment performance and processing costs • ประสิทธิภาพการชำระเงินและค่าดำเนินการ</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paymentMethodAnalysis.isLoading ? (
              Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="animate-pulse p-4 border border-bliss-200 rounded-lg">
                  <div className="bg-bliss-200 h-6 w-20 rounded mb-3"></div>
                  <div className="space-y-2">
                    <div className="bg-bliss-200 h-4 w-full rounded"></div>
                    <div className="bg-bliss-200 h-4 w-3/4 rounded"></div>
                  </div>
                </div>
              ))
            ) : (
              (paymentMethodAnalysis.data || []).filter(m => m.payment_method !== 'cash').map((method, index) => {
                const paymentLabels: Record<string, string> = {
                  credit_card: 'บัตรเครดิต/เดบิต',
                  promptpay: 'พร้อมเพย์',
                  internet_banking: 'อินเทอร์เน็ตแบงก์กิ้ง',
                  mobile_banking: 'โมบายแบงก์กิ้ง',
                }
                return (
                <div key={index} className="p-4 border border-bliss-200 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-bliss-900 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      {paymentLabels[method.payment_method] || method.payment_method}
                    </h4>
                    <span className="text-2xl font-bold text-bliss-900">
                      ฿{method.total_amount?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-bliss-600">Transactions:</span>
                      <span className="font-semibold">{method.transaction_count || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bliss-600">Success Rate:</span>
                      <span className="font-semibold text-green-600">{method.success_rate || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bliss-600">AVG Transaction:</span>
                      <span className="font-semibold">฿{method.avg_transaction_value?.toLocaleString() || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-bliss-600">Processing Fees:</span>
                      <span className="font-semibold text-red-600">฿{method.processing_fees_estimated?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Peak Time Analysis */}
      <div className="bg-white rounded-2xl shadow-lg border border-bliss-100 overflow-hidden">
        <div className="bg-gradient-to-r from-bliss-50 to-bliss-100 p-6 border-b border-bliss-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-bliss-600 to-bliss-700 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-bliss-900">⏰ ช่วงเวลายอดนิยม • Peak Time Analysis</h3>
              <p className="text-sm text-bliss-500">Revenue optimization by time periods • การเพิ่มประสิทธิภาพรายได้ตามช่วงเวลา</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Peak Hours */}
            <div>
              <h4 className="font-semibold text-bliss-900 mb-4">Peak Hours • ชั่วโมงยอดนิยม</h4>
              <div className="space-y-3">
                {timeBasedRevenueAnalysis.isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="animate-pulse flex items-center gap-3">
                      <div className="bg-bliss-200 w-16 h-6 rounded"></div>
                      <div className="bg-bliss-200 flex-1 h-6 rounded"></div>
                      <div className="bg-bliss-200 w-20 h-6 rounded"></div>
                    </div>
                  ))
                ) : (
                  (timeBasedRevenueAnalysis.data || [])
                    .filter(item => item.analysis_type === 'Peak Hours')
                    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
                    .slice(0, 6)
                    .map((hour, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-bliss-50 rounded-lg">
                        <div className="w-16 text-sm font-semibold text-bliss-700">
                          {hour.time_period}
                        </div>
                        <div className="flex-1">
                          <div className="w-full bg-bliss-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-bliss-500 to-bliss-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(Math.max((hour.performance_score || 0), 10), 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-bliss-900">฿{hour.revenue?.toLocaleString() || 0}</div>
                          <div className="text-xs text-bliss-500">{hour.booking_count || 0} bookings</div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Peak Days */}
            <div>
              <h4 className="font-semibold text-bliss-900 mb-4">Peak Days • วันยอดนิยม</h4>
              <div className="space-y-3">
                {timeBasedRevenueAnalysis.isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="animate-pulse flex items-center gap-3">
                      <div className="bg-bliss-200 w-20 h-6 rounded"></div>
                      <div className="bg-bliss-200 flex-1 h-6 rounded"></div>
                      <div className="bg-bliss-200 w-20 h-6 rounded"></div>
                    </div>
                  ))
                ) : (
                  (timeBasedRevenueAnalysis.data || [])
                    .filter(item => item.analysis_type === 'Peak Days')
                    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))
                    .map((day, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-bliss-50 rounded-lg">
                        <div className="w-20 text-sm font-semibold text-bliss-700">
                          {day.time_period?.trim()}
                        </div>
                        <div className="flex-1">
                          <div className="w-full bg-bliss-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-bliss-500 to-bliss-600 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(Math.max((day.performance_score || 0), 10), 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-bliss-900">฿{day.revenue?.toLocaleString() || 0}</div>
                          <div className="text-xs text-bliss-500">{day.booking_count || 0} bookings</div>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Target Progress */}
      <div className="bg-gradient-to-br from-bliss-500 to-bliss-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8" />
            <div>
              <h4 className="font-semibold text-lg">Target Progress • ความคืบหน้าเป้าหมาย</h4>
              <p className="text-xs opacity-80">
                เป้าหมาย: ฿{((advancedSalesMetrics.data?.net_revenue || 0) - (advancedSalesMetrics.data?.variance_from_forecast || 0)).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">
              {advancedSalesMetrics.isLoading ? (
                <div className="animate-pulse bg-white bg-opacity-20 h-10 w-24 rounded"></div>
              ) : (
                `${(advancedSalesMetrics.data?.target_achievement_percent || 0).toFixed(1)}%`
              )}
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-white bg-opacity-20 rounded-full h-3 mb-3">
          <div
            className="bg-white h-3 rounded-full transition-all"
            style={{ width: `${Math.min(advancedSalesMetrics.data?.target_achievement_percent || 0, 100)}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between text-sm opacity-80">
          <span>
            รายได้ปัจจุบัน: ฿{(advancedSalesMetrics.data?.net_revenue || 0).toLocaleString()}
          </span>
          <span>
            ส่วนต่าง: ฿{(advancedSalesMetrics.data?.variance_from_forecast || 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  )
}

export default SalesSection