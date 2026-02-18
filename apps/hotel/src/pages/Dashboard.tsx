import { Link } from 'react-router-dom'
import { Calendar, Clock, DollarSign, TrendingUp, Users, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@bliss/supabase/auth'
import { useHotelContext } from '../hooks/useHotelContext'
import { getMonthlyBillStatus, formatOverdueMessage } from '../utils/overdueCalculator'

// Types for dashboard data
interface DashboardStats {
  todayBookings: number
  monthlyRevenue: number
  totalGuests: number
  pendingPayments: number
}

interface RecentBooking {
  id: string
  guest_name: string
  room_number: string
  service_name: string
  scheduled_time: string
  staff_name: string | null
  status: string
  total_amount: number
}

// Fetch dashboard stats from database
const fetchDashboardStats = async (hotelId: string): Promise<DashboardStats> => {
  const today = new Date().toISOString().split('T')[0]
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format

  // Today's bookings count
  const { count: todayCount, error: todayError } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('hotel_id', hotelId)
    .gte('booking_date', today)
    .lt('booking_date', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0])

  if (todayError) throw new Error(`Failed to fetch today's bookings: ${todayError.message}`)

  // Monthly revenue
  const { data: monthlyData, error: monthlyError } = await supabase
    .from('bookings')
    .select('final_price, payment_status')
    .eq('hotel_id', hotelId)
    .gte('booking_date', `${currentMonth}-01`)
    .lt('booking_date', `${new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 7)}-01`)
    .in('status', ['completed', 'confirmed'])

  if (monthlyError) throw new Error(`Failed to fetch monthly revenue: ${monthlyError.message}`)

  const monthlyRevenue = monthlyData?.reduce((sum, booking) =>
    booking.payment_status === 'paid' ? sum + (booking.final_price || 0) : sum, 0
  ) || 0

  // Unique guests this month
  const { data: guestsData, error: guestsError } = await supabase
    .from('bookings')
    .select('customer_notes')
    .eq('hotel_id', hotelId)
    .gte('booking_date', `${currentMonth}-01`)
    .lt('booking_date', `${new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().slice(0, 7)}-01`)

  if (guestsError) throw new Error(`Failed to fetch guests data: ${guestsError.message}`)

  // Extract unique guest names from customer_notes
  const guestNames = guestsData?.map(booking => {
    const match = booking.customer_notes?.match(/Guest:\s*([^,]+)/)
    return match ? match[1].trim() : null
  }).filter(name => name !== null) || []

  const uniqueGuests = new Set(guestNames).size

  // Pending payments
  const { data: pendingData, error: pendingError } = await supabase
    .from('bookings')
    .select('final_price')
    .eq('hotel_id', hotelId)
    .eq('payment_status', 'pending')
    .in('status', ['confirmed', 'completed'])

  if (pendingError) throw new Error(`Failed to fetch pending payments: ${pendingError.message}`)

  const pendingPayments = pendingData?.reduce((sum, booking) => sum + (booking.final_price || 0), 0) || 0

  return {
    todayBookings: todayCount || 0,
    monthlyRevenue,
    totalGuests: uniqueGuests,
    pendingPayments
  }
}

// Fetch recent bookings
const fetchRecentBookings = async (hotelId: string): Promise<RecentBooking[]> => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      hotel_room_number,
      booking_time,
      status,
      final_price,
      customer_notes,
      created_at,
      services:service_id(name_th),
      staff:staff_id(name_th)
    `)
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })
    .limit(4)

  if (error) {
    throw new Error(`Failed to fetch recent bookings: ${error.message}`)
  }

  // Transform data to match interface
  const transformedData = (data || []).map((booking: any) => {
    // Extract guest name from customer_notes (format: "Guest: name, Phone: xxx, Notes: xxx")
    const guestMatch = booking.customer_notes?.match(/Guest:\s*([^,]+)/)
    const guestName = guestMatch ? guestMatch[1].trim() : 'ไม่ระบุชื่อ'

    return {
      id: booking.id,
      guest_name: guestName,
      room_number: booking.hotel_room_number || 'ไม่ระบุห้อง',
      service_name: booking.services?.name_th || 'ไม่ระบุบริการ',
      scheduled_time: booking.booking_time,
      staff_name: booking.staff?.name_th || null,
      status: booking.status,
      total_amount: booking.final_price
    }
  })

  return transformedData
}

function Dashboard() {
  const { hotelId, isValidHotel, isLoading: hotelLoading } = useHotelContext()

  // Fetch dashboard stats
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['dashboard-stats', hotelId],
    queryFn: () => fetchDashboardStats(hotelId!),
    enabled: !hotelLoading && isValidHotel && !!hotelId,
  })

  // Fetch recent bookings
  const {
    data: recentBookings = [],
    isLoading: bookingsLoading,
    error: bookingsError,
    refetch: refetchBookings
  } = useQuery({
    queryKey: ['dashboard-bookings', hotelId],
    queryFn: () => fetchRecentBookings(hotelId!),
    enabled: !hotelLoading && isValidHotel && !!hotelId,
  })

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      'in-progress': 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    const labels = {
      pending: 'รอดำเนินการ',
      confirmed: 'ยืนยันแล้ว',
      'in-progress': 'กำลังดำเนินการ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  // Show loading state
  if (hotelLoading || statsLoading || bookingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-700 mx-auto mb-2" />
          <p className="text-stone-600">กำลังโหลดข้อมูล Dashboard...</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (statsError || bookingsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-red-600 mb-4">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
          <button
            onClick={() => {
              refetchStats()
              refetchBookings()
            }}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            ลองใหม่
          </button>
        </div>
      </div>
    )
  }

  // Calculate overdue status for pending payments
  const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
  const previousMonth = new Date()
  previousMonth.setMonth(previousMonth.getMonth() - 1)
  const prevMonthStr = previousMonth.toISOString().slice(0, 7)

  // Calculate overdue status for the most recent completed month
  const overdueStatus = getMonthlyBillStatus(prevMonthStr)
  const overdueMessage = formatOverdueMessage(overdueStatus, stats?.pendingPayments || 0)

  // Stats data for display
  const statsData = [
    {
      name: 'การจองวันนี้',
      value: stats?.todayBookings?.toString() || '0',
      change: stats?.todayBookings ? '+' + stats.todayBookings : '0',
      trend: 'up' as const,
      icon: Calendar
    },
    {
      name: 'รายได้เดือนนี้',
      value: `฿${stats?.monthlyRevenue?.toLocaleString() || '0'}`,
      change: '+12.5%',
      trend: 'up' as const,
      icon: DollarSign
    },
    {
      name: 'แขกที่ใช้บริการ',
      value: stats?.totalGuests?.toString() || '0',
      change: `+${stats?.totalGuests || 0}`,
      trend: 'up' as const,
      icon: Users
    },
    {
      name: 'บิลค้างชำระ',
      value: `฿${stats?.pendingPayments?.toLocaleString() || '0'}`,
      change: overdueStatus.message,
      trend: overdueStatus.level === 'CURRENT' || overdueStatus.level === 'DUE_SOON' ? 'neutral' as const : 'warning' as const,
      icon: AlertCircle,
      // Add overdue-specific styling
      overdueStatus: overdueStatus,
      isOverdue: overdueStatus.actionRequired
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">ภาพรวม</h1>
        <p className="text-stone-500">Dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat) => {
          const Icon = stat.icon

          // Special styling for overdue bills
          const isOverdueBill = stat.name === 'บิลค้างชำระ' && (stat as any).overdueStatus
          const overdueData = isOverdueBill ? (stat as any).overdueStatus : null

          // Determine colors based on overdue status or regular trend
          const getColors = () => {
            if (isOverdueBill && overdueData) {
              return {
                bgColor: overdueData.bgColor,
                textColor: overdueData.textColor,
                icon: overdueData.icon
              }
            }

            // Regular stat colors
            return {
              bgColor: stat.trend === 'up' ? 'bg-green-100' :
                       stat.trend === 'down' ? 'bg-red-100' :
                       stat.trend === 'warning' ? 'bg-red-100' :
                       'bg-amber-100',
              textColor: stat.trend === 'up' ? 'text-green-600' :
                        stat.trend === 'down' ? 'text-red-600' :
                        stat.trend === 'warning' ? 'text-red-600' :
                        'text-amber-600',
              icon: null
            }
          }

          const colors = getColors()

          return (
            <div key={stat.name} className={`bg-white rounded-2xl shadow-lg p-6 border ${
              isOverdueBill && overdueData?.level === 'URGENT' ? 'border-red-300 ring-2 ring-red-100' :
              isOverdueBill && overdueData?.level === 'WARNING' ? 'border-orange-300' :
              'border-stone-100'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${colors.bgColor}`}>
                  <Icon className={`w-6 h-6 ${colors.textColor}`} />
                </div>

                {/* Show overdue status with icon */}
                {isOverdueBill && overdueData ? (
                  <div className="text-right">
                    <div className={`flex items-center gap-1 ${colors.textColor} text-sm font-medium`}>
                      <span>{colors.icon}</span>
                      <span>{stat.change}</span>
                    </div>
                    {overdueData.actionRequired && (
                      <div className="text-xs text-red-600 mt-1">
                        ต้องติดตาม
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {stat.trend === 'up' && (
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-medium">{stat.change}</span>
                      </div>
                    )}
                    {stat.trend === 'neutral' && (
                      <span className="text-sm text-amber-600 font-medium">{stat.change}</span>
                    )}
                  </>
                )}
              </div>
              <p className="text-2xl font-bold text-stone-900">{stat.value}</p>
              <p className="text-sm text-stone-500">{stat.name}</p>

              {/* Show additional overdue info */}
              {isOverdueBill && overdueData && overdueData.actionRequired && (
                <div className={`mt-3 text-xs ${colors.textColor} bg-opacity-20 p-2 rounded-lg ${colors.bgColor}`}>
                  {overdueData.level === 'URGENT' ? '🚨 ติดต่อด่วนมาก' :
                   overdueData.level === 'WARNING' ? '⚠️ ควรติดตาม' :
                   '📋 ติดตามการชำระ'}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Quick Action */}
      <div className="max-w-md">
        <Link
          to="history"
          className="block bg-gradient-to-br from-amber-700 to-amber-800 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">ดูการจองทั้งหมด</h3>
              <p className="text-sm opacity-90">View All Bookings</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl group-hover:bg-white/30 transition">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100">
        <div className="p-6 border-b border-stone-100">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-stone-900">การจองล่าสุด</h2>
            <Link
              to="history"
              className="text-amber-600 hover:text-amber-700 text-sm font-medium"
            >
              ดูทั้งหมด
            </Link>
          </div>
        </div>
        <div className="p-6">
          {recentBookings.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>ยังไม่มีการจอง</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-medium text-stone-900">{booking.guest_name}</p>
                      <span className="text-stone-400">•</span>
                      <p className="text-sm text-stone-600">ห้อง {booking.room_number}</p>
                    </div>
                    <p className="text-sm text-stone-600 mb-1">{booking.service_name}</p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1 text-xs text-stone-500">
                        <Clock className="w-3 h-3" />
                        {new Date(booking.scheduled_time).toLocaleTimeString('th-TH', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      {booking.staff_name && (
                        <div className="flex items-center gap-1 text-xs text-stone-500">
                          <Users className="w-3 h-3" />
                          {booking.staff_name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(booking.status)}
                    <p className="text-lg font-bold text-amber-700">฿{booking.total_amount}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard