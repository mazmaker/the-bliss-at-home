import { Link } from 'react-router-dom'
import {
  Users,
  Calendar,
  Building,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Star,
  ArrowRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react'
import { SOSWidget } from '../components/SOSWidget'

// Mock data
const stats = [
  {
    name: 'ยอดขายวันนี้',
    nameEn: 'Today\'s Sales',
    value: '฿45,200',
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
    color: 'from-green-500 to-emerald-600',
  },
  {
    name: 'การจองวันนี้',
    nameEn: 'Today\'s Bookings',
    value: '28',
    change: '+8',
    trend: 'up',
    icon: Calendar,
    color: 'from-blue-500 to-blue-600',
  },
  {
    name: 'พนักงานทั้งหมด',
    nameEn: 'Total Staff',
    value: '156',
    change: '+3',
    trend: 'up',
    icon: Users,
    color: 'from-purple-500 to-purple-600',
  },
  {
    name: 'โรงแรมที่ใช้งาน',
    nameEn: 'Active Hotels',
    value: '24',
    change: '+2',
    trend: 'up',
    icon: Building,
    color: 'from-amber-500 to-amber-600',
  },
]

const recentBookings = [
  {
    id: 'BK20260115001',
    customer: 'สมชาย ใจดี',
    service: 'Thai Massage (2 hours)',
    hotel: null,
    date: '15 ม.ค. 2026',
    time: '14:00',
    amount: 800,
    status: 'confirmed',
  },
  {
    id: 'BK20260115002',
    customer: 'วิภาดา สุขสันต์',
    service: 'Gel Manicure',
    hotel: 'โรงแรมฮิลตัน',
    date: '15 ม.ค. 2026',
    time: '10:30',
    amount: 450,
    status: 'completed',
  },
  {
    id: 'BK20260115003',
    customer: 'กิตติ เก่งการค้า',
    service: 'Luxury Spa Package',
    hotel: null,
    date: '15 ม.ค. 2026',
    time: '16:00',
    amount: 2500,
    status: 'in-progress',
  },
  {
    id: 'BK20260115004',
    customer: 'มานี มีตา',
    service: 'Oil Massage (2 hours)',
    hotel: 'รีสอร์ทในฝัน',
    date: '15 ม.ค. 2026',
    time: '13:00',
    amount: 1000,
    status: 'pending',
  },
  {
    id: 'BK20260115005',
    customer: 'ประยุทธ์ มั่งมี',
    service: 'Facial Treatment',
    hotel: null,
    date: '15 ม.ค. 2026',
    time: '11:00',
    amount: 1200,
    status: 'cancelled',
  },
]

const pendingApprovals = [
  {
    id: 'STF001',
    name: 'สมหญิง นวดเก่ง',
    skill: 'Massage',
    experience: '5 ปี',
    rating: 4.8,
    appliedDate: '14 ม.ค. 2026',
  },
  {
    id: 'STF002',
    name: 'ดอกไม้ ทำเล็บเก่ง',
    skill: 'Nail Care',
    experience: '3 ปี',
    rating: 4.9,
    appliedDate: '14 ม.ค. 2026',
  },
  {
    id: 'STF003',
    name: 'แก้ว สปาชำนาญ',
    skill: 'Spa',
    experience: '7 ปี',
    rating: 4.7,
    appliedDate: '13 ม.ค. 2026',
  },
]

const popularServices = [
  { name: 'Thai Massage (2 hours)', bookings: 245, revenue: 196000, change: '+15%' },
  { name: 'Oil Massage (2 hours)', bookings: 198, revenue: 198000, change: '+12%' },
  { name: 'Gel Manicure', bookings: 156, revenue: 70200, change: '+8%' },
  { name: 'Luxury Spa Package', bookings: 89, revenue: 222500, change: '+22%' },
  { name: 'Facial Treatment', bookings: 78, revenue: 93600, change: '+5%' },
]

function getStatusBadge(status: string) {
  const badges = {
    confirmed: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    'in-progress': 'bg-purple-100 text-purple-700',
    pending: 'bg-yellow-100 text-yellow-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  const labels = {
    confirmed: 'ยืนยันแล้ว',
    completed: 'เสร็จสิ้น',
    'in-progress': 'กำลังดำเนินการ',
    pending: 'รอดำเนินการ',
    cancelled: 'ยกเลิก',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${badges[status as keyof typeof badges]}`}>
      {labels[status as keyof typeof labels]}
    </span>
  )
}

function Dashboard() {
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
          <span>อัปเดตล่าสุด: 15 ม.ค. 2026, 14:30</span>
        </div>
      </div>

      {/* SOS Emergency Widget - Highest Priority */}
      <SOSWidget />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.name}
              className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100 hover:shadow-xl transition"
            >
              <div className="flex items-start justify-between">
                <div className="p-3 bg-gradient-to-br rounded-xl">
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${
                    stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {stat.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>{stat.change}</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold text-stone-900">{stat.value}</p>
                <p className="text-sm text-stone-500">{stat.name}</p>
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
                {recentBookings.map((booking) => (
                  <tr key={booking.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 px-4 text-sm font-medium text-stone-900">{booking.id}</td>
                    <td className="py-3 px-4 text-sm text-stone-600">{booking.customer}</td>
                    <td className="py-3 px-4 text-sm text-stone-600">
                      <div>{booking.service}</div>
                      {booking.hotel && (
                        <div className="text-xs text-amber-700">{booking.hotel}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-stone-600">
                      <div>{booking.date}</div>
                      <div className="text-xs">{booking.time}</div>
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-stone-900">฿{booking.amount}</td>
                    <td className="py-3 px-4">{getStatusBadge(booking.status)}</td>
                  </tr>
                ))}
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
              {pendingApprovals.length}
            </span>
          </div>

          <div className="space-y-4">
            {pendingApprovals.map((staff) => (
              <div
                key={staff.id}
                className="p-4 bg-stone-50 rounded-xl hover:bg-stone-100 transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-amber-700 to-amber-800 rounded-full flex items-center justify-center text-white font-semibold">
                      {staff.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">{staff.name}</p>
                      <p className="text-sm text-stone-500">{staff.skill}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-amber-700">
                    <Star className="w-4 h-4 fill-amber-700" />
                    <span className="text-sm font-medium">{staff.rating}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-stone-500">
                  <span>ประสบการณ์ {staff.experience}</span>
                  <span>สมัคร {staff.appliedDate}</span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 px-3 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white text-sm rounded-lg hover:from-amber-800 hover:to-amber-900 transition">
                    อนุมัติ
                  </button>
                  <button className="flex-1 px-3 py-2 bg-stone-200 text-stone-700 text-sm rounded-lg hover:bg-stone-300 transition">
                    ปฏิเสธ
                  </button>
                </div>
              </div>
            ))}
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

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {popularServices.map((service, index) => (
            <div
              key={service.name}
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
                  <span className="font-medium text-stone-900">฿{service.revenue.toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-2 text-xs font-medium text-green-600">{service.change}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">156</p>
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
              <p className="text-2xl font-bold text-stone-900">12</p>
              <p className="text-sm text-stone-500">รอติดตาม</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-xl">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-stone-900">3</p>
              <p className="text-sm text-stone-500">การยกเลิกวันนี้</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
