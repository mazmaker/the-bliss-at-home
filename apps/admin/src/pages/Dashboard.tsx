import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Users,
  Calendar,
  Building,
  Package,
  DollarSign,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserPlus,
  Briefcase,
} from 'lucide-react'
import { SOSWidget } from '../components/SOSWidget'
import { JobEscalationWidget } from '../components/JobEscalationWidget'
import {
  useDashboardOverview,
  useRecentBookings,
  usePendingApprovals,
  usePopularServices,
  useQuickStats,
} from '../hooks/useDashboard'

// ============================================
// HELPERS
// ============================================

function formatCurrency(amount: number): string {
  return `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(timeStr: string): string {
  return timeStr?.slice(0, 5) || ''
}

function getStatusBadge(status: string) {
  const badges: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-purple-100 text-purple-700',
    pending: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  const labels: Record<string, string> = {
    confirmed: 'ยืนยันแล้ว',
    completed: 'เสร็จสิ้น',
    in_progress: 'กำลังดำเนินการ',
    pending: 'รอดำเนินการ',
    cancelled: 'ยกเลิก',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status] || 'bg-stone-100 text-stone-700'}`}>
      {labels[status] || status}
    </span>
  )
}

function LoadingSkeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-stone-200 rounded ${className}`} />
}

// ============================================
// DASHBOARD
// ============================================

function Dashboard() {
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const overview = useDashboardOverview()
  const recentBookings = useRecentBookings(10)
  const pendingApprovals = usePendingApprovals(5)
  const popularServices = usePopularServices(5)
  const quickStats = useQuickStats()

  // Update timestamp when data refreshes
  useEffect(() => {
    if (overview.dataUpdatedAt) {
      setLastUpdated(new Date(overview.dataUpdatedAt))
    }
  }, [overview.dataUpdatedAt])

  const data = overview.data

  // Stats cards configuration
  const statsCards = [
    {
      name: 'การจองวันนี้',
      nameEn: "Today's Bookings",
      value: data?.todayBookings ?? '-',
      subtitle: `เดือนนี้: ${data?.monthBookings ?? '-'} รายการ`,
      icon: Calendar,
      color: 'from-blue-500 to-blue-600',
    },
    {
      name: 'รายได้วันนี้',
      nameEn: "Today's Revenue",
      value: data ? formatCurrency(data.todayRevenue) : '-',
      subtitle: `เดือนนี้: ${data ? formatCurrency(data.monthRevenue) : '-'}`,
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600',
    },
    {
      name: 'ผู้ใช้ใหม่',
      nameEn: 'New Customers',
      value: data?.newCustomersToday ?? '-',
      subtitle: `เดือนนี้: ${data?.newCustomersMonth ?? '-'} คน (ทั้งหมด ${data?.totalCustomers ?? '-'})`,
      icon: UserPlus,
      color: 'from-pink-500 to-rose-600',
    },
    {
      name: 'พนักงานทั้งหมด',
      nameEn: 'Total Staff',
      value: data?.totalStaff ?? '-',
      subtitle: `ใช้งาน: ${data?.activeStaff ?? '-'} คน`,
      icon: Users,
      color: 'from-purple-500 to-purple-600',
    },
    {
      name: 'โรงแรมทั้งหมด',
      nameEn: 'Total Hotels',
      value: data?.totalHotels ?? '-',
      subtitle: null,
      icon: Building,
      color: 'from-amber-500 to-amber-600',
    },
    {
      name: 'บริการทั้งหมด',
      nameEn: 'Total Services',
      value: data?.totalServices ?? '-',
      subtitle: `ใช้งาน: ${data?.activeServices ?? '-'} รายการ`,
      icon: Briefcase,
      color: 'from-teal-500 to-teal-600',
    },
    {
      name: 'มูลค่าเฉลี่ย/การจอง',
      nameEn: 'Avg. Booking Value',
      value: data ? formatCurrency(data.avgBookingValue) : '-',
      subtitle: 'เฉลี่ยเดือนนี้',
      icon: Package,
      color: 'from-indigo-500 to-indigo-600',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">ภาพรวม</h1>
          <p className="text-stone-500">Dashboard Overview</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-stone-500">
          <Clock className="w-4 h-4" />
          <span>อัปเดตล่าสุด: {lastUpdated.toLocaleString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* SOS Emergency Widget - Highest Priority */}
      <SOSWidget />

      {/* Job Escalation Widget - Unassigned Jobs */}
      <JobEscalationWidget />

      {/* Stats Grid - Row 1: 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.slice(0, 4).map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.name}
              className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100 hover:shadow-xl transition"
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 bg-gradient-to-br ${stat.color} rounded-xl`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-4">
                {overview.isLoading ? (
                  <LoadingSkeleton className="h-8 w-20 mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-stone-900">{stat.value}</p>
                )}
                <p className="text-sm text-stone-500">{stat.name}</p>
                {stat.subtitle && (
                  <p className="text-xs text-stone-400 mt-1">{overview.isLoading ? '' : stat.subtitle}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Stats Grid - Row 2: 3 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statsCards.slice(4).map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.name}
              className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100 hover:shadow-xl transition"
            >
              <div className="flex items-start justify-between">
                <div className={`p-3 bg-gradient-to-br ${stat.color} rounded-xl`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="mt-4">
                {overview.isLoading ? (
                  <LoadingSkeleton className="h-8 w-20 mb-1" />
                ) : (
                  <p className="text-2xl font-bold text-stone-900">{stat.value}</p>
                )}
                <p className="text-sm text-stone-500">{stat.name}</p>
                {stat.subtitle && (
                  <p className="text-xs text-stone-400 mt-1">{overview.isLoading ? '' : stat.subtitle}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">การจองล่าสุด</h2>
              <p className="text-sm text-stone-500">Recent Bookings</p>
            </div>
            <Link
              to="/admin/bookings"
              className="flex items-center gap-1 text-amber-700 hover:text-amber-800 text-sm font-medium transition"
            >
              ดูทั้งหมด
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">รหัส</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">ลูกค้า</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">บริการ</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">วันที่/เวลา</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">จำนวน</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-stone-100">
                      <td className="py-3 px-4"><LoadingSkeleton className="h-4 w-28" /></td>
                      <td className="py-3 px-4"><LoadingSkeleton className="h-4 w-24" /></td>
                      <td className="py-3 px-4"><LoadingSkeleton className="h-4 w-32" /></td>
                      <td className="py-3 px-4"><LoadingSkeleton className="h-4 w-20" /></td>
                      <td className="py-3 px-4"><LoadingSkeleton className="h-4 w-16" /></td>
                      <td className="py-3 px-4"><LoadingSkeleton className="h-4 w-20" /></td>
                    </tr>
                  ))
                ) : recentBookings.data?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-stone-400">ไม่มีข้อมูลการจอง</td>
                  </tr>
                ) : (
                  recentBookings.data?.map((booking) => (
                    <tr key={booking.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="py-3 px-4 text-sm font-medium text-stone-900">{booking.booking_number}</td>
                      <td className="py-3 px-4 text-sm text-stone-600">{booking.customer_name || '-'}</td>
                      <td className="py-3 px-4 text-sm text-stone-600">
                        <div>{booking.service_name || '-'}</div>
                        {booking.hotel_name && (
                          <div className="text-xs text-amber-700">{booking.hotel_name}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-stone-600">
                        <div>{formatDate(booking.booking_date)}</div>
                        <div className="text-xs">{formatTime(booking.booking_time)}</div>
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-stone-900">{formatCurrency(booking.final_price)}</td>
                      <td className="py-3 px-4">{getStatusBadge(booking.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">รออนุมัติ</h2>
              <p className="text-sm text-stone-500">Pending Staff Applications</p>
            </div>
            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
              {pendingApprovals.isLoading ? '...' : pendingApprovals.data?.length || 0}
            </span>
          </div>

          <div className="space-y-4">
            {pendingApprovals.isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 bg-stone-50 rounded-xl">
                  <div className="flex items-center gap-3 mb-3">
                    <LoadingSkeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <LoadingSkeleton className="h-4 w-24" />
                      <LoadingSkeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <LoadingSkeleton className="h-8 w-full" />
                </div>
              ))
            ) : pendingApprovals.data?.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-sm">
                ไม่มีคำขออนุมัติ
              </div>
            ) : (
              pendingApprovals.data?.map((staff) => (
                <div
                  key={staff.id}
                  className="p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-800 rounded-full flex items-center justify-center text-white font-semibold">
                        {staff.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-stone-900">{staff.full_name}</p>
                        <p className="text-sm text-stone-500">{staff.skills?.join(', ') || '-'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span>ประสบการณ์ {staff.experience_years} ปี</span>
                    <span>สมัคร {staff.application_date ? formatDate(staff.application_date) : '-'}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <Link
            to="/admin/staff"
            className="mt-4 w-full flex items-center justify-center gap-1 py-2 text-amber-700 hover:text-amber-800 text-sm font-medium border border-amber-200 rounded-xl hover:bg-amber-50 transition"
          >
            ดูทั้งหมด
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Popular Services */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">บริการยอดนิยม</h2>
            <p className="text-sm text-stone-500">Popular Services This Month</p>
          </div>
          <Link
            to="/admin/services"
            className="flex items-center gap-1 text-amber-700 hover:text-amber-800 text-sm font-medium transition"
          >
            จัดการบริการ
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {popularServices.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 bg-stone-50 rounded-xl">
                <LoadingSkeleton className="h-6 w-6 rounded-full mb-3" />
                <LoadingSkeleton className="h-4 w-full mb-2" />
                <LoadingSkeleton className="h-3 w-20 mb-1" />
                <LoadingSkeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : popularServices.data?.length === 0 ? (
          <div className="py-8 text-center text-stone-400 text-sm">
            ไม่มีข้อมูลบริการเดือนนี้
          </div>
        ) : (
          <div className={`grid grid-cols-1 gap-4 ${
            (popularServices.data?.length || 0) >= 5 ? 'md:grid-cols-5' :
            (popularServices.data?.length || 0) >= 3 ? 'md:grid-cols-3' :
            'md:grid-cols-2'
          }`}>
            {popularServices.data?.map((service, index) => (
              <div
                key={service.service_id}
                className="p-4 bg-gradient-to-br from-stone-50 to-amber-50 rounded-xl border border-stone-100"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-6 h-6 bg-gradient-to-r from-amber-700 to-amber-800 rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {index + 1}
                  </span>
                  <Package className="w-4 h-4 text-amber-700" />
                </div>
                <p className="font-medium text-stone-900 text-sm mb-2">{service.name}</p>
                <div className="space-y-1 text-xs text-stone-500">
                  <div className="flex justify-between">
                    <span>การจอง:</span>
                    <span className="font-medium text-stone-700">{service.bookings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>รายได้:</span>
                    <span className="font-medium text-stone-900">{formatCurrency(service.revenue)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              {quickStats.isLoading ? (
                <LoadingSkeleton className="h-8 w-12 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-stone-900">{quickStats.data?.completedToday ?? 0}</p>
              )}
              <p className="text-sm text-stone-500">การจองสำเร็จวันนี้</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              {quickStats.isLoading ? (
                <LoadingSkeleton className="h-8 w-12 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-stone-900">{quickStats.data?.pendingToday ?? 0}</p>
              )}
              <p className="text-sm text-stone-500">รอดำเนินการวันนี้</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              {quickStats.isLoading ? (
                <LoadingSkeleton className="h-8 w-12 mb-1" />
              ) : (
                <p className="text-2xl font-bold text-stone-900">{quickStats.data?.cancelledToday ?? 0}</p>
              )}
              <p className="text-sm text-stone-500">การยกเลิกวันนี้</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
