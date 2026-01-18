import { useState } from 'react'
import { Download, Calendar, TrendingUp, DollarSign, Users, BarChart3 } from 'lucide-react'

function Reports() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">รายงาน</h1>
          <p className="text-stone-500">Reports & Analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="px-4 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-amber-500">
            <option>เดือนนี้</option>
            <option>ไตรมาสนี้</option>
            <option>6 เดือนล่าสุด</option>
            <option>ปีนี้</option>
          </select>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-700 to-amber-800 text-white rounded-xl font-medium hover:from-amber-800 hover:to-amber-900 transition">
            <Download className="w-5 h-5" />
            ส่งออกรายงาน
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">รายได้รวม</p>
              <p className="text-3xl font-bold mt-2">฿1,245,600</p>
              <p className="text-sm opacity-90 mt-2">+12.5% จากเดือนก่อน</p>
            </div>
            <DollarSign className="w-12 h-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">การจองทั้งหมด</p>
              <p className="text-3xl font-bold mt-2">1,256</p>
              <p className="text-sm opacity-90 mt-2">+8.3% จากเดือนก่อน</p>
            </div>
            <Calendar className="w-12 h-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">ลูกค้าใหม่</p>
              <p className="text-3xl font-bold mt-2">89</p>
              <p className="text-sm opacity-90 mt-2">+15 คน</p>
            </div>
            <Users className="w-12 h-12 opacity-80" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">ค่าเฉลี่ยต่อการจอง</p>
              <p className="text-3xl font-bold mt-2">฿991</p>
              <p className="text-sm opacity-90 mt-2">+3.2% จากเดือนก่อน</p>
            </div>
            <TrendingUp className="w-12 h-12 opacity-80" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <h2 className="text-lg font-semibold text-stone-900 mb-6">รายได้รายวัน</h2>
          <div className="h-64 flex items-end justify-between gap-2">
            {[
              { day: '1', value: 65 },
              { day: '5', value: 80 },
              { day: '10', value: 45 },
              { day: '15', value: 90 },
              { day: '20', value: 70 },
              { day: '25', value: 85 },
              { day: '30', value: 95 },
            ].map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-lg transition-all hover:from-amber-800 hover:to-amber-700"
                  style={{ height: `${item.value}%` }}
                />
                <span className="text-xs text-stone-500">{item.day}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-r from-amber-700 to-amber-600 rounded"></div>
              <span className="text-stone-600">รายได้ (฿)</span>
            </div>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
          <h2 className="text-lg font-semibold text-stone-900 mb-6">การจองตามหมวดหมู่</h2>
          <div className="space-y-4">
            {[
              { category: 'นวด', count: 456, percentage: 45, color: 'bg-amber-500' },
              { category: 'เล็บ', count: 312, percentage: 31, color: 'bg-pink-500' },
              { category: 'สปา', count: 245, percentage: 24, color: 'bg-purple-500' },
            ].map((item) => (
              <div key={item.category}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-stone-700">{item.category}</span>
                  <span className="text-sm text-stone-500">{item.count} ({item.percentage}%)</span>
                </div>
                <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${item.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Services */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
        <h2 className="text-lg font-semibold text-stone-900 mb-6">บริการยอดนิยมประจำเดือน</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">อันดับ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">บริการ</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">การจอง</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">รายได้</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-stone-700">เติบโต</th>
              </tr>
            </thead>
            <tbody>
              {[
                { rank: 1, service: 'Thai Massage (2 hours)', bookings: 234, revenue: 187200, growth: '+15%' },
                { rank: 2, service: 'Oil Massage (2 hours)', bookings: 189, revenue: 189000, growth: '+12%' },
                { rank: 3, service: 'Luxury Spa Package', bookings: 145, revenue: 362500, growth: '+22%' },
                { rank: 4, service: 'Gel Manicure', bookings: 123, revenue: 55350, growth: '+8%' },
                { rank: 5, service: 'Facial Treatment', bookings: 98, revenue: 117600, growth: '+5%' },
              ].map((item) => (
                <tr key={item.rank} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-3 px-4">
                    <span className="w-8 h-8 bg-gradient-to-r from-amber-700 to-amber-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {item.rank}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-stone-900">{item.service}</td>
                  <td className="py-3 px-4 text-sm text-stone-600">{item.bookings}</td>
                  <td className="py-3 px-4 text-sm font-medium text-amber-700">฿{item.revenue.toLocaleString()}</td>
                  <td className="py-3 px-4 text-sm font-medium text-green-600">{item.growth}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hotel Performance */}
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-stone-100">
        <h2 className="text-lg font-semibold text-stone-900 mb-6">ประสิทธิ์โรงแรม</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'โรงแรมฮิลตัน', bookings: 156, revenue: 245000, commission: '20%' },
            { name: 'รีสอร์ทในฝัน', bookings: 89, revenue: 156000, commission: '15%' },
            { name: 'โรงแรมดุสิต ธานี', bookings: 234, revenue: 378000, commission: '25%' },
          ].map((hotel, index) => (
            <div key={index} className="p-4 bg-stone-50 rounded-xl border border-stone-100">
              <h3 className="font-semibold text-stone-900 mb-3">{hotel.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-500">การจอง:</span>
                  <span className="font-medium text-stone-700">{hotel.bookings}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">รายได้:</span>
                  <span className="font-medium text-amber-700">฿{hotel.revenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">ค่าคอมมิชชั่น:</span>
                  <span className="font-medium text-stone-700">{hotel.commission}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Reports
