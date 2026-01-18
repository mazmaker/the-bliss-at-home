import { useState } from 'react'
import { Calendar, Clock, MapPin, Filter } from 'lucide-react'

function StaffHistory() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all')
  const [monthFilter, setMonthFilter] = useState('2026-01')

  // Mock job history
  const jobs = [
    {
      id: 'JOB001',
      date: '2026-01-15',
      time: '14:00',
      customer: 'John Smith',
      hotel: 'โรงแรมฮิลตัน',
      room: '1505',
      address: null,
      service: 'Thai Massage (2 hours)',
      duration: 120,
      amount: 640,
      status: 'completed',
      rating: 5,
      tip: 100,
    },
    {
      id: 'JOB002',
      date: '2026-01-14',
      time: '10:30',
      customer: 'Jane Doe',
      hotel: null,
      address: '456 ถนนสีลม สีลม',
      service: 'Gel Manicure',
      duration: 60,
      amount: 360,
      status: 'completed',
      rating: 4,
      tip: 0,
    },
    {
      id: 'JOB003',
      date: '2026-01-14',
      time: '16:00',
      customer: 'Robert Chen',
      hotel: 'รีสอร์ทในฝัน',
      room: '302',
      address: null,
      service: 'Oil Massage (2 hours)',
      duration: 120,
      amount: 800,
      status: 'completed',
      rating: 5,
      tip: 200,
    },
    {
      id: 'JOB004',
      date: '2026-01-13',
      time: '11:00',
      customer: 'Sarah Wilson',
      hotel: null,
      address: '789 ถนนพระราม 3 บางนา',
      service: 'Facial Treatment',
      duration: 90,
      amount: 960,
      status: 'cancelled',
      rating: 0,
      tip: 0,
    },
    {
      id: 'JOB005',
      date: '2026-01-12',
      time: '15:00',
      customer: 'Michael Brown',
      hotel: 'โรงแรมดุสิต ธานี',
      room: '707',
      address: null,
      service: 'Luxury Spa Package',
      duration: 150,
      amount: 2000,
      status: 'completed',
      rating: 5,
      tip: 300,
    },
    {
      id: 'JOB006',
      date: '2026-01-11',
      time: '13:00',
      customer: 'Emily Davis',
      hotel: null,
      address: '321 ถนนสุขุมวิท 21',
      service: 'Foot Massage',
      duration: 60,
      amount: 320,
      status: 'completed',
      rating: 4,
      tip: 50,
    },
  ]

  const filteredJobs = jobs.filter((job) => {
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter
    return matchesStatus
  })

  // Calculate stats
  const completedJobs = filteredJobs.filter((j) => j.status === 'completed')
  const totalEarnings = completedJobs.reduce((sum, j) => sum + j.amount, 0)
  const totalTips = completedJobs.reduce((sum, j) => sum + j.tip, 0)
  const avgRating = completedJobs.length > 0
    ? completedJobs.reduce((sum, j) => sum + j.rating, 0) / completedJobs.length
    : 0

  // Group by date
  const groupedByDate = filteredJobs.reduce((acc, job) => {
    if (!acc[job.date]) {
      acc[job.date] = []
    }
    acc[job.date].push(job)
    return acc
  }, {} as Record<string, typeof jobs>)

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-sm ${star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-stone-300'}`}
          >
            ★
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-stone-900">ประวัติการทำงาน</h1>
        <p className="text-stone-500">Job History</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow p-3 text-center">
          <p className="text-xl font-bold text-stone-900">{completedJobs.length}</p>
          <p className="text-xs text-stone-500">งานที่เสร็จ</p>
        </div>
        <div className="bg-white rounded-xl shadow p-3 text-center">
          <p className="text-xl font-bold text-green-600">฿{totalEarnings.toLocaleString()}</p>
          <p className="text-xs text-stone-500">รายได้</p>
        </div>
        <div className="bg-white rounded-xl shadow p-3 text-center">
          <p className="text-xl font-bold text-yellow-500">{avgRating.toFixed(1)}</p>
          <p className="text-xs text-stone-500">คะแนนเฉลี่ย</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-3">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-stone-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="flex-1 px-3 py-2 bg-stone-100 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
          >
            <option value="all">ทั้งหมด</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
          <div className="relative">
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-3 py-2 bg-stone-100 rounded-lg text-sm focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Job History by Date */}
      <div className="space-y-4">
        {Object.entries(groupedByDate)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, dayJobs]) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-stone-900">{date}</h3>
                <span className="text-xs text-stone-500">
                  {dayJobs.filter((j) => j.status === 'completed').length} งาน • ฿
                  {dayJobs.filter((j) => j.status === 'completed').reduce((sum, j) => sum + j.amount, 0).toLocaleString()}
                </span>
              </div>
              <div className="space-y-2">
                {dayJobs.map((job) => (
                  <div
                    key={job.id}
                    className={`bg-white rounded-xl shadow p-4 border ${
                      job.status === 'completed' ? 'border-stone-100' : 'border-red-100 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className={`font-medium ${job.status === 'completed' ? 'text-stone-900' : 'text-stone-500 line-through'}`}>
                          {job.service}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
                          <Clock className="w-3 h-3" />
                          <span>{job.time}</span>
                          <span>•</span>
                          <span>{job.duration} นาที</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${job.status === 'completed' ? 'text-green-600' : 'text-stone-400'}`}>
                          {job.status === 'completed' ? '+' : ''}฿{job.amount}
                        </p>
                        {job.tip > 0 && (
                          <p className="text-xs text-amber-600">+฿{job.tip} ทิป</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2 text-sm text-stone-600">
                      <span className="font-medium">{job.customer}</span>
                      {job.hotel ? (
                        <span className="text-stone-400">• {job.hotel} ห้อง {job.room}</span>
                      ) : (
                        <span className="text-stone-400">• {job.address}</span>
                      )}
                    </div>

                    {job.status === 'completed' && (
                      <div className="flex items-center justify-between">
                        {renderStars(job.rating)}
                      </div>
                    )}

                    {job.status === 'cancelled' && (
                      <p className="text-xs text-red-600">ยกเลิกโดยลูกค้า</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}

export default StaffHistory
