import { Link } from 'react-router-dom'
import { ShieldAlert, AlertTriangle, Clock, MapPin, ArrowRight } from 'lucide-react'
import { useSOSNotifications } from '../hooks/useSOSNotifications'
import { useMemo, memo } from 'react'

/**
 * Calculate time ago from timestamp
 */
function getTimeAgo(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return `${diffInSeconds} วินาทีที่แล้ว`
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} นาทีที่แล้ว`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} ชั่วโมงที่แล้ว`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  return `${diffInDays} วันที่แล้ว`
}

const SOSWidget = memo(function SOSWidget() {
  const { pendingAlerts, pendingCount, hasCriticalAlerts, loading } = useSOSNotifications()

  // Show top 3 most urgent alerts - memoized to prevent re-sorting on every render
  const topAlerts = useMemo(() => {
    return [...pendingAlerts]
      .sort((a, b) => {
        // Sort by priority first (critical > high > medium > low)
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff

        // Then by creation date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      .slice(0, 3)
  }, [pendingAlerts])

  if (loading) {
    return null
  }

  if (pendingCount === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 border border-green-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <ShieldAlert className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-bliss-900">ศูนย์แจ้งเตือนฉุกเฉิน</h3>
            <p className="text-sm text-bliss-500">SOS Emergency Center</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-green-600 font-medium">✓ ไม่มีการแจ้งเตือนฉุกเฉิน</p>
          <p className="text-sm text-bliss-500 mt-1">ระบบทำงานปกติ</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 overflow-hidden transition-all duration-500 border-red-500 h-full flex flex-col"
      style={{
        boxShadow: hasCriticalAlerts
          ? '0 0 20px rgba(239, 68, 68, 0.4)'
          : undefined
      }}
    >
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-red-600 to-red-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <ShieldAlert
                className="w-6 h-6 text-white transition-transform duration-1000"
                style={{
                  animation: hasCriticalAlerts ? 'bounce 2s ease-in-out infinite' : 'pulse 3s ease-in-out infinite'
                }}
              />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">
                🚨 การแจ้งเตือนฉุกเฉิน
              </h3>
              <p className="text-white/90 text-sm">SOS Emergency Alerts</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-white">
              {pendingCount}
            </div>
            <p className="text-white/90 text-xs">รอดำเนินการ</p>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {topAlerts.map((alert) => {
          const priorityStyles = {
            critical: 'bg-red-50 border-red-300 text-red-900',
            high: 'bg-orange-50 border-orange-300 text-orange-900',
            medium: 'bg-yellow-50 border-yellow-300 text-yellow-900',
            low: 'bg-blue-50 border-blue-300 text-blue-900',
          }

          const priorityIcons = {
            critical: '🚨',
            high: '⚠️',
            medium: '⚡',
            low: 'ℹ️',
          }

          const timeAgo = getTimeAgo(alert.created_at)

          return (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border-2 transition-all duration-300 ease-in-out flex-1 ${priorityStyles[alert.priority]}`}
              style={{
                animation: 'fadeIn 0.3s ease-in-out',
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-2 flex-1">
                  <span className="text-lg">{priorityIcons[alert.priority]}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{alert.source_name || 'Unknown'}</div>
                    <div className="text-xs opacity-75">
                      {alert.source_type === 'customer' ? 'ลูกค้า' : 'พนักงาน'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs opacity-75">
                  <Clock className="w-3 h-3" />
                  <span>{timeAgo}</span>
                </div>
              </div>

              {alert.message && (
                <p className="text-sm mb-2 line-clamp-2">{alert.message}</p>
              )}

              {alert.latitude && alert.longitude && (
                <div className="flex items-center gap-1 text-xs opacity-75">
                  <MapPin className="w-3 h-3" />
                  <span>มีข้อมูลพิกัด GPS</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer - View All Button */}
      <div className="p-4 bg-bliss-50 border-t border-bliss-200">
        <Link
          to="/admin/sos-alerts"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition bg-red-600 text-white hover:bg-red-700"
        >
          <span>ดูการแจ้งเตือนทั้งหมด</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
})

export { SOSWidget }
