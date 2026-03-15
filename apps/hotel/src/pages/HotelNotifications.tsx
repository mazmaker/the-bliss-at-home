/**
 * Hotel Notifications Page
 * Displays in-app notifications for hotel users with real-time updates
 */

import { Bell, CheckCircle, AlertCircle, Calendar, UserCheck, XCircle, Info, RefreshCw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@bliss/supabase/auth'
import { useAuth } from '@bliss/supabase/auth'
import { useEffect } from 'react'

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data: Record<string, any> | null
  is_read: boolean
  created_at: string
}

function HotelNotifications() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  // Fetch notifications
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['hotel-notifications', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return (data || []) as Notification[]
    },
    enabled: !!userId,
  })

  // Real-time subscription
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('hotel-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          refetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, refetch])

  // Mark as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['hotel-unread-count'] })
    },
  })

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!userId) return
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hotel-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['hotel-unread-count'] })
    },
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  const getIcon = (type: string) => {
    switch (type) {
      case 'booking_confirmed':
      case 'new_booking':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'booking_cancelled':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'booking_rescheduled':
        return <Calendar className="w-5 h-5 text-blue-600" />
      case 'staff_assigned':
        return <UserCheck className="w-5 h-5 text-purple-600" />
      case 'staff_cancelled':
        return <XCircle className="w-5 h-5 text-orange-600" />
      case 'new_job':
        return <Bell className="w-5 h-5 text-amber-600" />
      default:
        return <Info className="w-5 h-5 text-stone-600" />
    }
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
    if (diffInDays < 7) return `${diffInDays} วันที่แล้ว`

    return past.toLocaleDateString('th-TH')
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markAsRead.mutateAsync(notification.id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-amber-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">การแจ้งเตือน</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-stone-500">{unreadCount} รายการที่ยังไม่ได้อ่าน</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
            className="text-sm text-amber-700 hover:text-amber-800 font-medium disabled:opacity-50"
          >
            {markAllAsRead.isPending ? 'กำลังดำเนินการ...' : 'อ่านทั้งหมด'}
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-stone-400" />
            </div>
            <h3 className="font-semibold text-stone-900 mb-2">ไม่มีการแจ้งเตือน</h3>
            <p className="text-sm text-stone-500">
              การแจ้งเตือนเกี่ยวกับการจองจะแสดงที่นี่
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
    </div>
  )
}

export default HotelNotifications
