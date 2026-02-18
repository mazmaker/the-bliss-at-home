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

const NOTIFICATIONS_ENABLED_KEY = 'staff_notifications_enabled'
const NOTIFICATIONS_CHANGED_EVENT = 'staff-notifications-enabled-changed'

/** Check if staff notifications are enabled (defaults to true) */
export function isStaffNotificationsEnabled(): boolean {
  try {
    const stored = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY)
    if (stored === null) return true
    return stored === 'true'
  } catch {
    return true
  }
}

/** Set staff notifications enabled/disabled — also dispatches event so all hook instances sync */
export function setStaffNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem(NOTIFICATIONS_ENABLED_KEY, String(enabled))
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT, { detail: enabled }))
}

export function useStaffNotifications() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [notifications, setNotifications] = useState<StaffNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [enabled, setEnabled] = useState(() => isStaffNotificationsEnabled())

  const userId = user?.id

  const refresh = useCallback(async () => {
    if (!userId || !enabled) {
      setNotifications([])
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
  }, [userId, enabled])

  // Sync enabled state across all hook instances via custom event
  useEffect(() => {
    const handler = (e: Event) => {
      const value = (e as CustomEvent<boolean>).detail
      setEnabled(value)
      if (!value) setNotifications([])
    }
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handler)
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handler)
  }, [])

  // Initial fetch
  useEffect(() => {
    if (!isAuthLoading) {
      refresh()
    }
  }, [refresh, isAuthLoading])

  // Realtime subscription — only when enabled
  useEffect(() => {
    if (!userId || !enabled) return

    const unsubscribe = subscribeToStaffNotifications(userId, (newNotification) => {
      setNotifications((prev) => [newNotification, ...prev])
    })

    return unsubscribe
  }, [userId, enabled])

  /** Toggle notifications on/off — persists to localStorage and updates hook state */
  const setNotificationsEnabled = useCallback((value: boolean) => {
    setStaffNotificationsEnabled(value)
    setEnabled(value)
    if (!value) {
      setNotifications([])
    }
  }, [])

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
    enabled,
    setNotificationsEnabled,
    markAsRead,
    markAllAsRead,
    refresh,
  }
}
