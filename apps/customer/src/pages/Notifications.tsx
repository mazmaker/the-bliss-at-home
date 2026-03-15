import { Link } from 'react-router-dom'
import { ChevronLeft, Bell, CheckCircle, AlertCircle, Info, Calendar, CreditCard, Sparkles, Play, UserCheck, XCircle } from 'lucide-react'
import { useCurrentCustomer } from '@bliss/supabase/hooks/useCustomer'
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useNotificationSubscription,
} from '@bliss/supabase/hooks/useNotifications'

function Notifications() {
  const { data: customer, isLoading: customerLoading } = useCurrentCustomer()
  const userId = customer?.profile_id ?? undefined

  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications(userId)
  const markAsRead = useMarkNotificationAsRead()
  const markAllAsRead = useMarkAllNotificationsAsRead()

  // Subscribe to real-time updates
  useNotificationSubscription(userId)

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const isLoading = customerLoading || notificationsLoading

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking_confirmed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'booking_cancelled':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'booking_started':
        return <Play className="w-5 h-5 text-blue-600" />
      case 'booking_completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'booking_reminder':
        return <Calendar className="w-5 h-5 text-blue-600" />
      case 'staff_assigned':
        return <UserCheck className="w-5 h-5 text-purple-600" />
      case 'payment_successful':
      case 'payment':
        return <CreditCard className="w-5 h-5 text-green-600" />
      case 'payment_failed':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'refund':
        return <CreditCard className="w-5 h-5 text-amber-600" />
      case 'promotion':
        return <Sparkles className="w-5 h-5 text-amber-600" />
      default:
        return <Info className="w-5 h-5 text-stone-600" />
    }
  }

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return ''

    const now = new Date()
    const past = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`

    return past.toLocaleDateString()
  }

  const handleNotificationClick = async (notification: typeof notifications[0]) => {
    if (!notification.is_read) {
      await markAsRead.mutateAsync(notification.id)
    }
    // Could navigate based on notification data if needed
    // if (notification.data?.booking_id) {
    //   navigate(`/bookings/${notification.data.booking_id}`)
    // }
  }

  const handleMarkAllAsRead = async () => {
    if (userId) {
      await markAllAsRead.mutateAsync(userId)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700 mx-auto"></div>
            <p className="text-stone-600 mt-4">Loading notifications...</p>
          </div>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!customer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <p className="text-stone-600 text-lg">Please log in to view notifications</p>
            <Link to="/login" className="inline-block mt-4 text-amber-700 hover:text-amber-800 font-medium">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Link to="/profile" className="inline-flex items-center text-amber-700 hover:text-amber-900 mb-4">
            <ChevronLeft className="w-5 h-5" />
            Back to Profile
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Notifications</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-stone-500">{unreadCount} unread</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsRead.isPending}
                className="text-sm text-amber-700 hover:text-amber-800 font-medium disabled:opacity-50"
              >
                {markAllAsRead.isPending ? 'Marking...' : 'Mark all as read'}
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {notifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-stone-400" />
              </div>
              <h3 className="font-semibold text-stone-900 mb-2">No notifications</h3>
              <p className="text-sm text-stone-500">
                You'll see booking updates and promotions here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 hover:bg-stone-50 cursor-pointer transition ${
                    !notification.is_read ? 'bg-amber-50/50' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`font-medium text-stone-900 ${!notification.is_read ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <span className="flex-shrink-0 w-2 h-2 bg-amber-600 rounded-full mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-stone-600 mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-stone-400">
                        {getTimeAgo(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-stone-500">
          <p>Notifications are automatically refreshed every 30 seconds</p>
        </div>
      </div>
    </div>
  )
}

export default Notifications
