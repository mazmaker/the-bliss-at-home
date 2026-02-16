import { useState, useMemo } from 'react'
import { Search, Calendar, Download, Eye, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@bliss/supabase/auth'
import { useHotelContext } from '../hooks/useHotelContext'

// Booking interface
interface Booking {
  id: string
  guest_name: string
  room_number: string
  service_name: string
  scheduled_date: string
  scheduled_time: string
  total_amount: number
  status: string
  payment_status: string
  created_at: string
}

// Fetch booking history from database
const fetchBookingHistory = async (hotelId: string): Promise<Booking[]> => {
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
      created_at,
      customers:customer_id(full_name),
      services:service_id(name_th)
    `)
    .eq('hotel_id', hotelId)
    .in('status', ['completed', 'cancelled']) // Show only finished bookings
    .order('booking_date', { ascending: false })
    .order('booking_time', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch booking history: ${error.message}`)
  }

  // Transform data to match interface
  const transformedData = (data || []).map((booking: any) => ({
    id: booking.id,
    guest_name: booking.customers?.full_name || 'ไม่ระบุชื่อ',
    room_number: booking.hotel_room_number || 'ไม่ระบุห้อง',
    service_name: booking.services?.name_th || 'ไม่ระบุบริการ',
    scheduled_date: booking.booking_date,
    scheduled_time: booking.booking_time,
    total_amount: booking.final_price,
    status: booking.status,
    payment_status: booking.payment_status,
    created_at: booking.created_at
  }))

  return transformedData
}

function BookingHistory() {
  const [searchQuery, setSearchQuery] = useState('')
  const [monthFilter, setMonthFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all')

  const { hotelId, isValidHotel, isLoading: hotelLoading } = useHotelContext()

  // Fetch booking history
  const {
    data: bookings = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['booking-history', hotelId],
    queryFn: () => fetchBookingHistory(hotelId!),
    enabled: !hotelLoading && isValidHotel && !!hotelId,
  })

  // Generate month options for the last 12 months
  const monthOptions = useMemo(() => {
    const months = []
    const now = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const value = date.toISOString().slice(0, 7) // YYYY-MM
      const label = date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })
      months.push({ value, label })
    }
    return months
  }, [])

  // Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesSearch =
        searchQuery === '' ||
        booking.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.room_number.includes(searchQuery) ||
        booking.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesMonth =
        monthFilter === '' ||
        booking.scheduled_date.startsWith(monthFilter)

      const matchesStatus =
        statusFilter === 'all' ||
        booking.status === statusFilter

      return matchesSearch && matchesMonth && matchesStatus
    })
  }, [bookings, searchQuery, monthFilter, statusFilter])

  const getStatusBadge = (status: string) => {
    const badges = {
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    const labels = {
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
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
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[paymentStatus as keyof typeof badges] || 'bg-gray-100 text-gray-700'}`}>
        {labels[paymentStatus as keyof typeof labels] || paymentStatus}
      </span>
    )
  }

  const handleExport = () => {
    // Create CSV content
    const csvHeaders = ['วันที่', 'เวลา', 'ชื่อแขก', 'ห้อง', 'บริการ', 'ยอดเงิน', 'สถานะ', 'การชำระเงิน']
    const csvData = filteredBookings.map(booking => [
      new Date(booking.scheduled_date).toLocaleDateString('th-TH'),
      new Date(booking.scheduled_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      booking.guest_name,
      booking.room_number,
      booking.service_name,
      booking.total_amount,
      booking.status === 'completed' ? 'เสร็จสิ้น' : 'ยกเลิก',
      booking.payment_status === 'paid' ? 'ชำระแล้ว' : booking.payment_status === 'pending' ? 'รอชำระ' : 'ล้มเหลว'
    ])

    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.join(','))
      .join('\n')

    // Download CSV
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `booking-history-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Loading state
  if (hotelLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-700 mx-auto mb-2" />
          <p className="text-stone-600">กำลังโหลดประวัติการจอง...</p>
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
          <h1 className="text-2xl font-bold text-stone-900">ประวัติการจอง</h1>
          <p className="text-stone-500">Booking History</p>
        </div>
        <button
          onClick={handleExport}
          disabled={filteredBookings.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
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

          {/* Month Filter */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              เดือน
            </label>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="">ทั้งหมด</option>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              สถานะ
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'completed' | 'cancelled')}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">ทั้งหมด</option>
              <option value="completed">เสร็จสิ้น</option>
              <option value="cancelled">ยกเลิก</option>
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

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100 overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">ไม่พบประวัติการจอง</p>
            <p className="text-sm">ลองเปลี่ยนเงื่อนไขการค้นหาหรือเพิ่มข้อมูลการจอง</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    วันที่ & เวลา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    แขก
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    บริการ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    ยอดเงิน
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">
                    การชำระ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-stone-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-stone-900">
                          {new Date(booking.scheduled_date).toLocaleDateString('th-TH')}
                        </div>
                        <div className="text-stone-500">
                          {new Date(booking.scheduled_time).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-stone-900">{booking.guest_name}</div>
                        <div className="text-stone-500">ห้อง {booking.room_number}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-stone-900">{booking.service_name}</div>
                      <div className="text-xs text-stone-500">#{booking.id.slice(-8)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-amber-700">฿{booking.total_amount.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(booking.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPaymentBadge(booking.payment_status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default BookingHistory