import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Eye, Download, Calendar, Clock, X, User, Phone, MapPin, Briefcase, CreditCard, FileText, DollarSign, Ban, RefreshCw, Users } from 'lucide-react'
import { isSpecificPreference, getProviderPreferenceLabel, getProviderPreferenceBadgeStyle } from '@bliss/supabase'
import { useBookings, useBookingStats, useUpdateBookingStatus, type Booking, type BookingStatus } from '../hooks/useBookings'
import { useQueryClient } from '@tanstack/react-query'
import type { ServiceCategory } from '../services/bookingService'
import BookingCancellationModal from '../components/BookingCancellationModal'

function Bookings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') as BookingStatus | null
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>(initialStatus || 'all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | 'all'>('all')
  const [bookingTypeFilter, setBookingTypeFilter] = useState<'all' | 'customer' | 'hotel'>('all')
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isCancellationModalOpen, setIsCancellationModalOpen] = useState(false)
  const queryClient = useQueryClient()

  // Sync statusFilter with URL search params (e.g. when navigating from different links)
  useEffect(() => {
    const urlStatus = searchParams.get('status') as BookingStatus | null
    setStatusFilter(urlStatus || 'all')
  }, [searchParams])

  // Fetch bookings with filters
  const { data: bookingsData = [], isLoading: bookingsLoading } = useBookings({
    status: statusFilter,
    category: categoryFilter,
    booking_type: bookingTypeFilter,
    date_filter: dateFilter,
  })

  // Fetch stats
  const { data: stats } = useBookingStats()

  // Status update mutation
  const updateStatus = useUpdateBookingStatus()

  const handleOpenDetail = (booking: Booking) => {
    setSelectedBooking(booking)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetail = () => {
    setIsDetailModalOpen(false)
    setSelectedBooking(null)
  }

  const handleOpenCancellation = () => {
    setIsDetailModalOpen(false)
    setIsCancellationModalOpen(true)
  }

  const handleCloseCancellation = () => {
    setIsCancellationModalOpen(false)
    setSelectedBooking(null)
  }

  const handleCancellationComplete = () => {
    // Refresh bookings data
    queryClient.invalidateQueries({ queryKey: ['bookings'] })
  }

  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      await updateStatus.mutateAsync({ id: bookingId, status: newStatus })
    } catch (error) {
      console.error('Error updating booking status:', error)
      alert('เกิดข้อผิดพลาดในการอัพเดทสถานะ: ' + (error as Error).message)
      throw error
    }
  }

  // Client-side search filter
  const filteredBookings = useMemo(() => {
    if (!searchQuery) return bookingsData

    const query = searchQuery.toLowerCase()
    return bookingsData.filter((booking) =>
      booking.booking_number.toLowerCase().includes(query) ||
      booking.customer?.full_name.toLowerCase().includes(query) ||
      booking.service?.name_th.toLowerCase().includes(query) ||
      booking.service?.name_en.toLowerCase().includes(query)
    )
  }, [bookingsData, searchQuery])

  const handleExportReport = () => {
    if (!filteredBookings.length) {
      alert('ไม่มีข้อมูลสำหรับส่งออก')
      return
    }

    // Prepare CSV data
    const headers = ['รหัสจอง', 'ลูกค้า', 'เบอร์โทร', 'บริการ', 'ระยะเวลา', 'โรงแรม', 'พนักงาน', 'วันที่', 'เวลา', 'จำนวน', 'สถานะ', 'การชำระ']
    const rows = filteredBookings.map(booking => [
      booking.booking_number,
      booking.customer?.full_name || '-',
      booking.customer?.phone || '-',
      booking.service?.name_th || booking.service?.name_en || '-',
      `${booking.duration} นาที`,
      booking.hotel?.name_th || '-',
      booking.staff?.name_th || 'รอมอบหมาย',
      booking.booking_date,
      booking.booking_time,
      `฿${Number(booking.final_price).toLocaleString()}`,
      booking.status,
      booking.payment_status,
    ])

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    // Add BOM for Excel UTF-8 support
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

    // Download file
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `bookings_report_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    const labels = {
      pending: 'รอดำเนินการ',
      confirmed: 'ยืนยันแล้ว',
      in_progress: 'กำลังดำเนินการ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const getPaymentBadge = (status: string) => {
    const badges = {
      pending: 'bg-orange-100 text-orange-700',
      paid: 'bg-green-100 text-green-700',
      refunded: 'bg-stone-100 text-stone-600',
    }
    const labels = {
      pending: 'รอชำระ',
      paid: 'ชำระแล้ว',
      refunded: 'คืนเงิน',
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">การจองทั้งหมด</h1>
          <p className="text-stone-500">All Bookings</p>
        </div>
        <button
          onClick={handleExportReport}
          className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition"
        >
          <Download className="w-5 h-5" />
          ส่งออกรายงาน
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-stone-900">{stats?.total || 0}</p>
          <p className="text-xs text-stone-500">ทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</p>
          <p className="text-xs text-stone-500">รอดำเนินการ</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-blue-600">{stats?.confirmed || 0}</p>
          <p className="text-xs text-stone-500">ยืนยันแล้ว</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-purple-600">{stats?.in_progress || 0}</p>
          <p className="text-xs text-stone-500">กำลังดำเนินการ</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-green-600">{stats?.completed || 0}</p>
          <p className="text-xs text-stone-500">เสร็จสิ้น</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-amber-700">
            ฿{(stats?.total_revenue || 0).toLocaleString()}
          </p>
          <p className="text-xs text-stone-500">ยอดรวม</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-stone-100">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="ค้นหารหัส, ชื่อลูกค้า, บริการ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
            />
          </div>

          {/* Filters Row */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="confirmed">ยืนยันแล้ว</option>
            <option value="in_progress">กำลังดำเนินการ</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-4 py-2 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">ประเภทบริการทั้งหมด</option>
            <option value="massage">นวด</option>
            <option value="nail">ทำเล็บ</option>
            <option value="spa">สปา</option>
          </select>
          <select
            value={bookingTypeFilter}
            onChange={(e) => setBookingTypeFilter(e.target.value as any)}
            className="px-4 py-2 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">ประเภทผู้จองทั้งหมด</option>
            <option value="customer">ลูกค้าทั่วไป</option>
            <option value="hotel">โรงแรม</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="px-4 py-2 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">วันที่ทั้งหมด</option>
            <option value="today">วันนี้</option>
            <option value="week">สัปดาห์นี้</option>
            <option value="month">เดือนนี้</option>
          </select>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-stone-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">รหัส</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">ลูกค้า</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">บริการ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">โรงแรม</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">พนักงาน</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">วันที่/เวลา</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">จำนวน</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">สถานะ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">การชำระ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {bookingsLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-stone-500">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-stone-500">
                    ไม่พบข้อมูลการจอง
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 px-4 text-sm font-medium text-stone-900">{booking.booking_number}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="text-sm font-medium text-stone-900">{booking.customer?.full_name || 'ไม่ระบุ'}</p>
                        <p className="text-xs text-stone-500">{booking.customer?.phone || '-'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-stone-600">
                      {booking.booking_services && booking.booking_services.length > 1 ? (
                        // Couple booking — show per-person services
                        <div className="space-y-0.5">
                          {booking.booking_services
                            .sort((a, b) => a.recipient_index - b.recipient_index)
                            .map((bs, i) => (
                              <p key={bs.id} className="text-xs">
                                <span className="text-stone-400">คนที่ {i + 1}:</span>{' '}
                                {bs.service?.name_th || 'ไม่ระบุ'} {bs.duration} นาที
                              </p>
                            ))}
                        </div>
                      ) : (
                        <>
                          <p>{booking.service?.name_th || booking.service?.name_en || 'ไม่ระบุ'}</p>
                          <p className="text-xs text-stone-400">{booking.duration} นาที</p>
                        </>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-amber-700">{booking.hotel?.name_th || '-'}</td>
                    <td className="py-3 px-4 text-sm text-stone-600">{booking.staff?.name_th || 'รอมอบหมาย'}</td>
                    <td className="py-3 px-4 text-sm text-stone-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{booking.booking_date}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{booking.booking_time}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-stone-900">฿{Number(booking.final_price).toLocaleString()}</td>
                    <td className="py-3 px-4">{getStatusBadge(booking.status)}</td>
                    <td className="py-3 px-4">{getPaymentBadge(booking.payment_status)}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleOpenDetail(booking)}
                        className="p-2 hover:bg-stone-100 rounded-lg transition"
                        title="ดูรายละเอียด"
                      >
                        <Eye className="w-4 h-4 text-stone-600" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Detail Modal */}
      {isDetailModalOpen && selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetail}
          onStatusChange={handleStatusChange}
          onOpenCancellation={handleOpenCancellation}
        />
      )}

      {/* Booking Cancellation Modal */}
      {isCancellationModalOpen && selectedBooking && (
        <BookingCancellationModal
          booking={selectedBooking}
          isOpen={isCancellationModalOpen}
          onClose={handleCloseCancellation}
          onCancelled={handleCancellationComplete}
        />
      )}
    </div>
  )
}

// Booking Detail Modal Component
interface BookingDetailModalProps {
  booking: Booking
  isOpen: boolean
  onClose: () => void
  onStatusChange: (bookingId: string, newStatus: BookingStatus) => void
  onOpenCancellation: () => void
}

function BookingDetailModal({ booking, isOpen, onClose, onStatusChange, onOpenCancellation }: BookingDetailModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(booking.status)
  const [isChangingStatus, setIsChangingStatus] = useState(false)

  if (!isOpen) return null

  const handleStatusChange = async () => {
    // If selecting "cancelled", open cancellation modal instead
    if (selectedStatus === 'cancelled') {
      onOpenCancellation()
      return
    }

    setIsChangingStatus(true)
    try {
      await onStatusChange(booking.id, selectedStatus)
      onClose()
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setIsChangingStatus(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-purple-100 text-purple-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    }
    return colors[status as keyof typeof colors] || 'bg-stone-100 text-stone-700'
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      pending: 'รอดำเนินการ',
      confirmed: 'ยืนยันแล้ว',
      in_progress: 'กำลังดำเนินการ',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
    }
    return labels[status as keyof typeof labels] || status
  }

  const getCategoryLabel = (category: string) => {
    const labels = {
      massage: 'นวด',
      nail: 'ทำเล็บ',
      spa: 'สปา',
    }
    return labels[category as keyof typeof labels] || category
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-900">รายละเอียดการจอง</h2>
            <p className="text-sm text-stone-500">Booking Details</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-lg transition"
          >
            <X className="w-6 h-6 text-stone-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Booking ID & Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-500">รหัสการจอง</p>
              <p className="text-xl font-bold text-stone-900">{booking.booking_number}</p>
            </div>
            <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
              {getStatusLabel(booking.status)}
            </span>
          </div>

          {/* Customer Info */}
          <div className="bg-stone-50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-stone-900 mb-3">ข้อมูลลูกค้า</h3>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-stone-400 mt-0.5" />
              <div>
                <p className="text-sm text-stone-500">ชื่อลูกค้า</p>
                <p className="font-medium text-stone-900">{booking.customer?.full_name || 'ไม่ระบุ'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-stone-400 mt-0.5" />
              <div>
                <p className="text-sm text-stone-500">เบอร์ติดต่อ</p>
                <p className="font-medium text-stone-900">{booking.customer?.phone || 'ไม่ระบุ'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-stone-400 mt-0.5" />
              <div>
                <p className="text-sm text-stone-500">ที่อยู่</p>
                {booking.hotel && booking.is_hotel_booking ? (
                  <div>
                    <p className="font-medium text-stone-900">{booking.hotel.name_th}</p>
                    <p className="text-sm text-stone-600">{booking.hotel.address}</p>
                    {booking.hotel.phone && (
                      <p className="text-xs text-stone-500">📞 {booking.hotel.phone}</p>
                    )}
                    {booking.hotel.email && (
                      <p className="text-xs text-stone-500">✉️ {booking.hotel.email}</p>
                    )}
                    {booking.hotel.rating > 0 && (
                      <p className="text-xs text-amber-600">⭐ {booking.hotel.rating.toFixed(1)}</p>
                    )}
                    {booking.hotel_room_number && (
                      <p className="text-xs text-blue-600">🏠 ห้อง: {booking.hotel_room_number}</p>
                    )}
                  </div>
                ) : (
                  <p className="font-medium text-stone-900">{booking.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Service Info */}
          <div className="bg-amber-50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-stone-900 mb-3">รายละเอียดบริการ</h3>

            <div className="flex items-start gap-3">
              <Briefcase className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-stone-500">บริการ</p>
                {booking.booking_services && booking.booking_services.length > 1 ? (
                  <div className="space-y-2 mt-1">
                    {booking.booking_services
                      .sort((a, b) => a.recipient_index - b.recipient_index)
                      .map((bs, i) => (
                        <div key={bs.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200">
                          <div>
                            <span className="text-xs text-amber-600 font-medium">คนที่ {i + 1}</span>
                            <p className="font-medium text-stone-900">{bs.service?.name_th || 'ไม่ระบุ'}</p>
                            <p className="text-xs text-stone-500">{bs.duration} นาที • {getCategoryLabel(bs.service?.category as string)}</p>
                          </div>
                          <span className="text-sm font-semibold text-stone-700">฿{Number(bs.price).toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <>
                    <p className="font-medium text-stone-900">{booking.service?.name_th || booking.service?.name_en || 'ไม่ระบุ'}</p>
                    <p className="text-xs text-stone-500 mt-1">
                      ประเภท: {getCategoryLabel(booking.service?.category as string)}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm text-stone-500">วันที่</p>
                <p className="font-medium text-stone-900">{booking.booking_date}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm text-stone-500">เวลา</p>
                <p className="font-medium text-stone-900">{booking.booking_time}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm text-stone-500">ระยะเวลา</p>
                <p className="font-medium text-stone-900">
                  {booking.duration} นาที
                  {booking.duration >= 60 && (
                    <span className="text-stone-500 text-sm ml-1">
                      ({Math.floor(booking.duration / 60)}{booking.duration % 60 > 0 ? `.${booking.duration % 60}` : ''} ชั่วโมง)
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm text-stone-500">จำนวนลูกค้า</p>
                <p className="font-medium text-stone-900">
                  {(booking.recipient_count || 1) === 1 ? 'คนเดียว (1 คน)' : `คู่ (${booking.recipient_count} คน)`}
                </p>
              </div>
            </div>

            {isSpecificPreference(booking.provider_preference) && (
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm text-stone-500">ความต้องการผู้ให้บริการ</p>
                  <span className={`inline-block text-xs px-2 py-1 rounded-full ${getProviderPreferenceBadgeStyle(booking.provider_preference)}`}>
                    {getProviderPreferenceLabel(booking.provider_preference)}
                  </span>
                </div>
              </div>
            )}

            {booking.service_format && booking.service_format !== 'single' && (
              <div className="flex items-start gap-3">
                <Briefcase className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm text-stone-500">รูปแบบบริการ</p>
                  <p className="font-medium text-stone-900">
                    {booking.service_format === 'simultaneous' && 'พร้อมกัน (ผู้ให้บริการ 2 คน)'}
                    {booking.service_format === 'sequential' && 'สลับกัน (ผู้ให้บริการ 1 คน)'}
                  </p>
                </div>
              </div>
            )}

            {booking.hotel && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm text-stone-500">โรงแรม</p>
                  <p className="font-medium text-amber-700">{booking.hotel.name_th}</p>
                  {booking.hotel_room_number && (
                    <p className="text-xs text-stone-500 mt-1">ห้อง: {booking.hotel_room_number}</p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm text-stone-500">พนักงาน</p>
                <p className="font-medium text-stone-900">{booking.staff?.name_th || 'รอมอบหมาย'}</p>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div className="bg-green-50 rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-stone-900 mb-3">ข้อมูลการชำระเงิน</h3>

            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-stone-500 mb-2">รายละเอียดราคา</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-600">ราคาบริการ</span>
                    <span className="text-stone-900">฿{Number(booking.base_price).toLocaleString()}</span>
                  </div>
                  {booking.discount_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">ส่วนลด</span>
                      <span className="text-red-600">-฿{Number(booking.discount_amount).toLocaleString()}</span>
                    </div>
                  )}
                  {booking.promotion && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">
                        {booking.promotion.code}
                      </span>
                      <span className="text-xs text-stone-500">{booking.promotion.name_th}</span>
                    </div>
                  )}
                  <div className="border-t border-green-200 pt-2 mt-2 flex justify-between">
                    <span className="font-semibold text-stone-900">ราคาสุทธิ</span>
                    <span className="text-xl font-bold text-green-600">฿{Number(booking.final_price).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm text-stone-500">สถานะการชำระ</p>
                <p className="font-medium text-stone-900">
                  {booking.payment_status === 'paid' && '✅ ชำระแล้ว'}
                  {booking.payment_status === 'pending' && '⏳ รอชำระ'}
                  {booking.payment_status === 'processing' && '🔄 กำลังดำเนินการ'}
                  {booking.payment_status === 'refunded' && '↩️ คืนเงินแล้ว'}
                  {booking.payment_status === 'failed' && '❌ ล้มเหลว'}
                </p>
              </div>
            </div>

            {booking.payment_method && (
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="text-sm text-stone-500">ช่องทางการชำระเงิน</p>
                  <p className="font-medium text-stone-900">
                    {booking.payment_method === 'cash' && '💵 เงินสด'}
                    {booking.payment_method === 'credit_card' && '💳 บัตรเครดิต'}
                    {booking.payment_method === 'promptpay' && '📱 พร้อมเพย์'}
                    {booking.payment_method === 'bank_transfer' && '🏦 โอนเงิน'}
                    {booking.payment_method === 'other' && '📋 อื่นๆ'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Location Map */}
          <div className="bg-blue-50 rounded-xl p-4">
            <h3 className="font-semibold text-stone-900 mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              ตำแหน่งให้บริการ
            </h3>

            {booking.latitude && booking.longitude ? (
              <>
                <div className="rounded-lg overflow-hidden border border-blue-200 mb-2">
                  <iframe
                    width="100%"
                    height="300"
                    frameBorder="0"
                    style={{ border: 0 }}
                    src={`https://www.google.com/maps?q=${booking.latitude},${booking.longitude}&output=embed`}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="text-sm text-stone-600">
                  <p className="font-medium">ที่อยู่: {booking.address}</p>
                  <p className="text-xs text-stone-500 mt-1">
                    พิกัด: {booking.latitude}, {booking.longitude}
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-lg border border-blue-200 p-4">
                <p className="text-sm text-stone-600">
                  📍 {booking.address}
                </p>
                <p className="text-xs text-stone-400 mt-2">
                  ⚠️ ยังไม่มีพิกัดที่อยู่ในระบบ
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          {(booking.customer_notes || booking.admin_notes) && (
            <div className="bg-blue-50 rounded-xl p-4 space-y-2">
              <h3 className="font-semibold text-stone-900 mb-2 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                หมายเหตุ
              </h3>
              {booking.customer_notes && (
                <div>
                  <p className="text-xs text-stone-500">จากลูกค้า:</p>
                  <p className="text-stone-700">{booking.customer_notes}</p>
                </div>
              )}
              {booking.admin_notes && (
                <div className="mt-2">
                  <p className="text-xs text-stone-500">จาก Admin:</p>
                  <p className="text-stone-700">{booking.admin_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Cancellation Details Section - Only show for cancelled bookings */}
          {booking.status === 'cancelled' && (
            <div className="bg-red-50 rounded-xl p-4 space-y-3 border border-red-200">
              <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-600" />
                รายละเอียดการยกเลิก
              </h3>

              {/* Cancellation Time */}
              {booking.cancelled_at && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-stone-500">ยกเลิกเมื่อ</p>
                    <p className="font-medium text-stone-900">
                      {new Date(booking.cancelled_at).toLocaleDateString('th-TH', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              )}

              {/* Cancellation Reason */}
              {booking.cancellation_reason && (
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-stone-500">เหตุผลการยกเลิก</p>
                    <p className="font-medium text-stone-900">{booking.cancellation_reason}</p>
                  </div>
                </div>
              )}

              {/* Refund Information */}
              {booking.refund_status && booking.refund_status !== 'none' && (
                <div className="mt-4 pt-4 border-t border-red-200">
                  <div className="flex items-center gap-2 mb-3">
                    <RefreshCw className="w-5 h-5 text-red-600" />
                    <h4 className="font-semibold text-red-800">ข้อมูลการคืนเงิน</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Refund Status */}
                    <div>
                      <p className="text-sm text-stone-500">สถานะการคืนเงิน</p>
                      <p className="font-medium">
                        {booking.refund_status === 'pending' && (
                          <span className="text-yellow-600">⏳ รอดำเนินการ</span>
                        )}
                        {booking.refund_status === 'processing' && (
                          <span className="text-blue-600">🔄 กำลังดำเนินการ</span>
                        )}
                        {booking.refund_status === 'completed' && (
                          <span className="text-green-600">✅ คืนเงินแล้ว</span>
                        )}
                        {booking.refund_status === 'failed' && (
                          <span className="text-red-600">❌ ล้มเหลว</span>
                        )}
                      </p>
                    </div>

                    {/* Refund Percentage */}
                    {booking.refund_percentage !== null && booking.refund_percentage !== undefined && (
                      <div>
                        <p className="text-sm text-stone-500">รูปแบบการคืนเงิน</p>
                        <p className="font-medium text-stone-900">
                          {booking.refund_percentage === 100 ? 'คืนเต็มจำนวน (100%)' : `คืนบางส่วน (${booking.refund_percentage}%)`}
                        </p>
                      </div>
                    )}

                    {/* Refund Amount */}
                    {booking.refund_amount !== null && booking.refund_amount !== undefined && booking.refund_amount > 0 && (
                      <div>
                        <p className="text-sm text-stone-500">จำนวนเงินคืน</p>
                        <p className="text-xl font-bold text-green-600">
                          ฿{Number(booking.refund_amount).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No Refund Case */}
              {(!booking.refund_status || booking.refund_status === 'none') && (
                <div className="flex items-start gap-3 mt-2">
                  <DollarSign className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-stone-500">การคืนเงิน</p>
                    <p className="font-medium text-stone-600">ไม่มีการคืนเงิน</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Change Section */}
          <div className="border-t border-stone-200 pt-6">
            <h3 className="font-semibold text-stone-900 mb-4">เปลี่ยนสถานะการจอง</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as BookingStatus)}
                className="flex-1 px-4 py-2 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="pending">รอดำเนินการ</option>
                <option value="confirmed">ยืนยันแล้ว</option>
                <option value="in_progress">กำลังดำเนินการ</option>
                <option value="completed">เสร็จสิ้น</option>
                <option value="cancelled">ยกเลิก</option>
              </select>
              <button
                onClick={handleStatusChange}
                disabled={isChangingStatus || selectedStatus === booking.status}
                className={`px-6 py-2 rounded-xl font-medium transition ${
                  selectedStatus === booking.status
                    ? 'bg-stone-200 text-stone-500 cursor-not-allowed'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                {isChangingStatus ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-stone-50 border-t border-stone-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-stone-300 text-stone-700 rounded-xl font-medium hover:bg-white transition"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}

export default Bookings
