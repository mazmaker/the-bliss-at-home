import { useState, useMemo } from 'react'
import {
  Search, Calendar, Download, Eye, Loader2, AlertCircle, RefreshCw,
  Filter, MapPin, Clock, User, CheckCircle, XCircle, List, Grid3X3, X
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@bliss/supabase/auth'
import { useHotelContext } from '../hooks/useHotelContext'

// Simple booking interface with recipient count support
interface SimpleBooking {
  id: string
  booking_number: string
  guest_name: string
  room_number: string
  booking_date: string
  booking_time: string
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  payment_status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded'
  final_price: number
  customer_notes: string | null
  staff_name: string | null
  service_name: string | null
  duration: number
  recipient_count: number // จำนวนผู้รับบริการ (1 คน / 2 คน)
  created_at: string

  // Hotel info for detailed view
  hotel?: {
    id: string
    name_th: string
    address: string
    phone: string
    email: string
    rating: number
  } | null
}

// Helper function to parse customer data from customer_notes
function parseCustomerFromNotes(customerNotes?: string | null): string {
  if (!customerNotes) return 'ไม่ระบุชื่อ'

  const guestMatch = customerNotes.match(/Guest:\s*([^,\n]+)/)
  return guestMatch?.[1]?.trim() || 'ไม่ระบุชื่อ'
}

// Fetch all services to get available service names for filtering
const fetchAllServices = async (): Promise<{ id: string; name_th: string; name_en?: string }[]> => {
  const { data, error } = await supabase
    .from('services')
    .select('id, name_th, name_en')
    .eq('is_active', true)
    .order('name_th', { ascending: true })

  if (error) {
    console.error('Failed to fetch services:', error)
    return []
  }

  return data || []
}

// Fetch simple booking data with recipient count
const fetchSimpleBookings = async (hotelId: string): Promise<SimpleBooking[]> => {
  const { data: bookingsData, error: bookingsError } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_number,
      booking_date,
      booking_time,
      hotel_room_number,
      duration,
      status,
      payment_status,
      final_price,
      customer_notes,
      recipient_count,
      created_at,
      hotels:hotel_id(id, name_th, address, phone, email, rating),
      staff:staff_id(name_th),
      services:service_id(name_th)
    `)
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })
    .order('booking_date', { ascending: false })
    .order('booking_time', { ascending: false })

  if (bookingsError) {
    throw new Error(`Failed to fetch bookings: ${bookingsError.message}`)
  }

  // Transform the data
  const transformedData: SimpleBooking[] = bookingsData.map((booking: any) => ({
    id: booking.id,
    booking_number: booking.booking_number,
    guest_name: parseCustomerFromNotes(booking.customer_notes),
    room_number: booking.hotel_room_number || 'ไม่ระบุห้อง',
    booking_date: booking.booking_date,
    booking_time: booking.booking_time,
    duration: booking.duration,
    status: booking.status,
    payment_status: booking.payment_status,
    final_price: booking.final_price,
    customer_notes: booking.customer_notes,
    staff_name: booking.staff?.name_th || null,
    service_name: booking.services?.name_th || 'ไม่ระบุบริการ',
    recipient_count: booking.recipient_count || 1, // Default เป็น 1 คน
    created_at: booking.created_at,
    hotel: booking.hotels
  }))

  return transformedData
}

type StatusFilter = 'all' | 'active' | 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
type TimeFilter = 'all' | 'today' | 'week' | 'month'
type ViewMode = 'table' | 'grouped'

function BookingHistory() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [selectedBooking, setSelectedBooking] = useState<SimpleBooking | null>(null)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [isDateRangeMode, setIsDateRangeMode] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [hasSelectedDate, setHasSelectedDate] = useState(false) // Track if user has actually selected a date

  const { hotelId, isValidHotel, isLoading: hotelLoading } = useHotelContext()

  // Fetch simple bookings
  const {
    data: bookings = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['simple-booking-history', hotelId],
    queryFn: () => fetchSimpleBookings(hotelId!),
    enabled: !hotelLoading && isValidHotel && !!hotelId,
  })

  // Fetch available services for filtering
  const { data: availableServices = [] } = useQuery({
    queryKey: ['available-services'],
    queryFn: fetchAllServices,
  })


  // Filter bookings
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
        (booking.service_name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
        booking.booking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchQuery.toLowerCase())

      // Status filter
      let matchesStatus = true
      if (statusFilter === 'active') {
        matchesStatus = ['pending', 'confirmed', 'in_progress'].includes(booking.status)
      } else if (statusFilter === 'all') {
        matchesStatus = true
      } else {
        matchesStatus = booking.status === statusFilter
      }

      // Time filter
      let matchesTime = true
      switch (timeFilter) {
        case 'today':
          matchesTime = booking.booking_date === today
          break
        case 'week':
          matchesTime = booking.booking_date >= today && booking.booking_date <= oneWeekFromNow
          break
        case 'month':
          matchesTime = booking.booking_date >= today && booking.booking_date <= oneMonthFromNow
          break
        case 'all':
        default:
          matchesTime = true
      }


      // Service filter
      const matchesService = serviceFilter === 'all' || booking.service_name === serviceFilter

      // Date filter (only apply if user has actually selected a date)
      let matchesDate = true
      if (isDateRangeMode) {
        // Use date range when checkbox is checked
        if (dateFrom && dateTo) {
          matchesDate = booking.booking_date >= dateFrom && booking.booking_date <= dateTo
        } else if (dateFrom) {
          matchesDate = booking.booking_date >= dateFrom
        } else if (dateTo) {
          matchesDate = booking.booking_date <= dateTo
        }
      } else if (hasSelectedDate) {
        // Use single date only if user has actually selected a date
        matchesDate = booking.booking_date === selectedDate
      }

      return matchesSearch && matchesStatus && matchesTime && matchesService && matchesDate
    })
  }, [bookings, searchQuery, statusFilter, timeFilter, serviceFilter, selectedDate, isDateRangeMode, dateFrom, dateTo, hasSelectedDate])

  // Group bookings by date for grouped view
  const groupedBookings = useMemo(() => {
    if (viewMode !== 'grouped') return {}

    const groups: { [key: string]: SimpleBooking[] } = {}
    filteredBookings.forEach((booking) => {
      const date = booking.booking_date
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(booking)
    })

    // เรียงลำดับภายในแต่ละกลุ่ม (แต่ละวัน) ให้ล่าสุดไว้บนสุด
    Object.keys(groups).forEach(date => {
      groups[date].sort((a, b) => {
        // เรียงตาม created_at ก่อน (ล่าสุดบนสุด)
        if (a.created_at !== b.created_at) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
        // ถ้า created_at เหมือนกัน เรียงตาม booking_time (ล่าสุดบนสุด)
        return b.booking_time.localeCompare(a.booking_time)
      })
    })

    return groups
  }, [filteredBookings, viewMode])

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      'in_progress': 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    const labels = {
      pending: 'รอดำเนินการ',
      confirmed: 'ยืนยันแล้ว',
      'in_progress': 'กำลังดำเนินการ',
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
      pending: 'bg-yellow-100 text-yellow-700',
      processing: 'bg-blue-100 text-blue-700',
      paid: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      refunded: 'bg-gray-100 text-gray-700',
    }
    const labels = {
      pending: 'รอชำระ',
      processing: 'กำลังประมวลผล',
      paid: 'ชำระแล้ว',
      failed: 'ล้มเหลว',
      refunded: 'คืนเงินแล้ว',
    }
    const icons = {
      pending: Clock,
      processing: Loader2,
      paid: CheckCircle,
      failed: XCircle,
      refunded: RefreshCw,
    }
    const IconComponent = icons[paymentStatus as keyof typeof icons] || Clock
    return (
      <div className="flex items-center gap-1">
        <IconComponent className={`w-3 h-3 ${paymentStatus === 'processing' ? 'animate-spin' : ''}`} />
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[paymentStatus as keyof typeof badges] || 'bg-gray-100 text-gray-700'}`}>
          {labels[paymentStatus as keyof typeof labels] || paymentStatus}
        </span>
      </div>
    )
  }

  const handleExport = () => {
    // Create CSV content with recipient count
    const csvHeaders = ['วันที่', 'เวลา', 'เลขที่จอง', 'ชื่อแขก', 'ห้อง', 'บริการ', 'จำนวนคน', 'ระยะเวลา (นาที)', 'ยอดเงิน', 'สถานะ', 'การชำระเงิน']
    const csvData = filteredBookings.map(booking => [
      new Date(booking.booking_date).toLocaleDateString('th-TH'),
      new Date(booking.booking_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      booking.booking_number,
      booking.guest_name,
      booking.room_number,
      booking.service_name || 'ไม่ระบุบริการ',
      booking.recipient_count,
      booking.duration,
      booking.final_price,
      booking.status === 'completed' ? 'เสร็จสิ้น' :
      booking.status === 'cancelled' ? 'ยกเลิก' :
      booking.status === 'confirmed' ? 'ยืนยันแล้ว' :
      booking.status === 'in_progress' ? 'กำลังดำเนินการ' : 'รอดำเนินการ',
      booking.payment_status === 'paid' ? 'ชำระแล้ว' :
      booking.payment_status === 'processing' ? 'กำลังประมวลผล' :
      booking.payment_status === 'failed' ? 'ล้มเหลว' :
      booking.payment_status === 'refunded' ? 'คืนเงินแล้ว' : 'รอชำระ'
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
          <h1 className="text-2xl font-bold text-stone-900">ประวัติการจอง</h1>
          <p className="text-stone-500">Booking History</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-700">{filteredBookings.length}</p>
            <p className="text-sm text-stone-500">รายการทั้งหมด</p>
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
      </div>

      {/* Filters & View Toggle */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
        {/* View Mode Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-stone-500" />
            <span className="text-sm font-medium text-stone-700">ตัวกรอง & มุมมอง</span>
          </div>
          <div className="flex items-center bg-stone-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition ${
                viewMode === 'table'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <List className="w-3 h-3" />
              ตาราง
            </button>
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium transition ${
                viewMode === 'grouped'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Grid3X3 className="w-3 h-3" />
              จัดกลุ่ม
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              ค้นหา
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="ชื่อแขก, ห้อง, บริการ, เลขที่จอง"
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
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">ทั้งหมด</option>
              <option value="active">กำลังดำเนินการทั้งหมด</option>
              <option value="pending">รอดำเนินการ</option>
              <option value="confirmed">ยืนยันแล้ว</option>
              <option value="in_progress">กำลังดำเนินการ</option>
              <option value="completed">เสร็จสิ้น</option>
              <option value="cancelled">ยกเลิก</option>
            </select>
          </div>

          {/* Time Filter */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              ช่วงเวลา
            </label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">ทั้งหมด</option>
              <option value="today">วันนี้</option>
              <option value="week">สัปดาห์นี้</option>
              <option value="month">เดือนนี้</option>
            </select>
          </div>

          {/* Service Filter */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              บริการ
            </label>
            <select
              value={serviceFilter}
              onChange={(e) => setServiceFilter(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            >
              <option value="all">ทั้งหมด</option>
              {availableServices.map((service) => (
                <option key={service.id} value={service.name_th}>
                  {service.name_th}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-700 mb-2">
              วันที่
            </label>
            <div className="space-y-2">
              {/* Single Date Input (Only shown when not in range mode) */}
              {!isDateRangeMode && (
                <input
                  type="date"
                  value={hasSelectedDate ? selectedDate : ''}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setHasSelectedDate(true)
                  }}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="เลือกวันที่"
                />
              )}

              {/* Checkbox for Range Mode */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isDateRangeMode}
                  onChange={(e) => setIsDateRangeMode(e.target.checked)}
                  className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs text-stone-600">ดูแบบลากวัน</span>
              </label>

              {/* Date Range Inputs (Only shown when checkbox is checked) */}
              {isDateRangeMode && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      จากวันที่
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder=""
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">
                      ถึงวันที่
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder=""
                    />
                  </div>
                </div>
              )}

              {/* Clear Date Filter Button */}
              {(hasSelectedDate || isDateRangeMode || dateFrom || dateTo) && (
                <button
                  onClick={() => {
                    setSelectedDate(new Date().toISOString().split('T')[0])
                    setIsDateRangeMode(false)
                    setDateFrom('')
                    setDateTo('')
                    setHasSelectedDate(false)
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded transition"
                  title="รีเซ็ตตัวกรองวันที่"
                >
                  <X className="w-3 h-3" />
                  รีเซ็ต
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Results count */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-stone-600">
            พบ {filteredBookings.length} รายการ จากทั้งหมด {bookings.length} รายการ
          </p>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'table' ? (
        // Table View
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
                      เลขที่จอง & วันที่
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
                    <th className="px-6 py-3 text-center text-xs font-medium text-stone-500 uppercase tracking-wider">
                      รายละเอียด
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-stone-200">
                  {filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-stone-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-stone-900">
                            #{booking.booking_number}
                          </div>
                          <div className="text-stone-500">
                            {new Date(booking.booking_date).toLocaleDateString('th-TH')}
                          </div>
                          <div className="text-xs text-stone-400">
                            {new Date(booking.booking_time).toLocaleTimeString('th-TH', {
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
                          {booking.staff_name && (
                            <div className="text-xs text-stone-400">เจ้าหน้าที่: {booking.staff_name}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-stone-900">
                          <div className="font-medium">
                            {booking.service_name || 'ไม่ระบุบริการ'}
                            {booking.recipient_count > 1 && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded ml-1">
                                {booking.recipient_count} คน
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-stone-500">ระยะเวลา: {booking.duration} นาที</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-bold text-amber-700">฿{booking.final_price.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(booking.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPaymentBadge(booking.payment_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="text-amber-600 hover:text-amber-700 transition"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        // Grouped View
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
              .sort((a, b) => b.localeCompare(a)) // ล่าสุดไว้บนสุด
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
                              <p className="font-medium text-stone-900">
                                {booking.guest_name}
                                <span className="text-xs text-stone-500 ml-2">#{booking.booking_number}</span>
                              </p>
                              <p className="text-sm text-stone-500">ห้อง {booking.room_number}</p>
                            </div>
                          </div>

                          <div className="ml-11">
                            <p className="text-sm font-medium text-stone-800 mb-1">
                              {booking.service_name || 'ไม่ระบุบริการ'}
                              {booking.recipient_count > 1 && (
                                <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded ml-1">
                                  {booking.recipient_count} คน
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-stone-600 mb-1">
                              ระยะเวลา: {booking.duration} นาที
                            </p>

                            <div className="flex items-center gap-4 text-xs text-stone-500">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(booking.booking_time).toLocaleTimeString('th-TH', {
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
                            <p className="text-lg font-bold text-amber-700">฿{booking.final_price.toLocaleString()}</p>
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
      )}

      {/* Booking Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">รายละเอียดการจอง</h3>
              <button
                onClick={() => setSelectedBooking(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div><strong>เลขที่จอง:</strong> #{selectedBooking.booking_number}</div>
                <div><strong>แขก:</strong> {selectedBooking.guest_name}</div>
                <div><strong>ห้อง:</strong> {selectedBooking.room_number}</div>
                <div><strong>วันที่:</strong> {new Date(selectedBooking.booking_date).toLocaleDateString('th-TH')}</div>
                <div><strong>เวลา:</strong> {new Date(selectedBooking.booking_time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
                {selectedBooking.staff_name && <div><strong>เจ้าหน้าที่:</strong> {selectedBooking.staff_name}</div>}
              </div>

              <div className="flex items-center gap-4">
                <div><strong>สถานะ:</strong> {getStatusBadge(selectedBooking.status)}</div>
                <div><strong>การชำระเงิน:</strong> {getPaymentBadge(selectedBooking.payment_status)}</div>
              </div>

              {/* Service */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-stone-900 mb-3">บริการที่จอง</h4>
                <div className="p-3 bg-stone-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-stone-900">
                        {selectedBooking.service_name || 'ไม่ระบุบริการ'}
                        {selectedBooking.recipient_count > 1 && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded ml-1">
                            {selectedBooking.recipient_count} คน
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-stone-500">
                        <span>ระยะเวลา: {selectedBooking.duration} นาที</span>
                        <span>จำนวน: {selectedBooking.recipient_count} คน</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-amber-700">฿{selectedBooking.final_price.toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              {selectedBooking.customer_notes && (
                <div className="border-t pt-4">
                  <h4 className="font-medium text-stone-900 mb-2">หมายเหตุ</h4>
                  <p className="text-stone-600 text-sm bg-stone-50 p-3 rounded-lg">
                    {selectedBooking.customer_notes}
                  </p>
                </div>
              )}

              {/* Hotel Information */}
              {selectedBooking.hotel && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-amber-600" />
                    <h4 className="font-medium text-stone-900">ข้อมูลโรงแรม</h4>
                  </div>
                  <div className="space-y-2">
                    <div><strong>โรงแรม:</strong> {selectedBooking.hotel.name_th}</div>
                    {selectedBooking.hotel.address && (
                      <div><strong>ที่อยู่:</strong> {selectedBooking.hotel.address}</div>
                    )}
                    {selectedBooking.hotel.phone && (
                      <div><strong>เบอร์โทร:</strong> {selectedBooking.hotel.phone}</div>
                    )}
                    {selectedBooking.hotel.email && (
                      <div><strong>อีเมล:</strong> {selectedBooking.hotel.email}</div>
                    )}
                    {selectedBooking.hotel.rating > 0 && (
                      <div className="flex items-center gap-1">
                        <strong>คะแนน:</strong>
                        <span className="text-amber-600">⭐ {selectedBooking.hotel.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BookingHistory