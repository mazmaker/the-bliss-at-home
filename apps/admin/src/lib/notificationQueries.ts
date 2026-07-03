/**
 * Notification Queries
 * Supabase queries for the notifications table
 */

import { supabase } from './supabase'

// Job-alert notification types that have their OWN admin surfaces (escalation widget/bell,
// overdue widget/bell) — EXCLUDE them from the generic "การจองใหม่" booking bell so they don't
// pollute its unread count / dropdown. (PART46: overdue types added here.)
const JOB_ALERT_TYPES = ['job_no_staff_warning', 'job_no_staff_urgent', 'job_overdue_not_started']
const JOB_ALERT_TYPES_PG = `(${JOB_ALERT_TYPES.join(',')})`

export interface AdminNotification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  data: Record<string, any> | null
  is_read: boolean
  read_at: string | null
  created_at: string
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: string): Promise<AdminNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_read', false)
    .not('type', 'in', JOB_ALERT_TYPES_PG)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Failed to fetch notifications:', error)
    return []
  }

  return data || []
}

/**
 * Get recent notifications (read + unread) for a user
 */
export async function getRecentNotifications(userId: string, limit = 10): Promise<AdminNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .not('type', 'in', JOB_ALERT_TYPES_PG)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Failed to fetch notifications:', error)
    return []
  }

  return data || []
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)

  if (error) {
    console.error('Failed to mark notification as read:', error)
    return false
  }

  return true
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) {
    console.error('Failed to mark all notifications as read:', error)
    return false
  }

  return true
}
