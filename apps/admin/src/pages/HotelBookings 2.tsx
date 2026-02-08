import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  User,
  Phone,
  Clock,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Search,
  Download,
  Eye,
  Edit,
  MapPin,
  FileText,
  FileSpreadsheet,
  Printer,
  Loader2,
} from 'lucide-react'
import { exportToCSV, exportToExcel, exportToPDF } from '../utils/exportUtils'
import { useHotelBookings } from '../hooks/useHotels'
import { BookingDetailModal } from '../components/BookingDetailModal'
import { BookingEditModal } from '../components/BookingEditModal'
import type { HotelBooking } from '../lib/hotelQueries'


export default function HotelBookings() {
  const { id } = useParams<{ id: string }>()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | HotelBooking['status']>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<HotelBooking | null>(null)
  const [editingBooking, setEditingBooking] = useState<HotelBooking | null>(null)

  const { bookings, loading, error, refetch } = useHotelBookings(id)

  const filteredBookings = (bookings || []).filter((booking) => {
    const matchesSearch =
      searchQuery === '' ||
      booking.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.booking_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customer_phone.includes(searchQuery) ||
      booking.room_number?.includes(searchQuery)

    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter

    // Date filtering logic
    let matchesDate = true
    if (dateFilter !== 'all') {
      const serviceDate = new Date(booking.service_date)
      const today = new Date()
      if (dateFilter === 'today') {
        matchesDate = serviceDate.toDateString() === today.toDateString()
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        matchesDate = serviceDate >= weekAgo
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
        matchesDate = serviceDate >= monthAgo
      }
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  const getStatusBadge = (status: HotelBooking['status']) => {
    const badges = {
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'ยืนยันแล้ว', icon: CheckCircle },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'รอยืนยัน', icon: Clock },
      completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'เสร็จสิ้น', icon: CheckCircle },
      cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'ยกเลิก', icon: XCircle },
      no_show: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'ไม่มาใช้บริการ', icon: AlertTriangle },
    }
    const badge = badges[status]
    const Icon = badge.icon
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${badge.bg} ${badge.text}`}>
        <Icon className="h-3 w-3" />
        {badge.label}
      </span>
    )
  }

  const getPaymentStatusBadge = (status: HotelBooking['payment_status']) => {
    const badges = {
      paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'ชำระแล้ว' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'รอชำระ' },
      refunded: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'คืนเงินแล้ว' },
    }
    const badge = badges[status]
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (timeString: string) => {
    return timeString
  }

  const totalBookings = filteredBookings.length
  const confirmedCount = filteredBookings.filter((b) => b.status === 'confirmed').length
  const completedCount = filteredBookings.filter((b) => b.status === 'completed').length
  const totalRevenue = filteredBookings
    .filter((b) => b.payment_status === 'paid')
    .reduce((sum, b) => sum + Number(b.total_price), 0)

  const getStatusLabel = (status: HotelBooking['status']) => {
    const labels = {
      confirmed: 'ยืนยันแล้ว',
      pending: 'รอยืนยัน',
      completed: 'เสร็จสิ้น',
      cancelled: 'ยกเลิก',
      no_show: 'ไม่มาใช้บริการ',
    }
    return labels[status]
  }

  const getPaymentStatusLabel = (status: HotelBooking['payment_status']) => {
    const labels = {
      paid: 'ชำระแล้ว',
      pending: 'รอชำระ',
      refunded: 'คืนเงินแล้ว',
    }
    return labels[status]
  }

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const formattedData = filteredBookings.map(booking => ({
      'เลขที่การจอง': booking.booking_number,
      'ชื่อผู้เข้าพัก': booking.customer_name,
      'เบอร์โทร': booking.customer_phone,
      'อีเมล': booking.customer_email || '-',
      'ห้องพัก': booking.room_number || '-',
      'บริการ': booking.service_name,
      'ประเภท': booking.service_category,
      'ช่าง': booking.staff_name || '-',
      'วันที่จอง': formatDate(booking.booking_date),
      'วันที่ใช้บริการ': formatDate(booking.service_date),
      'เวลา': booking.service_time,
      'ระยะเวลา': `${booking.duration} นาที`,
      'ราคา': `฿${Number(booking.total_price).toLocaleString()}`,
      'สถานะการชำระ': getPaymentStatusLabel(booking.payment_status),
      'สถานะ': getStatusLabel(booking.status),
      'สร้างโดยโรงแรม': 'ใช่',
      'หมายเหตุ': booking.notes || '-'
    }))

    const filename = `hotel-bookings-${id}-${new Date().toISOString().split('T')[0]}`

    switch (format) {
      case 'csv':
        exportToCSV(formattedData, filename)
        break
      case 'excel':
        exportToExcel(formattedData, filename, 'Hotel Bookings')
        break
      case 'pdf':
        exportToPDF(formattedData, filename, 'รายงานการจองโดยโรงแรม')
        break
    }
    setShowExportMenu(false)
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-amber-700" />
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-16 w-16 text-red-500" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">เกิดข้อผิดพลาด</h3>
          <p className="mt-2 text-gray-600">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-amber-700 px-4 py-2 text-white hover:bg-amber-800"
          >
            ลองอีกครั้ง
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/admin/hotels/${id}`} className="rounded-lg p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">รายการจองของโรงแรม</h1>
            <p className="text-gray-600">การจองที่โรงแรมทำแทนแขก</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border bg-white shadow-lg z-10">
                <button
                  onClick={() => handleExport('csv')}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <FileText className="h-4 w-4" />
                  Export to CSV
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export to Excel
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  <Printer className="h-4 w-4" />
                  Export to PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">จำนวนการจองทั้งหมด</p>
              <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
            </div>
            <Calendar className="h-10 w-10 text-blue-600" />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">ยืนยันแล้ว</p>
              <p className="text-2xl font-bold text-blue-600">{confirmedCount}</p>
            </div>
            <CheckCircle className="h-10 w-10 text-blue-600" />
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">เสร็จสิ้น</p>
              <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>

        <div className="rounded-lg bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">รายได้รวม</p>
              <p className="text-2xl font-bold">฿{totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-10 w-10 opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-lg bg-white p-4 shadow">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="ค้นหาด้วย ชื่อลูกค้า, เลขจอง, เบอร์โทร, เลขห้อง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="rounded-lg border px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">ทุกช่วงเวลา</option>
            <option value="today">วันนี้</option>
            <option value="week">7 วันที่แล้ว</option>
            <option value="month">30 วันที่แล้ว</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="confirmed">ยืนยันแล้ว</option>
            <option value="pending">รอยืนยัน</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="cancelled">ยกเลิก</option>
            <option value="no_show">ไม่มาใช้บริการ</option>
          </select>
        </div>
      </div>

      {/* Results */}
      <div className="text-sm text-gray-500">พบ {filteredBookings.length} รายการ</div>

      {/* Bookings Table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">เลขที่จอง</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">ลูกค้า</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">บริการ</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">วันที่ใช้บริการ</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">เวลา</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">ช่าง</th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">ราคา</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">สถานะ</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">การชำระเงิน</th>
                <th className="px-6 py-3 text-center text-sm font-medium text-gray-700">การกระทำ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-500">ไม่พบรายการจอง</p>
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{booking.booking_number}</p>
                        {booking.room_number && (
                          <p className="flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            ห้อง {booking.room_number}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{booking.customer_name}</p>
                        <p className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="h-3 w-3" />
                          {booking.customer_phone}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-900">{booking.service_name}</p>
                        <p className="text-xs text-gray-500">{booking.duration} นาที</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">
                      {formatDate(booking.service_date)}
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-900">
                      {formatTime(booking.service_time)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {booking.staff_name || '-'}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      ฿{Number(booking.total_price).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">{getStatusBadge(booking.status)}</td>
                    <td className="px-6 py-4 text-center">
                      {getPaymentStatusBadge(booking.payment_status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => setSelectedBooking(booking)}
                          className="rounded p-1 text-blue-600 hover:bg-blue-50"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingBooking(booking)}
                          className="rounded p-1 text-gray-600 hover:bg-gray-100"
                          title="แก้ไข"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Notes Section */}
        {filteredBookings.some((b) => b.notes) && (
          <div className="border-t p-4">
            <h3 className="mb-2 text-sm font-medium text-gray-700">หมายเหตุ</h3>
            {filteredBookings
              .filter((b) => b.notes)
              .slice(0, 3)
              .map((booking) => (
                <div key={booking.id} className="mb-2 text-sm text-gray-600">
                  <span className="font-medium">{booking.booking_number}:</span> {booking.notes}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Booking Detail Modal */}
      <BookingDetailModal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
      />

      {/* Booking Edit Modal */}
      <BookingEditModal
        isOpen={!!editingBooking}
        onClose={() => setEditingBooking(null)}
        onSuccess={() => {
          setEditingBooking(null)
          refetch()
        }}
        booking={editingBooking}
      />
    </div>
  )
}
