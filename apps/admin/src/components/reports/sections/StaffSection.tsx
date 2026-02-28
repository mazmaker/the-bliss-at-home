import { useState, useRef, useEffect } from 'react'
import {
  Download,
  FileText,
  Table,
  ChevronDown,
  Info,
  Users,
  DollarSign,
  Clock,
  Star,
  Trophy,
  Target,
  Wallet,
  Calendar,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Zap
} from 'lucide-react'
import StaffReports from '../StaffReports'
import { useStaffOverview, useStaffPerformance, useStaffEarnings, useStaffRankings } from '../../../hooks/useAnalytics'
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
  const staffRankings = useStaffRankings('revenue', days, 10)

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

      {/* Provider Performance Analytics */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-6 border-b border-indigo-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-lg flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-stone-900">🏆 ประสิทธิภาพผู้ให้บริการ • Provider Performance</h3>
              <p className="text-sm text-stone-500">Individual provider metrics and rankings • ตัวชี้วัดผู้ให้บริการรายบุคคล</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Top Performers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {staffRankings.isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="bg-stone-200 h-24 rounded-lg mb-3"></div>
                  <div className="bg-stone-200 h-4 w-32 rounded mb-2"></div>
                  <div className="bg-stone-200 h-3 w-24 rounded"></div>
                </div>
              ))
            ) : (
              (staffRankings.data || []).slice(0, 3).map((staff, index) => {
                const rankColors = [
                  'from-yellow-400 to-yellow-500', // Gold
                  'from-gray-400 to-gray-500', // Silver
                  'from-orange-400 to-orange-500' // Bronze
                ]
                const bgColor = rankColors[index] || 'from-blue-400 to-blue-500'
                const medalIcons = ['🥇', '🥈', '🥉']

                return (
                  <div key={index} className="relative">
                    <div className={`bg-gradient-to-br ${bgColor} rounded-2xl p-6 text-white relative overflow-hidden`}>
                      <div className="absolute top-2 right-2 text-2xl">{medalIcons[index] || '🏅'}</div>
                      <div className="absolute bottom-0 right-0 w-20 h-20 bg-white opacity-10 rounded-full transform translate-x-8 translate-y-8"></div>

                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                            <UserCheck className="w-6 h-6" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-lg">{staff.staffName || 'Unknown Staff'}</h4>
                            <p className="text-xs opacity-90">Rank #{index + 1}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="opacity-90">Revenue:</span>
                            <span className="font-bold">฿{(staff.totalRevenue || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="opacity-90">Jobs:</span>
                            <span className="font-bold">{staff.totalBookings || 0}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="opacity-90">Rating:</span>
                            <span className="font-bold flex items-center gap-1">
                              <Star className="w-3 h-3 fill-current" />
                              {(staff.avgRating || 0).toFixed(1)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="opacity-90">Completion:</span>
                            <span className="font-bold">{(staff.completionRate || 0).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Detailed Performance Table */}
          <div className="bg-stone-50 rounded-xl p-6">
            <h4 className="font-semibold text-stone-900 mb-4">📊 ตารางประสิทธิภาพโดยละเอียด • Detailed Performance Table</h4>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-200 text-left">
                    <th className="pb-3 text-sm font-semibold text-stone-700">Provider Name</th>
                    <th className="pb-3 text-sm font-semibold text-stone-700 text-right">Revenue</th>
                    <th className="pb-3 text-sm font-semibold text-stone-700 text-center">Bookings</th>
                    <th className="pb-3 text-sm font-semibold text-stone-700 text-center">Rating</th>
                    <th className="pb-3 text-sm font-semibold text-stone-700 text-center">Completion %</th>
                    <th className="pb-3 text-sm font-semibold text-stone-700 text-center">Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {staffPerformance.isLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <tr key={index} className="border-b border-stone-100">
                        <td className="py-3">
                          <div className="animate-pulse bg-stone-200 h-4 w-32 rounded"></div>
                        </td>
                        <td className="py-3 text-right">
                          <div className="animate-pulse bg-stone-200 h-4 w-20 rounded ml-auto"></div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="animate-pulse bg-stone-200 h-4 w-12 rounded mx-auto"></div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="animate-pulse bg-stone-200 h-4 w-16 rounded mx-auto"></div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="animate-pulse bg-stone-200 h-4 w-12 rounded mx-auto"></div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="animate-pulse bg-stone-200 h-4 w-16 rounded mx-auto"></div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    (staffPerformance.data || []).map((staff, index) => (
                      <tr key={index} className="border-b border-stone-100 hover:bg-white transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {staff.staffName?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div className="font-medium text-stone-900">{staff.staffName || 'Unknown Staff'}</div>
                              <div className="text-xs text-stone-500">ID: {staff.staffId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <span className="font-bold text-stone-900">฿{(staff.totalRevenue || 0).toLocaleString()}</span>
                        </td>
                        <td className="py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            <Target className="w-3 h-3" />
                            {staff.totalBookings || 0}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            <span className="font-semibold text-stone-900">{(staff.avgRating || 0).toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center">
                            <div className="w-16 bg-stone-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                                style={{ width: `${Math.max(staff.completionRate || 0, 5)}%` }}
                              ></div>
                            </div>
                            <span className="ml-2 text-xs font-semibold text-stone-700">{(staff.completionRate || 0).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <div className={`flex items-center justify-center gap-1 ${
                            (staff.earningsGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {(staff.earningsGrowth || 0) >= 0 ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            <span className="text-xs font-semibold">{Math.abs(staff.earningsGrowth || 0).toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details & Financial Tracking */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 p-6 border-b border-emerald-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-stone-900">💳 รายละเอียดการชำระเงิน • Payment Details</h3>
              <p className="text-sm text-stone-500">Staff earnings and payment tracking • ติดตามรายได้และการชำระเงินพนักงาน</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Payment Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle className="w-6 h-6" />
                <span className="text-sm font-medium">Paid</span>
              </div>
              <div className="text-2xl font-bold mb-1">
                {staffEarnings.isLoading ? (
                  <div className="animate-pulse bg-white bg-opacity-20 h-6 w-20 rounded"></div>
                ) : (
                  `฿${(staffEarnings.data?.totalPaid || 0).toLocaleString()}`
                )}
              </div>
              <div className="text-xs opacity-80">Completed payments</div>
            </div>

            <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <Clock className="w-6 h-6" />
                <span className="text-sm font-medium">Pending</span>
              </div>
              <div className="text-2xl font-bold mb-1">
                {staffEarnings.isLoading ? (
                  <div className="animate-pulse bg-white bg-opacity-20 h-6 w-20 rounded"></div>
                ) : (
                  `฿${(staffEarnings.data?.totalPending || 0).toLocaleString()}`
                )}
              </div>
              <div className="text-xs opacity-80">Awaiting payment</div>
            </div>

            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <DollarSign className="w-6 h-6" />
                <span className="text-sm font-medium">Commission</span>
              </div>
              <div className="text-2xl font-bold mb-1">
                {staffEarnings.isLoading ? (
                  <div className="animate-pulse bg-white bg-opacity-20 h-6 w-20 rounded"></div>
                ) : (
                  `฿${(staffEarnings.data?.totalCommission || 0).toLocaleString()}`
                )}
              </div>
              <div className="text-xs opacity-80">Platform fees</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-6 h-6" />
                <span className="text-sm font-medium">Net Earnings</span>
              </div>
              <div className="text-2xl font-bold mb-1">
                {staffEarnings.isLoading ? (
                  <div className="animate-pulse bg-white bg-opacity-20 h-6 w-20 rounded"></div>
                ) : (
                  `฿${(staffEarnings.data?.totalNetEarnings || 0).toLocaleString()}`
                )}
              </div>
              <div className="text-xs opacity-80">After deductions</div>
            </div>
          </div>

          {/* Payment Status Table */}
          <div className="bg-stone-50 rounded-xl p-6">
            <h4 className="font-semibold text-stone-900 mb-4">📋 สถานะการชำระเงิน • Payment Status</h4>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-200 text-left">
                    <th className="pb-3 text-sm font-semibold text-stone-700">Staff Member</th>
                    <th className="pb-3 text-sm font-semibold text-stone-700 text-right">Gross Earnings</th>
                    <th className="pb-3 text-sm font-semibold text-stone-700 text-right">Commission</th>
                    <th className="pb-3 text-sm font-semibold text-stone-700 text-right">Net Earnings</th>
                    <th className="pb-3 text-sm font-semibold text-stone-700 text-center">Status</th>
                    <th className="pb-3 text-sm font-semibold text-stone-700 text-center">Next Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {staffEarnings.isLoading ? (
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
                      </tr>
                    ))
                  ) : (
                    (staffEarnings.data?.staffBreakdown || []).map((staff, index) => (
                      <tr key={index} className="border-b border-stone-100 hover:bg-white transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {staff.staffName?.charAt(0) || '?'}
                            </div>
                            <div>
                              <div className="font-medium text-stone-900">{staff.staffName || 'Unknown Staff'}</div>
                              <div className="text-xs text-stone-500">{staff.bookingsCount || 0} bookings</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <span className="font-bold text-stone-900">฿{(staff.grossEarnings || 0).toLocaleString()}</span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-red-600 font-semibold">-฿{(staff.commission || 0).toLocaleString()}</span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="font-bold text-green-600">฿{(staff.netEarnings || 0).toLocaleString()}</span>
                        </td>
                        <td className="py-3 text-center">
                          {staff.paymentStatus === 'paid' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Paid
                            </span>
                          ) : staff.paymentStatus === 'pending' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                              <XCircle className="w-3 h-3" />
                              Overdue
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Calendar className="w-3 h-3 text-stone-400" />
                            <span className="text-xs text-stone-600">
                              {staff.nextPaymentDate || 'TBD'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default StaffSection