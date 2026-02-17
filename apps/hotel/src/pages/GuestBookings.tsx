import { useState, useMemo } from 'react'
import { Search, Filter, Eye, MapPin, Calendar, Clock, User, Loader2, AlertCircle, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@bliss/supabase/auth'
import { useHotelContext } from '../hooks/useHotelContext'

// Guest booking interface
interface GuestBooking {
  id: string
  guest_name: string
  room_number: string
  service_name: string
  scheduled_date: string
  scheduled_time: string
  staff_name: string | null
  total_amount: number
  status: string
  payment_status: string
  special_instructions?: string | null
  created_at: string
}

// Fetch current guest bookings from database
const fetchGuestBookings = async (hotelId: string): Promise<GuestBooking[]> => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      hotel_room_number,
      booking_date,
      booking_time,
      final_price,
      status,
      payment_status,
      customer_notes,
      created_at,
      customers:customer_id(full_name),
      services:service_id(name_th),
      staff:staff_id(name_th)
    `)
    .eq('hotel_id', hotelId)
    .in('status', ['pending', 'confirmed', 'in-progress']) // Active bookings only
    .order('booking_date', { ascending: true })
    .order('booking_time', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch guest bookings: ${error.message}`)
  }

  // Transform data to match interface
  const transformedData = (data || []).map((booking: any) => ({
    id: booking.id,
    guest_name: booking.customers?.full_name || 'ไม่ระบุชื่อ',
    room_number: booking.hotel_room_number || 'ไม่ระบุห้อง',
    service_name: booking.services?.name_th || 'ไม่ระบุบริการ',
    scheduled_date: booking.booking_date,
    scheduled_time: booking.booking_time,
    staff_name: booking.staff?.name_th || null,
    total_amount: booking.final_price,
    status: booking.status,
    payment_status: booking.payment_status,
    special_instructions: booking.customer_notes,
    created_at: booking.created_at
  }))

  return transformedData
}

function GuestBookings() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'in-progress'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [selectedBooking, setSelectedBooking] = useState<GuestBooking | null>(null)

  const { hotelId, isValidHotel, isLoading: hotelLoading } = useHotelContext()

  // Fetch guest bookings
  const {
    data: bookings = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['guest-bookings', hotelId],
    queryFn: () => fetchGuestBookings(hotelId!),
    enabled: !hotelLoading && isValidHotel && !!hotelId,
  })

  // Filter bookings based on search and filters
  const filteredBookings = useMemo(() => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    return bookings.filter((booking) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        booking.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.room_number.includes(searchQuery) ||
        booking.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchQuery.toLowerCase())

      // Status filter
      const matchesStatus = statusFilter === 'all' || booking.status === statusFilter

      // Date filter
      let matchesDate = true
      switch (dateFilter) {
        case 'today':
          matchesDate = booking.scheduled_date === today
          break
        case 'week':
          matchesDate = booking.scheduled_date >= today && booking.scheduled_date <= oneWeekFromNow
          break
        case 'month':
          matchesDate = booking.scheduled_date >= today && booking.scheduled_date <= oneMonthFromNow
          break
        case 'all':
        default:
          matchesDate = true
      }

      return matchesSearch && matchesStatus && matchesDate
    })
  }, [bookings, searchQuery, statusFilter, dateFilter])

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      'in-progress': 'bg-purple-100 text-purple-700',
    }
    const labels = {
      pending: 'รอดำเนินการ',
      confirmed: 'ยืนยันแล้ว',
      'in-progress': 'กำลังดำเนินการ',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-700'}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const getPaymentBadge = (paymentStatus: string) => {
    const badges = {
      paid: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      failed: 'bg-red-100 text-red-700',
    }
    const labels = {
      paid: 'ชำระแล้ว',
      pending: 'รอชำระ',
      failed: 'ล้มเหลว',
    }
    const icons = {
      paid: CheckCircle,
      pending: Clock,
      failed: XCircle,
    }
    const IconComponent = icons[paymentStatus as keyof typeof icons] || Clock
    return (
      <div className="flex items-center gap-1">
        <IconComponent className="w-3 h-3" />
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[paymentStatus as keyof typeof badges] || 'bg-gray-100 text-gray-700'}`}>
          {labels[paymentStatus as keyof typeof labels] || paymentStatus}
        </span>
      </div>
    )
  }

  // Group bookings by date for better organization
  const groupedBookings = useMemo(() => {
    const groups: { [key: string]: GuestBooking[] } = {}
    filteredBookings.forEach((booking) => {
      const date = booking.scheduled_date
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(booking)
    })
    return groups
  }, [filteredBookings])

  // Loading state
  if (hotelLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-700 mx-auto mb-2" />
          <p className="text-stone-600">กำลังโหลดข้อมูลการจอง...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-red-600 mb-4">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            ลองใหม่
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">การจองของแขก</h1>
          <p className="text-stone-500">Guest Bookings</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-amber-700">{filteredBookings.length}</p>
          <p className="text-sm text-stone-500">การจองที่กำลังดำเนินการ</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              ค้นหา
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="ชื่อแขก, ห้อง, บริการ, รหัสจอง"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              สถานะ
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'confirmed' | 'in-progress')}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">ทั้งหมด</option>
              <option value="pending">รอดำเนินการ</option>
              <option value="confirmed">ยืนยันแล้ว</option>
              <option value="in-progress">กำลังดำเนินการ</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              ช่วงเวลา
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'all' | 'today' | 'week' | 'month')}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">ทั้งหมด</option>
              <option value="today">วันนี้</option>
              <option value="week">สัปดาห์นี้</option>
              <option value="month">เดือนนี้</option>
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-stone-600">
            พบ {filteredBookings.length} รายการ จากทั้งหมด {bookings.length} รายการ
          </p>
        </div>
      </div>

      {/* Bookings by Date */}
      <div className="space-y-6">
        {Object.keys(groupedBookings).length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-stone-100">
            <div className="text-center py-12 text-stone-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">ไม่มีการจองในขณะนี้</p>
              <p className="text-sm">การจองใหม่จะแสดงที่นี่</p>
            </div>
          </div>
        ) : (
          Object.keys(groupedBookings)
            .sort()
            .map((date) => (
              <div key={date} className="bg-white rounded-2xl shadow-lg border border-stone-100">
                {/* Date Header */}
                <div className="p-4 border-b border-stone-100 bg-stone-50 rounded-t-2xl">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <h3 className="text-lg font-semibold text-stone-900">
                      {new Date(date).toLocaleDateString('th-TH', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </h3>
                    <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium">
                      {groupedBookings[date].length} รายการ
                    </span>
                  </div>
                </div>

                {/* Bookings for this date */}
                <div className="p-4 space-y-4">
                  {groupedBookings[date].map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition cursor-pointer"
                      onClick={() => setSelectedBooking(booking)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-amber-700" />
                          </div>
                          <div>
                            <p className="font-medium text-stone-900">{booking.guest_name}</p>
                            <p className="text-sm text-stone-500">ห้อง {booking.room_number}</p>
                          </div>
                        </div>

                        <div className="ml-11">
                          <p className="text-sm font-medium text-stone-800 mb-1">{booking.service_name}</p>
                          <div className="flex items-center gap-4 text-xs text-stone-500">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(booking.scheduled_time).toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            {booking.staff_name && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {booking.staff_name}
                              </div>
                            )}
                          </div>
                          {booking.special_instructions && (
                            <p className="text-xs text-stone-500 mt-1 italic">
                              หมายเหตุ: {booking.special_instructions}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {getStatusBadge(booking.status)}
                          <div className="mt-1">
                            {getPaymentBadge(booking.payment_status)}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-amber-700">฿{booking.total_amount.toLocaleString()}</p>
                          <button className="text-xs text-amber-600 hover:text-amber-700">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>

      {/* Booking Detail Modal (Simple implementation) */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">รายละเอียดการจอง</h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div><strong>รหัส:</strong> #{selectedBooking.id.slice(-8)}</div>
              <div><strong>แขก:</strong> {selectedBooking.guest_name}</div>
              <div><strong>ห้อง:</strong> {selectedBooking.room_number}</div>
              <div><strong>บริการ:</strong> {selectedBooking.service_name}</div>
              <div><strong>วันที่:</strong> {new Date(selectedBooking.scheduled_date).toLocaleDateString('th-TH')}</div>
              <div><strong>เวลา:</strong> {new Date(selectedBooking.scheduled_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
              {selectedBooking.staff_name && <div><strong>เจ้าหน้าที่:</strong> {selectedBooking.staff_name}</div>}
              <div><strong>ยอดเงิน:</strong> ฿{selectedBooking.total_amount.toLocaleString()}</div>
              <div><strong>สถานะ:</strong> {getStatusBadge(selectedBooking.status)}</div>
              <div><strong>การชำระเงิน:</strong> {getPaymentBadge(selectedBooking.payment_status)}</div>
              {selectedBooking.special_instructions && (
                <div><strong>หมายเหตุ:</strong> {selectedBooking.special_instructions}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GuestBookings