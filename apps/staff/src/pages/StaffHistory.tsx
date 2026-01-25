import { useState, useEffect, useMemo } from 'react'
import { Calendar, Clock, MapPin, Filter, Loader2, RefreshCw } from 'lucide-react'
import { useAuth } from '@bliss/supabase/auth'
import { useJobs, type Job, type JobStatus } from '@bliss/supabase'

function StaffHistory() {
  const { user } = useAuth()
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all')
  const [monthFilter, setMonthFilter] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // Calculate date range from month filter
  const dateRange = useMemo(() => {
    const [year, month] = monthFilter.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // Last day of month
    return {
      date_from: startDate.toISOString().split('T')[0],
      date_to: endDate.toISOString().split('T')[0],
    }
  }, [monthFilter])

  const { jobs, isLoading, error, refresh } = useJobs({
    filter: {
      status: statusFilter === 'all' ? ['completed', 'cancelled'] : [statusFilter as JobStatus],
      ...dateRange,
    },
  })

  // Calculate stats
  const completedJobs = jobs.filter((j) => j.status === 'completed')
  const totalEarnings = completedJobs.reduce((sum, j) => sum + (j.staff_earnings || 0), 0)
  const totalTips = completedJobs.reduce((sum, j) => sum + (j.tip_amount || 0), 0)

  // Group by date
  const groupedByDate = useMemo(() => {
    return jobs.reduce((acc, job) => {
      const date = job.scheduled_date
      if (!acc[date]) {
        acc[date] = []
      }
      acc[date].push(job)
      return acc
    }, {} as Record<string, Job[]>)
  }, [jobs])

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }
    return date.toLocaleDateString('th-TH', options)
  }

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-amber-600 mx-auto" />
          <p className="text-gray-500 mt-3">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">ประวัติการทำงาน</h1>
          <p className="text-stone-500">Job History</p>
        </div>
        <button
          onClick={refresh}
          className="p-2 bg-white rounded-lg shadow hover:bg-stone-50 transition"
        >
          <RefreshCw className="w-5 h-5 text-stone-600" />
        </button>
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
          <p className="text-xl font-bold text-amber-600">฿{totalTips.toLocaleString()}</p>
          <p className="text-xs text-stone-500">ทิป</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-3">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-stone-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="flex-1 px-3 py-2 bg-stone-100 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            <option value="all">ทั้งหมด</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-2 bg-stone-100 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm">
          {error.message}
        </div>
      )}

      {/* Empty State */}
      {jobs.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <h3 className="font-semibold text-stone-900 mb-1">ไม่มีประวัติ</h3>
          <p className="text-sm text-stone-500">ไม่พบประวัติการทำงานในช่วงเวลานี้</p>
        </div>
      )}

      {/* Job History by Date */}
      <div className="space-y-4">
        {Object.entries(groupedByDate)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([date, dayJobs]) => (
            <div key={date}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-stone-900">{formatDate(date)}</h3>
                <span className="text-xs text-stone-500">
                  {dayJobs.filter((j) => j.status === 'completed').length} งาน • ฿
                  {dayJobs
                    .filter((j) => j.status === 'completed')
                    .reduce((sum, j) => sum + (j.staff_earnings || 0), 0)
                    .toLocaleString()}
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
                        <h4
                          className={`font-medium ${
                            job.status === 'completed' ? 'text-stone-900' : 'text-stone-500 line-through'
                          }`}
                        >
                          {job.service_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
                          <Clock className="w-3 h-3" />
                          <span>{job.scheduled_time}</span>
                          <span>•</span>
                          <span>{job.duration_minutes} นาที</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold ${
                            job.status === 'completed' ? 'text-green-600' : 'text-stone-400'
                          }`}
                        >
                          {job.status === 'completed' ? '+' : ''}฿{job.staff_earnings || 0}
                        </p>
                        {job.tip_amount > 0 && (
                          <p className="text-xs text-amber-600">+฿{job.tip_amount} ทิป</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2 text-sm text-stone-600">
                      <span className="font-medium">{job.customer_name}</span>
                      {job.hotel_name ? (
                        <span className="text-stone-400">
                          • {job.hotel_name} {job.room_number ? `ห้อง ${job.room_number}` : ''}
                        </span>
                      ) : job.address ? (
                        <span className="text-stone-400 truncate">• {job.address}</span>
                      ) : null}
                    </div>

                    {job.status === 'completed' && job.payment_status && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            job.payment_status === 'paid'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {job.payment_status === 'paid' ? 'ชำระแล้ว' : 'รอชำระ'}
                        </span>
                      </div>
                    )}

                    {job.status === 'cancelled' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-red-600">
                          ยกเลิก{job.cancelled_by === 'CUSTOMER' ? 'โดยลูกค้า' : job.cancelled_by === 'STAFF' ? 'โดยพนักงาน' : ''}
                        </span>
                        {job.cancellation_reason && (
                          <span className="text-xs text-stone-400">• {job.cancellation_reason}</span>
                        )}
                      </div>
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
