import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Filter, Eye, Download, Calendar, Clock, DollarSign, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const bookings = [
  {
    id: 'BK20260115001',
    customer: 'สมชาย ใจดี',
    customerPhone: '081-234-5678',
    service: 'Thai Massage (2 hours)',
    category: 'massage',
    hotel: null,
    staff: 'สมหญิง นวดเก่ง',
    date: '2026-01-15',
    time: '14:00',
    duration: 120,
    amount: 800,
    status: 'confirmed',
    paymentStatus: 'paid',
    address: '123 ถนนสุขุมวิท ปทุมวัน',
  },
  {
    id: 'BK20260115002',
    customer: 'วิภาดา สุขสันต์',
    customerPhone: '082-345-6789',
    service: 'Gel Manicure',
    category: 'nail',
    hotel: 'โรงแรมฮิลตัน',
    staff: 'ดอกไม้ ทำเล็บเก่ง',
    date: '2026-01-15',
    time: '10:30',
    duration: 60,
    amount: 360,
    status: 'completed',
    paymentStatus: 'paid',
    address: 'โรงแรมฮิลตัน ห้อง 1505',
  },
  {
    id: 'BK20260115003',
    customer: 'กิตติ เก่งการค้า',
    customerPhone: '083-456-7890',
    service: 'Luxury Spa Package',
    category: 'spa',
    hotel: null,
    staff: 'แก้ว สปาชำนาญ',
    date: '2026-01-15',
    time: '16:00',
    duration: 150,
    amount: 2000,
    status: 'in-progress',
    paymentStatus: 'paid',
    address: '456 ถนนสีลม สีลม',
  },
  {
    id: 'BK20260115004',
    customer: 'มานี มีตา',
    customerPhone: '084-567-8901',
    service: 'Oil Massage (2 hours)',
    category: 'massage',
    hotel: 'รีสอร์ทในฝัน',
    staff: null,
    date: '2026-01-15',
    time: '13:00',
    duration: 120,
    amount: 800,
    status: 'pending',
    paymentStatus: 'pending',
    address: 'รีสอร์ทในฝัน ห้อง 302',
  },
  {
    id: 'BK20260115005',
    customer: 'ประยุทธ์ มั่งมี',
    customerPhone: '085-678-9012',
    service: 'Facial Treatment',
    category: 'spa',
    hotel: null,
    staff: 'แก้ว สปาชำนาญ',
    date: '2026-01-15',
    time: '11:00',
    duration: 90,
    amount: 960,
    status: 'cancelled',
    paymentStatus: 'refunded',
    address: '789 ถนนพระราม 3 บางนา',
  },
]

function Bookings() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'>('all')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      searchQuery === '' ||
      booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
          <h1 className="text-2xl font-bold text-stone-900">การจองทั้งหมด</h1>
          <p className="text-stone-500">All Bookings</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition">
          <Download className="w-5 h-5" />
          ส่งออกรายงาน
        </button>
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
          <p className="text-xs text-stone-500">กำลังดำเนินการ</p>
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
              placeholder="ค้นหารหัส, ชื่อลูกค้า, บริการ..."
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
              {filteredBookings.map((booking) => (
                <tr key={booking.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-3 px-4 text-sm font-medium text-stone-900">{booking.id}</td>
                  <td className="py-3 px-4">
                    <div>
                      <p className="text-sm font-medium text-stone-900">{booking.customer}</p>
                      <p className="text-xs text-stone-500">{booking.customerPhone}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-stone-600">
                    <p>{booking.service}</p>
                    <p className="text-xs text-stone-400">{booking.duration} นาที</p>
                  </td>
                  <td className="py-3 px-4 text-sm text-amber-700">{booking.hotel || '-'}</td>
                  <td className="py-3 px-4 text-sm text-stone-600">{booking.staff || 'รอมอบหมาย'}</td>
                  <td className="py-3 px-4 text-sm text-stone-600">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{booking.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{booking.time}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-stone-900">฿{booking.amount}</td>
                  <td className="py-3 px-4">{getStatusBadge(booking.status)}</td>
                  <td className="py-3 px-4">{getPaymentBadge(booking.paymentStatus)}</td>
                  <td className="py-3 px-4">
                    <button className="p-2 hover:bg-stone-100 rounded-lg transition" title="ดูรายละเอียด">
                      <Eye className="w-4 h-4 text-stone-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Bookings
