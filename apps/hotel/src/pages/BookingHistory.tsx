import { useState } from 'react'
import { Search, Calendar, Download, Eye } from 'lucide-react'

function BookingHistory() {
  const [searchQuery, setSearchQuery] = useState('')
  const [monthFilter, setMonthFilter] = useState('2026-01')

  const bookings = [
    {
      id: 'BK001',
      guestName: 'John Smith',
      roomNumber: '1505',
      service: 'Thai Massage (2 hours)',
      date: '2026-01-15',
      time: '14:00',
      amount: 640,
      status: 'completed',
    },
    {
      id: 'BK002',
      guestName: 'Jane Doe',
      roomNumber: '1203',
      service: 'Gel Manicure',
      date: '2026-01-15',
      time: '10:30',
      amount: 360,
      status: 'completed',
    },
    {
      id: 'BK003',
      guestName: 'Robert Chen',
      roomNumber: '1802',
      service: 'Oil Massage (2 hours)',
      date: '2026-01-14',
      time: '16:00',
      amount: 800,
      status: 'completed',
    },
    {
      id: 'BK004',
      guestName: 'Michael Brown',
      roomNumber: '707',
      service: 'Luxury Spa Package',
      date: '2026-01-14',
      time: '15:00',
      amount: 2000,
      status: 'completed',
    },
    {
      id: 'BK005',
      guestName: 'Sarah Wilson',
      roomNumber: '901',
      service: 'Facial Treatment',
      date: '2026-01-13',
      time: '11:00',
      amount: 960,
      status: 'completed',
    },
    {
      id: 'BK006',
      guestName: 'Emily Davis',
      roomNumber: '404',
      service: 'Foot Massage',
      date: '2026-01-13',
      time: '13:00',
      amount: 320,
      status: 'cancelled',
    },
    {
      id: 'BK007',
      guestName: 'David Lee',
      roomNumber: '505',
      service: 'Thai Massage (2 hours)',
      date: '2026-01-12',
      time: '09:00',
      amount: 640,
      status: 'completed',
    },
    {
      id: 'BK008',
      guestName: 'Lisa Anderson',
      roomNumber: '606',
      service: 'Gel Manicure',
      date: '2026-01-12',
      time: '14:30',
      amount: 360,
      status: 'completed',
    },
    {
      id: 'BK009',
      guestName: 'Tom Wilson',
      roomNumber: '302',
      service: 'Oil Massage (2 hours)',
      date: '2026-01-11',
      time: '10:00',
      amount: 800,
      status: 'completed',
    },
    {
      id: 'BK010',
      guestName: 'Amy Chen',
      roomNumber: '201',
      service: 'Luxury Spa Package',
      date: '2026-01-10',
      time: '16:00',
      amount: 2000,
      status: 'completed',
    },
  ]

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      searchQuery === '' ||
      booking.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.roomNumber.includes(searchQuery) ||
      booking.service.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  // Calculate monthly stats
  const completedBookings = filteredBookings.filter((b) => b.status === 'completed')
  const totalRevenue = completedBookings.reduce((sum, b) => sum + b.amount, 0)
  const cancelledBookings = filteredBookings.filter((b) => b.status === 'cancelled')

  // Group by date
  const groupedByDate = filteredBookings.reduce((acc, booking) => {
    if (!acc[booking.date]) {
      acc[booking.date] = []
    }
    acc[booking.date].push(booking)
    return acc
  }, {} as Record<string, typeof bookings>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">ประวัติการจอง</h1>
          <p className="text-stone-500">Booking History</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-medium hover:bg-stone-200 transition">
          <Download className="w-5 h-5" />
          ส่งออกรายงาน
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-stone-900">{completedBookings.length}</p>
          <p className="text-xs text-stone-500">การจองสำเร็จ</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-amber-700">
            ฿{totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-stone-500">รายได้รวม</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 border border-stone-100">
          <p className="text-2xl font-bold text-red-600">{cancelledBookings.length}</p>
          <p className="text-xs text-stone-500">การยกเลิก</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-stone-100">
        <div className="flex flex-col sm:flex-row gap-4">
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
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="pl-10 pr-4 py-2 bg-stone-100 border-0 rounded-xl focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Bookings by Date */}
      <div className="space-y-6">
        {Object.entries(groupedByDate)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, dayBookings]) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-stone-900">{date}</h3>
                <span className="text-sm text-stone-500">
                  {dayBookings.filter((b) => b.status === 'completed').length} การจอง • ฿
                  {dayBookings.filter((b) => b.status === 'completed').reduce((sum, b) => sum + b.amount, 0).toLocaleString()}
                </span>
              </div>
              <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-stone-100">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">แขก</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">ห้อง</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">บริการ</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">เวลา</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">จำนวน</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayBookings.map((booking) => (
                        <tr key={booking.id} className="border-b border-stone-100 hover:bg-stone-50">
                          <td className="py-3 px-4 text-sm font-medium text-stone-900">
                            {booking.guestName}
                          </td>
                          <td className="py-3 px-4 text-sm text-amber-700">#{booking.roomNumber}</td>
                          <td className="py-3 px-4 text-sm text-stone-600">{booking.service}</td>
                          <td className="py-3 px-4 text-sm text-stone-600">{booking.time}</td>
                          <td className="py-3 px-4 text-sm font-medium text-amber-700">
                            ฿{booking.amount}
                          </td>
                          <td className="py-3 px-4">
                            {booking.status === 'completed' ? (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                เสร็จสิ้น
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                ยกเลิก
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

export default BookingHistory
