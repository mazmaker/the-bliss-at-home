/**
 * useBookingNotifications Hook
 * Polls for new booking notifications and provides actions
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  getUnreadNotifications,
  getRecentNotifications,
  markAsRead as markAsReadQuery,
  markAllAsRead as markAllAsReadQuery,
  type AdminNotification,
} from '../lib/notificationQueries'
import { useAdminAuth } from './useAdminAuth'

const POLL_INTERVAL = 10_000 // 10 seconds

export function useBookingNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const { user } = useAdminAuth()
  const prevUnreadCountRef = useRef(0)

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return

    try {
      const [unread, recent] = await Promise.all([
        getUnreadNotifications(user.id),
        getRecentNotifications(user.id, 10),
      ])

      const newUnreadCount = unread.length
      setUnreadCount(newUnreadCount)
      setNotifications(recent)

      // Browser notification for new items
      if (newUnreadCount > prevUnreadCountRef.current && prevUnreadCountRef.current > 0) {
        const newCount = newUnreadCount - prevUnreadCountRef.current
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('การจองใหม่', {
            body: `มีการจองใหม่ ${newCount} รายการ`,
            icon: '/favicon.ico',
          })
        }
      }
      prevUnreadCountRef.current = newUnreadCount
    } catch (error) {
      console.error('Failed to fetch booking notifications:', error)
    }
  }, [user?.id])

  // Initial fetch
  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    fetchNotifications().finally(() => setLoading(false))
  }, [user?.id, fetchNotifications])

  // Polling
  useEffect(() => {
    if (!user?.id) return

    const interval = setInterval(fetchNotifications, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [user?.id, fetchNotifications])

  // Request browser notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    const success = await markAsReadQuery(notificationId)
    if (success) {
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    return success
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return false
    const success = await markAllAsReadQuery(user.id)
    if (success) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      )
      setUnreadCount(0)
    }
    return success
  }, [user?.id])

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  }
}
