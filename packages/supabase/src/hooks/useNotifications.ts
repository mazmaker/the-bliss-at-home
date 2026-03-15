/**
 * Notification Hooks
 * Custom hooks for notification operations
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery'
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  type GetNotificationsOptions,
} from '../services/notificationService'
import { getBrowserClient } from '../client'
import type { Database } from '../types/database.types'

type Notification = Database['public']['Tables']['notifications']['Row']

/**
 * Get all notifications for current user
 */
export function useNotifications(
  userId: string | undefined,
  options?: GetNotificationsOptions
) {
  return useSupabaseQuery<Notification[]>({
    queryKey: ['notifications', userId, options?.unreadOnly, options?.limit],
    queryFn: (client) => getNotifications(client, userId!, options),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

/**
 * Get unread notification count for current user
 */
export function useUnreadNotificationCount(userId: string | undefined) {
  return useSupabaseQuery<number>({
    queryKey: ['notifications', 'unread-count', userId],
    queryFn: (client) => getUnreadCount(client, userId!),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

/**
 * Mark a single notification as read
 */
export function useMarkNotificationAsRead() {
  return useSupabaseMutation<Notification, string>({
    mutationFn: async (client, notificationId) => {
      return markAsRead(client, notificationId)
    },
    invalidateKeys: () => [
      ['notifications'],
      ['notifications', 'unread-count'],
    ],
  })
}

/**
 * Mark all notifications as read for a user
 */
export function useMarkAllNotificationsAsRead() {
  return useSupabaseMutation<void, string>({
    mutationFn: async (client, userId) => {
      return markAllAsRead(client, userId)
    },
    invalidateKeys: () => [
      ['notifications'],
      ['notifications', 'unread-count'],
    ],
  })
}

/**
 * Subscribe to real-time notifications for a user
 * Automatically invalidates queries when new notifications arrive
 */
export function useNotificationSubscription(userId: string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    const client = getBrowserClient()
    const channel = client
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate queries to refetch
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
        }
      )
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [userId, queryClient])
}
