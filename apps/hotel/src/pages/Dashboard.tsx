import { Link } from 'react-router-dom'
import { Calendar, Clock, DollarSign, TrendingUp, Users, CheckCircle, AlertCircle } from 'lucide-react'

function Dashboard() {
  // Mock data
  const stats = [
    { name: 'การจองวันนี้', value: '12', change: '+3', trend: 'up', icon: Calendar },
    { name: 'รายได้เดือนนี้', value: '฿45,200', change: '+12.5%', trend: 'up', icon: DollarSign },
    { name: 'แขกที่ใช้บริการ', value: '156', change: '+23', trend: 'up', icon: Users },
    { name: 'บิลค้างชำระ', value: '฿12,500', change: 'ต้องชำระ', trend: 'neutral', icon: AlertCircle },
  ]

  const recentBookings = [
    {
      id: 'BK001',
      guest: 'John Smith',
      room: '1505',
      service: 'Thai Massage (2 hours)',
      time: '14:00',
      staff: 'สมหญิง นวดเก่ง',
      status: 'completed',
      amount: 640,
    },
    {
      id: 'BK002',
      guest: 'Jane Doe',
      room: '1203',
      service: 'Gel Manicure',
      time: '10:30',
      staff: 'ดอกไม้ ทำเล็บเก่ง',
      status: 'in-progress',
      amount: 360,
    },
    {
      id: 'BK003',
      guest: 'Robert Chen',
      room: '1802',
      service: 'Oil Massage (2 hours)',
      time: '16:00',
      staff: 'แก้ว สปาชำนาญ',
      status: 'confirmed',
      amount: 640,
    },
    {
      id: 'BK004',
      guest: 'Sarah Wilson',
      room: '901',
      service: 'Facial Treatment',
      time: '11:00',
      staff: null,
      status: 'pending',
      amount: 960,
    },
  ]

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">ภาพรวม</h1>
        <p className="text-stone-500">Dashboard</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.name} className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${
                  stat.trend === 'up' ? 'bg-green-100' :
                  stat.trend === 'down' ? 'bg-red-100' :
                  'bg-amber-100'
                }`}>
                  <Icon className={`w-6 h-6 ${
                    stat.trend === 'up' ? 'text-green-600' :
                    stat.trend === 'down' ? 'text-red-600' :
                    'text-amber-600'
                  }`} />
                </div>
                {stat.trend === 'up' && (
                  <div className="flex items-center gap-1 text-green-600">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">{stat.change}</span>
                  </div>
                )}
                {stat.trend === 'neutral' && (
                  <span className="text-sm text-amber-600 font-medium">{stat.change}</span>
                )}
              </div>
              <p className="text-2xl font-bold text-stone-900">{stat.value}</p>
              <p className="text-sm text-stone-500">{stat.name}</p>
            </div>
          )
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/hotel/book"
          className="bg-gradient-to-br from-amber-700 to-amber-800 rounded-2xl shadow-lg p-6 text-white hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">จองบริการให้แขก</h3>
              <p className="text-sm opacity-90">Book for Guest</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl group-hover:bg-white/30 transition">
              <Calendar className="w-6 h-6" />
            </div>
          </div>
        </Link>

        <Link
          to="/hotel/guests"
          className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100 hover:shadow-xl transition group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-stone-900 mb-1">ดูการจองทั้งหมด</h3>
              <p className="text-sm text-stone-500">View All Bookings</p>
            </div>
            <div className="p-3 bg-stone-100 rounded-xl group-hover:bg-stone-200 transition">
              <Users className="w-6 h-6 text-stone-600" />
            </div>
          </div>
        </Link>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-2xl shadow-lg border border-stone-100">
        <div className="flex items-center justify-between p-6 border-b border-stone-100">
          <h2 className="text-lg font-semibold text-stone-900">การจองล่าสุด</h2>
          <Link to="/hotel/guests" className="text-sm text-amber-700 hover:text-amber-800 font-medium">
            ดูทั้งหมด →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">แขก</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">ห้อง</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">บริการ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">เวลา</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">พนักงาน</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">จำนวน</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {recentBookings.map((booking) => (
                <tr key={booking.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-3 px-4 text-sm font-medium text-stone-900">{booking.guest}</td>
                  <td className="py-3 px-4 text-sm text-stone-600">#{booking.room}</td>
                  <td className="py-3 px-4 text-sm text-stone-600">{booking.service}</td>
                  <td className="py-3 px-4 text-sm text-stone-600">{booking.time}</td>
                  <td className="py-3 px-4 text-sm text-stone-600">{booking.staff || '-'}</td>
                  <td className="py-3 px-4 text-sm font-medium text-amber-700">฿{booking.amount}</td>
                  <td className="py-3 px-4">{getStatusBadge(booking.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hotel Info Card */}
      <div className="bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-2">ข้อมูลโรงแรมของคุณ</h3>
            <p className="text-stone-300 text-sm mb-4">โรงแรมฮิลตัน อยุธยา (Hilton Bangkok)</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-stone-400">ส่วนลด</p>
                <p className="text-xl font-bold text-amber-400">20%</p>
              </div>
              <div>
                <p className="text-stone-400">บิลปัจจุบัน</p>
                <p className="text-xl font-bold">฿12,500</p>
              </div>
            </div>
          </div>
          <Link
            to="/hotel/profile"
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium transition"
          >
            แก้ไขข้อมูล
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
