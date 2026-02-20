import { useState } from 'react'
import {
  Users,
  TrendingUp,
  DollarSign,
  Award,
  Clock,
  Star,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Trophy,
  Target,
  Zap
} from 'lucide-react'
import {
  useStaffOverview,
  useStaffPerformance,
  useStaffEarnings,
  useStaffRankings
} from '../../hooks/useAnalytics'

interface StaffReportsProps {
  selectedPeriod: 'daily' | 'weekly' | 'month' | '3_months' | '6_months' | 'year'
}

function StaffReports({ selectedPeriod }: StaffReportsProps) {
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'bookings' | 'rating' | 'completion_rate'>('revenue')
  const [showPerformanceDetails, setShowPerformanceDetails] = useState(false)

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
  const staffRankings = useStaffRankings(selectedMetric, days, 5)

  const isLoading = staffOverview.isLoading || staffPerformance.isLoading || staffEarnings.isLoading
  const isError = staffOverview.isError || staffPerformance.isError || staffEarnings.isError

  if (isError) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-stone-100">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold text-stone-900 mb-2">ไม่สามารถโหลดข้อมูลพนักงานได้</h2>
          <p className="text-stone-500 mb-6">กรุณาลองใหม่อีกครั้งหรือติดต่อผู้ดูแลระบบ</p>
          <button
            onClick={() => {
              staffOverview.refetch()
              staffPerformance.refetch()
              staffEarnings.refetch()
              staffRankings.refetch()
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition"
          >
            <RefreshCw className="w-5 h-5" />
            ลองใหม่
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Staff Overview Cards */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
        <h2 className="text-lg font-semibold text-stone-900 mb-6">ภาพรวมพนักงาน</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-[#d29b25] to-[#c08a20] rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">พนักงานทั้งหมด</p>
                <p className="text-3xl font-bold mt-2">
                  {isLoading ? '...' : (staffOverview.data?.totalStaff || 0)}
                </p>
                <p className="text-sm opacity-90 mt-2">
                  {isLoading ? '...' : `ใช้งานอยู่ ${staffOverview.data?.activeStaff || 0} คน`}
                </p>
              </div>
              <Users className="w-12 h-12 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#b6d387] to-[#9bc470] rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">รายได้พนักงานรวม</p>
                <p className="text-3xl font-bold mt-2">
                  {isLoading ? '...' : `฿${(staffOverview.data?.totalEarnings || 0).toLocaleString()}`}
                </p>
                <p className="text-sm opacity-90 mt-2">
                  {isLoading ? '...' : `เฉลี่ย ฿${Math.round(staffOverview.data?.avgEarningsPerStaff || 0).toLocaleString()}/คน`}
                </p>
              </div>
              <DollarSign className="w-12 h-12 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#ffe79d] to-[#ffd773] rounded-2xl shadow-lg p-6 text-stone-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-70">งานที่ทำสำเร็จ</p>
                <p className="text-3xl font-bold mt-2">
                  {isLoading ? '...' : (staffOverview.data?.totalBookingsHandled || 0).toLocaleString()}
                </p>
                <p className="text-sm opacity-70 mt-2">งานทั้งหมด</p>
              </div>
              <Target className="w-12 h-12 text-stone-700 opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#d29b25] to-[#b8841f] rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">คะแนนเฉลี่ย</p>
                <p className="text-3xl font-bold mt-2">
                  {isLoading ? '...' : (staffOverview.data?.avgRating || 0).toFixed(1)}
                </p>
                <p className="text-sm opacity-90 mt-2">จาก 5.0 ดาว</p>
              </div>
              <Star className="w-12 h-12 opacity-80" />
            </div>
          </div>
        </div>
      </div>

      {/* Staff Rankings */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-stone-900">อันดับพนักงาน</h2>
          <select
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as any)}
          >
            <option value="revenue">รายได้</option>
            <option value="bookings">จำนวนงาน</option>
            <option value="rating">คะแนนรีวิว</option>
            <option value="completion_rate">อัตราความสำเร็จ</option>
          </select>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-stone-50 rounded-xl animate-pulse">
                <div className="w-12 h-12 bg-stone-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="w-32 h-4 bg-stone-200 rounded mb-2"></div>
                  <div className="w-24 h-3 bg-stone-200 rounded"></div>
                </div>
                <div className="w-16 h-8 bg-stone-200 rounded"></div>
              </div>
            ))
          ) : (
            (staffRankings.data || []).map((staff) => (
              <div key={staff.staff_id} className="flex items-center gap-4 p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                    staff.rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                    staff.rank === 2 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                    staff.rank === 3 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
                    'bg-gradient-to-r from-stone-400 to-stone-500'
                  }`}>
                    {staff.rank}
                  </div>
                  {staff.badge && (
                    <div className="absolute -top-1 -right-1">
                      {staff.badge === 'top_performer' && <Trophy className="w-5 h-5 text-yellow-500" />}
                      {staff.badge === 'rising_star' && <TrendingUp className="w-5 h-5 text-green-500" />}
                      {staff.badge === 'customer_favorite' && <Star className="w-5 h-5 text-pink-500" />}
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-stone-900">{staff.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-stone-500">
                    <span>
                      {selectedMetric === 'revenue' && `฿${staff.metric_value.toLocaleString()}`}
                      {selectedMetric === 'bookings' && `${staff.metric_value} งาน`}
                      {selectedMetric === 'rating' && `${staff.metric_value.toFixed(1)} ดาว`}
                      {selectedMetric === 'completion_rate' && `${staff.metric_value}%`}
                    </span>
                    {staff.improvement !== undefined && staff.improvement !== 0 && (
                      <span className={`flex items-center gap-1 ${staff.improvement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        <TrendingUp className={`w-3 h-3 ${staff.improvement < 0 ? 'rotate-180' : ''}`} />
                        {Math.abs(staff.improvement).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Staff Performance Table */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-stone-900">รายละเอียดผลการปฏิบัติงาน</h2>
          <button
            onClick={() => setShowPerformanceDetails(!showPerformanceDetails)}
            className="flex items-center gap-2 text-sm text-amber-600 hover:text-amber-700"
          >
            {showPerformanceDetails ? 'ซ่อนรายละเอียด' : 'แสดงรายละเอียด'}
            <ChevronDown className={`w-4 h-4 transform transition ${showPerformanceDetails ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">ชื่อ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">งานสำเร็จ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">รายได้</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">คะแนน</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">อัตราสำเร็จ</th>
                {showPerformanceDetails && (
                  <>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">ความตรงต่อเวลา</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">ความเชี่ยวชาญ</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className="border-b border-stone-100">
                    <td className="py-3 px-4"><div className="w-32 h-4 bg-stone-200 rounded animate-pulse"></div></td>
                    <td className="py-3 px-4"><div className="w-16 h-4 bg-stone-200 rounded animate-pulse"></div></td>
                    <td className="py-3 px-4"><div className="w-20 h-4 bg-stone-200 rounded animate-pulse"></div></td>
                    <td className="py-3 px-4"><div className="w-12 h-4 bg-stone-200 rounded animate-pulse"></div></td>
                    <td className="py-3 px-4"><div className="w-16 h-4 bg-stone-200 rounded animate-pulse"></div></td>
                    {showPerformanceDetails && (
                      <>
                        <td className="py-3 px-4"><div className="w-16 h-4 bg-stone-200 rounded animate-pulse"></div></td>
                        <td className="py-3 px-4"><div className="w-24 h-4 bg-stone-200 rounded animate-pulse"></div></td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                (staffPerformance.data || []).slice(0, 10).map((staff) => (
                  <tr key={staff.staff_id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium text-stone-900">{staff.name}</div>
                        <div className="text-xs text-stone-500">{staff.email}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-stone-600">
                      {staff.bookings_completed}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-green-600">
                      ฿{staff.base_earnings.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-medium text-stone-700">
                          {staff.avg_rating.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${staff.completion_rate >= 95 ? 'bg-green-500' : staff.completion_rate >= 80 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                        <span className="text-sm text-stone-600">{staff.completion_rate}%</span>
                      </div>
                    </td>
                    {showPerformanceDetails && (
                      <>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-stone-400" />
                            <span className="text-sm text-stone-600">{staff.punctuality_score}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {staff.specializations.slice(0, 2).map((spec) => (
                              <span key={spec} className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">
                                {spec}
                              </span>
                            ))}
                            {staff.specializations.length > 2 && (
                              <span className="px-2 py-1 bg-stone-100 text-stone-600 text-xs rounded-full">
                                +{staff.specializations.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
              {!isLoading && (!staffPerformance.data || staffPerformance.data.length === 0) && (
                <tr>
                  <td colSpan={showPerformanceDetails ? 7 : 5} className="py-8 text-center text-stone-500">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>ไม่มีข้อมูลพนักงานในช่วงเวลานี้</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Earnings Summary */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
        <h2 className="text-lg font-semibold text-stone-900 mb-6">สรุปรายได้พนักงาน</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                <div className="w-24 h-6 bg-stone-200 rounded mb-3 animate-pulse"></div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="w-16 h-4 bg-stone-200 rounded animate-pulse"></div>
                    <div className="w-12 h-4 bg-stone-200 rounded animate-pulse"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="w-12 h-4 bg-stone-200 rounded animate-pulse"></div>
                    <div className="w-16 h-4 bg-stone-200 rounded animate-pulse"></div>
                  </div>
                  <div className="flex justify-between">
                    <div className="w-20 h-4 bg-stone-200 rounded animate-pulse"></div>
                    <div className="w-20 h-4 bg-stone-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            (staffEarnings.data || []).slice(0, 6).map((staff) => (
              <div key={staff.staff_id} className="p-4 bg-stone-50 rounded-xl border border-stone-100">
                <h3 className="font-semibold text-stone-900 mb-3">{staff.name}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-stone-500">รายได้พื้นฐาน:</span>
                    <span className="font-medium text-stone-700">฿{staff.base_earnings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-stone-200 pt-2">
                    <span className="text-stone-500">รวม:</span>
                    <span className="font-bold text-green-700">฿{staff.total_earnings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400 text-xs">สุทธิ:</span>
                    <span className="font-medium text-stone-700 text-xs">฿{staff.net_earnings.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

export default StaffReports