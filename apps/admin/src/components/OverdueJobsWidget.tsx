import { Link } from 'react-router-dom'
import { AlertTriangle, Clock, ArrowRight, UserX } from 'lucide-react'
import { useOverdueJobs } from '../hooks/useOverdueJobs'
import { useMemo, memo } from 'react'

function getTimeAgo(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diffInSeconds < 60) return `${diffInSeconds} วินาทีที่แล้ว`
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} ชั่วโมงที่แล้ว`
  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} วันที่แล้ว`
}

const OverdueJobsWidget = memo(function OverdueJobsWidget() {
  // No titleBlink here — the AdminLayout instance owns the tab-title blink (cross-page).
  const { alerts, totalCount, loading, markAsRead } = useOverdueJobs()

  const topAlerts = useMemo(() => {
    return [...alerts]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)
  }, [alerts])

  // Don't show widget if no overdue jobs
  if (loading || totalCount === 0) {
    return null
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-lg border-2 overflow-hidden transition-all duration-500 border-red-400 h-full flex flex-col"
      style={{
        boxShadow: '0 0 15px rgba(220, 38, 38, 0.25)',
      }}
    >
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-red-600 to-red-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle
                className="w-6 h-6 text-white"
                style={{ animation: 'bounce 1.5s ease-in-out infinite' }}
              />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">
                🔴 งานเลยเวลา — staff ยังไม่เริ่ม
              </h3>
              <p className="text-white/90 text-sm">Overdue — Not Started</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">{totalCount}</div>
            <p className="text-white/90 text-xs">รอตาม</p>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {topAlerts.map((alert) => {
          const bookingNumber = alert.data?.booking_number || alert.data?.job_id?.slice(0, 8)
          const minutesOverdue = alert.data?.minutes_overdue

          return (
            <div
              key={alert.id}
              className="p-4 rounded-xl border-2 transition-all duration-300 bg-red-50 border-red-300 text-red-900 flex-1"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-2 flex-1">
                  <span className="text-lg">🔴</span>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{alert.title}</div>
                    <p className="text-sm opacity-80 line-clamp-2 mt-0.5">{alert.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs opacity-75 whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  <span>{getTimeAgo(alert.created_at)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-3 text-xs opacity-75">
                  {bookingNumber && (
                    <span className="flex items-center gap-1">
                      <UserX className="w-3 h-3" />
                      {bookingNumber}
                    </span>
                  )}
                  {typeof minutesOverdue === 'number' && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      เลย {minutesOverdue} นาที
                    </span>
                  )}
                </div>
                <button
                  onClick={() => markAsRead(alert.id)}
                  className="text-xs px-2 py-1 rounded-lg transition bg-red-200/50 hover:bg-red-200 text-red-800"
                >
                  รับทราบ
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="p-4 bg-bliss-50 border-t border-bliss-200">
        <Link
          to="/admin/bookings"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition bg-red-600 text-white hover:bg-red-700"
        >
          <span>ดูการจองทั้งหมด</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
})

export { OverdueJobsWidget }
