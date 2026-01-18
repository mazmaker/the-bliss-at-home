import { useState } from 'react'
import { Calendar, Download, TrendingUp, DollarSign, PieChart } from 'lucide-react'

function StaffEarnings() {
  const [selectedMonth, setSelectedMonth] = useState('2026-01')

  // Mock earnings data
  const monthlyStats = {
    month: 'มกราคม 2026',
    totalEarnings: 45600,
    totalJobs: 28,
    totalHours: 56,
    averagePerJob: 1628,
    tips: 1850,
    rating: 4.8,
  }

  const dailyEarnings = [
    { date: '15 ม.ค.', earnings: 3200, jobs: 3 },
    { date: '14 ม.ค.', earnings: 2600, jobs: 2 },
    { date: '13 ม.ค.', earnings: 0, jobs: 0 },
    { date: '12 ม.ค.', earnings: 4500, jobs: 4 },
    { date: '11 ม.ค.', earnings: 1800, jobs: 2 },
    { date: '10 ม.ค.', earnings: 3900, jobs: 3 },
    { date: '9 ม.ค.', earnings: 2200, jobs: 2 },
    { date: '8 ม.ค.', earnings: 4800, jobs: 4 },
    { date: '7 ม.ค.', earnings: 1500, jobs: 1 },
    { date: '6 ม.ค.', earnings: 0, jobs: 0 },
    { date: '5 ม.ค.', earnings: 3200, jobs: 3 },
    { date: '4 ม.ค.', earnings: 2800, jobs: 2 },
  ]

  const serviceBreakdown = [
    { service: 'นวดไทย', count: 12, earnings: 19200, percentage: 42 },
    { service: 'นวดน้ำมัน', count: 8, earnings: 14400, percentage: 32 },
    { service: 'เล็บ', count: 4, earnings: 4800, percentage: 11 },
    { service: 'สปา', count: 3, earnings: 6000, percentage: 13 },
    { service: 'ทรีตเมนท์หน้า', count: 1, earnings: 1200, percentage: 2 },
  ]

  const recentPayouts = [
    { date: '2026-01-01', period: 'ธันวาคม 2025', amount: 42500, status: 'paid' },
    { date: '2026-01-15', period: 'มกราคม 2026', amount: 47450, status: 'pending' },
  ]

  const maxEarnings = Math.max(...dailyEarnings.map((d) => d.earnings))

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">รายได้</h1>
          <p className="text-stone-500">Earnings</p>
        </div>
        <button className="p-2 bg-white rounded-lg shadow">
          <Download className="w-5 h-5 text-stone-600" />
        </button>
      </div>

      {/* Month Selector */}
      <div className="bg-white rounded-xl shadow p-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-stone-400" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex-1 px-3 py-2 bg-stone-100 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="bg-gradient-to-br from-amber-700 to-amber-800 rounded-2xl shadow-lg p-4 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm opacity-90">{monthlyStats.month}</p>
            <p className="text-3xl font-bold">฿{monthlyStats.totalEarnings.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold">{monthlyStats.totalJobs}</p>
            <p className="text-xs opacity-80">งาน</p>
          </div>
          <div>
            <p className="text-lg font-bold">{monthlyStats.totalHours}</p>
            <p className="text-xs opacity-80">ชั่วโมง</p>
          </div>
          <div>
            <p className="text-lg font-bold">฿{monthlyStats.averagePerJob}</p>
            <p className="text-xs opacity-80">เฉลี่ย/งาน</p>
          </div>
          <div>
            <p className="text-lg font-bold">★{monthlyStats.rating}</p>
            <p className="text-xs opacity-80">คะแนน</p>
          </div>
        </div>
      </div>

      {/* Tips Card */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <span className="text-lg">💰</span>
            </div>
            <div>
              <p className="text-sm text-stone-500">ทิปรวม</p>
              <p className="text-lg font-bold text-yellow-600">฿{monthlyStats.tips.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-green-600">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">+12%</span>
          </div>
        </div>
      </div>

      {/* Daily Earnings Chart */}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-semibold text-stone-900 mb-4">รายได้รายวัน</h3>
        <div className="flex items-end justify-between gap-1 h-32">
          {dailyEarnings.map((day) => (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
              <div
                className="w-full bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-lg transition-all hover:from-amber-800 hover:to-amber-700"
                style={{ height: `${(day.earnings / maxEarnings) * 100}%` }}
              />
              <span className="text-xs text-stone-500">{day.date.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Service Breakdown */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-stone-400" />
          <h3 className="font-semibold text-stone-900">แยกตามบริการ</h3>
        </div>
        <div className="space-y-3">
          {serviceBreakdown.map((item) => (
            <div key={item.service}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-stone-700">{item.service}</span>
                <span className="text-sm text-stone-500">
                  {item.count} งาน • ฿{item.earnings.toLocaleString()}
                </span>
              </div>
              <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-700 to-amber-600 rounded-full transition-all"
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payout History */}
      <div className="bg-white rounded-xl shadow p-4">
        <h3 className="font-semibold text-stone-900 mb-4">ประวัติการโอนเงิน</h3>
        <div className="space-y-3">
          {recentPayouts.map((payout, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-stone-100 last:border-0">
              <div>
                <p className="font-medium text-stone-900">{payout.period}</p>
                <p className="text-xs text-stone-500">{payout.date}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-stone-900">฿{payout.amount.toLocaleString()}</p>
                {payout.status === 'paid' ? (
                  <span className="text-xs text-green-600">โอนแล้ว</span>
                ) : (
                  <span className="text-xs text-amber-600">รอโอน</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default StaffEarnings
