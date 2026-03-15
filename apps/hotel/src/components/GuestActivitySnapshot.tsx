import { useQuery } from '@tanstack/react-query'
import { Calendar, Users, TrendingUp, Clock, Star, ArrowRight } from 'lucide-react'
import { supabase } from '@bliss/supabase/auth'
import { useHotelContext } from '../hooks/useHotelContext'

// Types for guest activity data
interface GuestActivity {
  id: string
  guest_name: string
  room_number: string
  service_name: string
  booking_date: string
  booking_time: string
  status: string
  total_amount: number
  duration: number
  service_category: string
}

interface GuestStats {
  totalGuests: number
  totalBookings: number
  averageSpending: number
  popularService: string
  repeatGuests: number
  todayGuests: number
}

// Fetch guest activity data
const fetchGuestActivity = async (hotelId: string): Promise<{ activities: GuestActivity[], stats: GuestStats }> => {
  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Fetch recent activities
  const { data: activitiesData, error: activitiesError } = await supabase
    .from('bookings')
    .select(`
      id,
      hotel_room_number,
      booking_date,
      booking_time,
      status,
      final_price,
      customer_notes,
      created_at,
      services:service_id(name_th, category, duration)
    `)
    .eq('hotel_id', hotelId)
    .gte('booking_date', weekAgo)
    .order('booking_date', { ascending: false })
    .limit(10)

  if (activitiesError) throw new Error(`Failed to fetch activities: ${activitiesError.message}`)

  // Transform activities data
  const activities = (activitiesData || []).map((booking: any) => {
    const guestMatch = booking.customer_notes?.match(/Guest:\s*([^,]+)/)
    const guestName = guestMatch ? guestMatch[1].trim() : 'ไม่ระบุชื่อ'

    return {
      id: booking.id,
      guest_name: guestName,
      room_number: booking.hotel_room_number || 'ไม่ระบุห้อง',
      service_name: booking.services?.name_th || 'ไม่ระบุบริการ',
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      status: booking.status,
      total_amount: booking.final_price || 0,
      duration: booking.services?.duration || 60,
      service_category: booking.services?.category || 'other'
    }
  })

  // Calculate statistics
  const currentMonth = new Date().toISOString().slice(0, 7)

  const { data: statsData, error: statsError } = await supabase
    .from('bookings')
    .select(`
      final_price,
      customer_notes,
      booking_date,
      services:service_id(name_th, category)
    `)
    .eq('hotel_id', hotelId)
    .gte('booking_date', `${currentMonth}-01`)

  if (statsError) throw new Error(`Failed to fetch stats: ${statsError.message}`)

  // Extract guest names and calculate stats
  const guestNames = (statsData || []).map(booking => {
    const match = booking.customer_notes?.match(/Guest:\s*([^,]+)/)
    return match ? match[1].trim() : null
  }).filter(name => name !== null)

  const uniqueGuests = new Set(guestNames)
  const todayGuests = new Set(
    (activitiesData || [])
      .filter(booking => booking.booking_date === today)
      .map(booking => {
        const match = booking.customer_notes?.match(/Guest:\s*([^,]+)/)
        return match ? match[1].trim() : null
      })
      .filter(name => name !== null)
  )

  // Count guest frequency for repeat guests
  const guestFrequency: { [key: string]: number } = {}
  guestNames.forEach(name => {
    if (name) {
      guestFrequency[name] = (guestFrequency[name] || 0) + 1
    }
  })
  const repeatGuests = Object.values(guestFrequency).filter(count => count > 1).length

  // Find popular service
  const serviceCount: { [key: string]: number } = {}
  ;(statsData || []).forEach(booking => {
    const serviceName = booking.services?.name_th
    if (serviceName) {
      serviceCount[serviceName] = (serviceCount[serviceName] || 0) + 1
    }
  })
  const popularService = Object.keys(serviceCount).reduce((a, b) =>
    serviceCount[a] > serviceCount[b] ? a : b, 'ไม่มีข้อมูล'
  )

  const totalRevenue = (statsData || []).reduce((sum, booking) => sum + (booking.final_price || 0), 0)
  const averageSpending = uniqueGuests.size > 0 ? totalRevenue / uniqueGuests.size : 0

  const stats: GuestStats = {
    totalGuests: uniqueGuests.size,
    totalBookings: (statsData || []).length,
    averageSpending: Math.round(averageSpending),
    popularService,
    repeatGuests,
    todayGuests: todayGuests.size
  }

  return { activities, stats }
}

export default function GuestActivitySnapshot() {
  const { hotelId, isValidHotel, isLoading: hotelLoading } = useHotelContext()

  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: ['guest-activity', hotelId],
    queryFn: () => fetchGuestActivity(hotelId!),
    enabled: !hotelLoading && isValidHotel && !!hotelId,
  })

  const { activities = [], stats } = data || {}

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'text-yellow-600 bg-yellow-100',
      confirmed: 'text-blue-600 bg-blue-100',
      'in-progress': 'text-purple-600 bg-purple-100',
      completed: 'text-green-600 bg-green-100',
      cancelled: 'text-red-600 bg-red-100',
    }
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100'
  }

  const getCategoryIcon = (category: string) => {
    const icons = {
      massage: '💆',
      spa: '🧖',
      nail: '💅',
      facial: '✨'
    }
    return icons[category as keyof typeof icons] || '🔧'
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-stone-200 rounded w-48"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-stone-100 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 p-6">
        <p className="text-red-600">เกิดข้อผิดพลาดในการโหลดข้อมูลแขก</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-stone-100">
      {/* Header */}
      <div className="p-6 border-b border-stone-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Guest Activity Snapshot</h2>
              <p className="text-sm text-stone-500">ภาพรวมกิจกรรมแขกในโรงแรม</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600">{stats?.todayGuests || 0}</div>
            <div className="text-xs text-stone-500">แขกวันนี้</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-6 border-b border-stone-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-xl">
            <div className="text-lg font-bold text-green-600">{stats?.totalGuests || 0}</div>
            <div className="text-xs text-green-700">แขกทั้งหมด</div>
            <div className="text-xs text-stone-500">เดือนนี้</div>
          </div>

          <div className="text-center p-3 bg-blue-50 rounded-xl">
            <div className="text-lg font-bold text-blue-600">{stats?.totalBookings || 0}</div>
            <div className="text-xs text-blue-700">การจอง</div>
            <div className="text-xs text-stone-500">ทั้งหมด</div>
          </div>

          <div className="text-center p-3 bg-amber-50 rounded-xl">
            <div className="text-lg font-bold text-amber-600">฿{stats?.averageSpending?.toLocaleString() || 0}</div>
            <div className="text-xs text-amber-700">ค่าใช้จ่ายเฉลี่ย</div>
            <div className="text-xs text-stone-500">ต่อแขก</div>
          </div>

          <div className="text-center p-3 bg-purple-50 rounded-xl">
            <div className="text-lg font-bold text-purple-600">{stats?.repeatGuests || 0}</div>
            <div className="text-xs text-purple-700">ลูกค้าซ้ำ</div>
            <div className="text-xs text-stone-500">เดือนนี้</div>
          </div>
        </div>

        {/* Popular Service */}
        {stats?.popularService && stats.popularService !== 'ไม่มีข้อมูล' && (
          <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800">บริการยอดนิยม:</span>
              <span className="text-sm text-amber-700">{stats.popularService}</span>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activities */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-stone-900">กิจกรรมล่าสุด</h3>
          <div className="text-xs text-stone-500">7 วันที่ผ่านมา</div>
        </div>

        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-8 h-8 mx-auto text-stone-300 mb-2" />
            <p className="text-stone-500">ยังไม่มีกิจกรรม</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition">
                <div className="flex items-center gap-3">
                  <div className="text-lg">
                    {getCategoryIcon(activity.service_category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-stone-900">{activity.guest_name}</span>
                      <span className="text-xs text-stone-500">ห้อง {activity.room_number}</span>
                    </div>
                    <div className="text-sm text-stone-600">{activity.service_name}</div>
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(activity.booking_date).toLocaleDateString('th-TH')}</span>
                      <Clock className="w-3 h-3 ml-2" />
                      <span>{activity.booking_time}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold text-amber-700 mb-1">
                    ฿{activity.total_amount.toLocaleString()}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(activity.status)}`}>
                    {activity.status === 'completed' ? 'เสร็จสิ้น' :
                     activity.status === 'confirmed' ? 'ยืนยันแล้ว' :
                     activity.status === 'in-progress' ? 'กำลังดำเนินการ' :
                     activity.status === 'pending' ? 'รอดำเนินการ' : 'ยกเลิก'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View More Link */}
        {activities.length > 0 && (
          <div className="mt-4 text-center">
            <button className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium">
              ดูประวัติทั้งหมด
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}