import { useState } from 'react'
import { Search, Filter, Eye, MapPin, Calendar, Clock, User } from 'lucide-react'

function GuestBookings() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  const bookings = [
    {
      id: 'BK001',
      guestName: 'John Smith',
      roomNumber: '1505',
      service: 'Thai Massage (2 hours)',
      date: '2026-01-15',
      time: '14:00',
      staff: 'สมหญิง นวดเก่ง',
      amount: 640,
      status: 'completed',
      paymentStatus: 'paid',
    },
    {
      id: 'BK002',
      guestName: 'Jane Doe',
      roomNumber: '1203',
      service: 'Gel Manicure',
      date: '2026-01-15',
      time: '10:30',
      staff: 'ดอกไม้ ทำเล็บเก่ง',
      amount: 360,
      status: 'in-progress',
      paymentStatus: 'paid',
    },
    {
      id: 'BK003',
      guestName: 'Robert Chen',
      roomNumber: '1802',
      service: 'Oil Massage (2 hours)',
      date: '2026-01-15',
      time: '16:00',
      staff: 'แก้ว สปาชำนาญ',
      amount: 800,
      status: 'confirmed',
      paymentStatus: 'pending',
    },
    {
      id: 'BK004',
      guestName: 'Sarah Wilson',
      roomNumber: '901',
      service: 'Facial Treatment',
      date: '2026-01-15',
      time: '11:00',
      staff: null,
      amount: 960,
      status: 'pending',
      paymentStatus: 'pending',
    },
    {
      id: 'BK005',
      guestName: 'Michael Brown',
      roomNumber: '707',
      service: 'Luxury Spa Package',
      date: '2026-01-14',
      time: '15:00',
      staff: 'แก้ว สปาชำนาญ',
      amount: 2000,
      status: 'completed',
      paymentStatus: 'paid',
    },
    {
      id: 'BK006',
      guestName: 'Emily Davis',
      roomNumber: '404',
      service: 'Foot Massage',
      date: '2026-01-14',
      time: '13:00',
      staff: 'สมหญิง นวดเก่ง',
      amount: 320,
      status: 'cancelled',
      paymentStatus: 'refunded',
    },
  ]

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      searchQuery === '' ||
      booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.roomNumber.includes(searchQuery) ||
      booking.service.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
    return matchesSearch && matchesStatus
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
          <h1 className="text-2xl font-bold text-stone-900">การจองของแขก</h1>
          <p className="text-stone-500">Guest Bookings</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-stone-900">{bookings.length}</p>
          <p className="text-xs text-stone-500">ทั้งหมด</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-yellow-600">
            {bookings.filter((b) => b.status === 'pending').length}
          </p>
          <p className="text-xs text-stone-500">รอดำเนินการ</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-blue-600">
            {bookings.filter((b) => b.status === 'confirmed').length}
          </p>
          <p className="text-xs text-stone-500">ยืนยันแล้ว</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-purple-600">
            {bookings.filter((b) => b.status === 'in-progress').length}
          </p>
          <p className="text-xs text-stone-500">กำลังให้บริการ</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-green-600">
            {bookings.filter((b) => b.status === 'completed').length}
          </p>
          <p className="text-xs text-stone-500">เสร็จสิ้น</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-amber-700">
            ฿{bookings.reduce((sum, b) => sum + b.amount, 0).toLocaleString()}
          </p>
          <p className="text-xs text-stone-500">ยอดรวม</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-stone-100">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder="ค้นหารหัส, ชื่อแขก, ห้อง, บริการ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500 focus:bg-white transition"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">สถานะทั้งหมด</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="confirmed">ยืนยันแล้ว</option>
            <option value="in-progress">กำลังดำเนินการ</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="cancelled">ยกเลิก</option>
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

      {/* Results */}
      <div className="text-sm text-stone-500">
        พบ {filteredBookings.length} การจอง
      </div>

      {/* Bookings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredBookings.map((booking) => (
          <div key={booking.id} className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100 hover:shadow-xl transition">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-700 to-amber-800 rounded-xl flex items-center justify-center text-white font-bold">
                  #{booking.roomNumber}
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900">{booking.guestName}</h3>
                  <p className="text-xs text-stone-500">{booking.id}</p>
                </div>
              </div>
              {getStatusBadge(booking.status)}
            </div>

            {/* Service Info */}
            <div className="space-y-3 mb-4">
              <div>
                <p className="text-sm font-medium text-stone-900">{booking.service}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-stone-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {booking.date}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {booking.time}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-stone-600">
                <User className="w-4 h-4" />
                <span>พนักงาน: {booking.staff || 'รอมอบหมาย'}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-stone-100">
              <div>
                <p className="text-lg font-bold text-amber-700">฿{booking.amount}</p>
                {getPaymentBadge(booking.paymentStatus)}
              </div>
              <button className="p-2 hover:bg-stone-100 rounded-lg transition" title="ดูรายละเอียด">
                <Eye className="w-5 h-5 text-stone-600" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GuestBookings
