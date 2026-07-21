import { Link } from 'react-router-dom'
import { ChevronLeft, Bell, CheckCircle, AlertCircle, Info, Calendar, CreditCard, Sparkles, Play, UserCheck, XCircle } from 'lucide-react'
import { useTranslation } from '@bliss/i18n'
import { useCurrentCustomer } from '@bliss/supabase/hooks/useCustomer'
import {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useNotificationSubscription,
} from '@bliss/supabase/hooks/useNotifications'

function Notifications() {
  const { t, i18n } = useTranslation('common')
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
        return <CreditCard className="w-5 h-5 text-bliss-600" />
      case 'promotion':
        return <Sparkles className="w-5 h-5 text-bliss-600" />
      default:
        return <Info className="w-5 h-5 text-bliss-700" />
    }
  }

  const dateLocale = i18n.language === 'cn' ? 'zh-CN' : i18n.language === 'en' ? 'en-US' : i18n.language === 'kr' ? 'ko-KR' : i18n.language === 'jp' ? 'ja-JP' : 'th-TH'

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return ''

    const now = new Date()
    const past = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return t('timeAgo.justNow')
    if (diffInMinutes < 60) return t('timeAgo.minutesAgo', { count: diffInMinutes })

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return t('timeAgo.hoursAgo', { count: diffInHours })

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return t('timeAgo.daysAgo', { count: diffInDays })

    return past.toLocaleDateString(dateLocale)
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
      <div className="min-h-screen bg-bliss-100 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bliss-600 mx-auto"></div>
            <p className="text-bliss-700 mt-4">{t('notifications.loading')}</p>
          </div>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!customer) {
    return (
      <div className="min-h-screen bg-bliss-100 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <p className="text-bliss-700 text-lg">{t('notifications.loginRequired')}</p>
            <Link to="/login" className="inline-block mt-4 text-bliss-600 hover:text-bliss-700 font-medium">
              {t('notifications.goToLogin')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bliss-100 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Link to="/profile" className="inline-flex items-center text-bliss-600 hover:text-bliss-800 mb-4">
            <ChevronLeft className="w-5 h-5" />
            {t('notifications.backToProfile')}
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-bliss-900">{t('nav.notifications')}</h1>
              {unreadCount > 0 && (
                <p className="text-sm text-bliss-500">{t('notifications.unread', { count: unreadCount })}</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsRead.isPending}
                className="text-sm text-bliss-600 hover:text-bliss-700 font-medium disabled:opacity-50"
              >
                {markAllAsRead.isPending ? t('notifications.marking') : t('notifications.markAllRead')}
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {notifications.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-bliss-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8 text-bliss-400" />
              </div>
              <h3 className="font-semibold text-bliss-900 mb-2">{t('notifications.emptyTitle')}</h3>
              <p className="text-sm text-bliss-500">
                {t('notifications.emptySubtitle')}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-bliss-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 hover:bg-bliss-100 cursor-pointer transition ${
                    !notification.is_read ? 'bg-bliss-100/50' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className={`font-medium text-bliss-900 ${!notification.is_read ? 'font-semibold' : ''}`}>
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <span className="flex-shrink-0 w-2 h-2 bg-bliss-600 rounded-full mt-1.5" />
                        )}
                      </div>
                      <p className="text-sm text-bliss-700 mb-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-bliss-400">
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
        <div className="mt-6 text-center text-sm text-bliss-500">
          <p>{t('notifications.autoRefresh')}</p>
        </div>
      </div>
    </div>
  )
}

export default Notifications
