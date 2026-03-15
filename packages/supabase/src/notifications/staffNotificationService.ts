/**
 * Staff Notification Service
 * Handles notification CRUD and realtime subscriptions for staff app
 */

import { supabase } from '../auth/supabaseClient'

export interface StaffNotification {
  id: string
  user_id: string | null
  type: string
  title: string
  message: string
  data: Record<string, unknown> | null
  is_read: boolean | null
  read_at: string | null
  created_at: string | null
}

export async function getStaffNotifications(
  userId: string,
  limit = 50
): Promise<StaffNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as StaffNotification[]
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw error
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false)

  if (error) throw error
}

export function subscribeToStaffNotifications(
  userId: string,
  onNewNotification: (notification: StaffNotification) => void
): () => void {
  const channel = supabase
    .channel(`staff-notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        if (payload.new) {
          onNewNotification(payload.new as StaffNotification)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}
