/**
 * Staff Notification Service
 * Handles notification CRUD and realtime subscriptions for staff app
 */

import { supabase } from '../auth/supabaseClient'
import { ensureLiveSession, SessionNotLiveError } from '../auth/ensureLiveSession'

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
  const live = await ensureLiveSession()
  if (live.status !== 'live') {
    throw new SessionNotLiveError('เซสชันหมดอายุ — กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง')
  }
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')

  if (error) throw error
  // Detect an anon 0-row-no-op hiding behind a resolved-200 (RLS matched nothing under the anon
  // key). The id always comes from the user's OWN fetched list, so 0 rows here means the write
  // did NOT land → treat as a lapsed session, not a silent success that would drop the unread.
  if (!data || data.length === 0) {
    throw new SessionNotLiveError('ทำเครื่องหมายว่าอ่านแล้วไม่สำเร็จ กรุณาลองใหม่')
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  const live = await ensureLiveSession()
  if (live.status !== 'live') {
    throw new SessionNotLiveError('เซสชันหมดอายุ — กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง')
  }
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
