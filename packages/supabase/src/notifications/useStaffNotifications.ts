/**
 * React Hook for Staff Notifications
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../auth/hooks'
import {
  getStaffNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToStaffNotifications,
  type StaffNotification,
} from './staffNotificationService'

export function useStaffNotifications() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [notifications, setNotifications] = useState<StaffNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const userId = user?.id

  const refresh = useCallback(async () => {
    if (!userId) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const data = await getStaffNotifications(userId)
      setNotifications(data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch notifications:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Initial fetch
  useEffect(() => {
    if (!isAuthLoading) {
      refresh()
    }
  }, [refresh, isAuthLoading])

  // Realtime subscription
  useEffect(() => {
    if (!userId) return

    const unsubscribe = subscribeToStaffNotifications(userId, (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev])
    })

    return unsubscribe
  }, [userId])

  const markAsRead = useCallback(async (id: string) => {
    try {
      await markNotificationAsRead(id)
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
        )
      )
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    try {
      await markAllNotificationsAsRead(userId)
      const now = new Date().toISOString()
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: now }))
      )
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err)
    }
  }, [userId])

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  )

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    refresh,
  }
}
