import { X, Bell, CheckCircle, AlertCircle, Info, DollarSign, UserX, UserCheck, Star } from 'lucide-react'

export interface Notification {
  id: string
  type: 'new_job' | 'job_cancelled' | 'job_updated' | 'payment_received' | 'job_no_staff' | 'booking_cancelled' | 'job_accepted' | 'new_review'
  title: string
  message: string
  read: boolean
  created_at: string
  data?: Record<string, any>
}

interface NotificationPanelProps {
  isOpen: boolean
  onClose: () => void
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
  onMarkAllAsRead: () => void
}

export function NotificationPanel({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}: NotificationPanelProps) {
  if (!isOpen) return null

  const unreadCount = notifications.filter(n => !n.read).length

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'new_job':
        return <Bell className="w-5 h-5 text-blue-600" />
      case 'job_cancelled':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'booking_cancelled':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'job_updated':
        return <Info className="w-5 h-5 text-amber-600" />
      case 'payment_received':
        return <DollarSign className="w-5 h-5 text-green-600" />
      case 'job_no_staff':
        return <UserX className="w-5 h-5 text-orange-600" />
      case 'job_accepted':
        return <UserCheck className="w-5 h-5 text-purple-600" />
      case 'new_review':
        return <Star className="w-5 h-5 text-yellow-500" />
      default:
        return <Bell className="w-5 h-5 text-gray-600" />
    }
  }

  const renderStars = (rating: number) => {
    return (
      <span className="text-yellow-500">
        {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
      </span>
    )
  }

  const renderReviewDetails = (notification: Notification) => {
    const d = notification.data
    if (!d) return null

    return (
      <div className="mt-2 bg-amber-50 rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{renderStars(d.rating || 0)}</span>
        </div>
        {(d.cleanliness_rating || d.professionalism_rating || d.skill_rating) && (
          <div className="grid grid-cols-3 gap-1 text-xs text-stone-500">
            {d.cleanliness_rating && (
              <div>
                <span className="block text-stone-400">ความสะอาด</span>
                <span className="text-yellow-500">{'★'.repeat(d.cleanliness_rating)}{'☆'.repeat(5 - d.cleanliness_rating)}</span>
              </div>
            )}
            {d.professionalism_rating && (
              <div>
                <span className="block text-stone-400">มืออาชีพ</span>
                <span className="text-yellow-500">{'★'.repeat(d.professionalism_rating)}{'☆'.repeat(5 - d.professionalism_rating)}</span>
              </div>
            )}
            {d.skill_rating && (
              <div>
                <span className="block text-stone-400">ทักษะ</span>
                <span className="text-yellow-500">{'★'.repeat(d.skill_rating)}{'☆'.repeat(5 - d.skill_rating)}</span>
              </div>
            )}
          </div>
        )}
        {d.review && d.review.length > 0 && (
          <p className="text-sm text-stone-700 italic">"{d.review}"</p>
        )}
      </div>
    )
  }

  const getTimeAgo = (dateString: string) => {
    const now = new Date()
    const past = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'เมื่อสักครู่'
    if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} ชั่วโมงที่แล้ว`

    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays} วันที่แล้ว`
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-700 to-amber-800 text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">การแจ้งเตือน</h2>
            {unreadCount > 0 && (
              <p className="text-sm opacity-90">{unreadCount} ข้อความใหม่</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions */}
        {notifications.length > 0 && unreadCount > 0 && (
          <div className="p-3 border-b border-stone-200 bg-stone-50">
            <button
              onClick={onMarkAllAsRead}
              className="text-sm text-amber-700 font-medium hover:text-amber-800 transition"
            >
              ✓ ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-stone-400" />
              </div>
              <h3 className="font-semibold text-stone-900 mb-2">ไม่มีการแจ้งเตือน</h3>
              <p className="text-sm text-stone-500">
                การแจ้งเตือนของคุณจะแสดงที่นี่
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-200">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => !notification.read && onMarkAsRead(notification.id)}
                  className={`p-4 hover:bg-stone-50 transition cursor-pointer ${
                    !notification.read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`font-medium text-stone-900 ${!notification.read ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </h4>
                        {!notification.read && (
                          <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-stone-600 mb-2">
                        {notification.message}
                      </p>
                      {notification.type === 'new_review' && renderReviewDetails(notification)}
                      <p className="text-xs text-stone-400 mt-2">
                        {getTimeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  )
}
