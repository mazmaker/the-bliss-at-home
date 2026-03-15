import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

type Notification = Database['public']['Tables']['notifications']['Row'];
type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

export interface GetNotificationsOptions {
  limit?: number;
  unreadOnly?: boolean;
}

/**
 * Get all notifications for a user
 */
export async function getNotifications(
  client: SupabaseClient<Database>,
  userId: string,
  options?: GetNotificationsOptions
): Promise<Notification[]> {
  let query = client
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options?.unreadOnly) {
    query = query.eq('is_read', false);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(
  client: SupabaseClient<Database>,
  userId: string
): Promise<number> {
  const { count, error } = await client
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}

/**
 * Mark a single notification as read
 */
export async function markAsRead(
  client: SupabaseClient<Database>,
  notificationId: string
): Promise<Notification> {
  const { data, error } = await client
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(
  client: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  const { error } = await client
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;
}

/**
 * Create a new notification
 */
export async function createNotification(
  client: SupabaseClient<Database>,
  notification: NotificationInsert
): Promise<Notification> {
  const { data, error } = await client
    .from('notifications')
    .insert(notification)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  client: SupabaseClient<Database>,
  notificationId: string
): Promise<void> {
  const { error } = await client
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  if (error) throw error;
}

export const notificationService = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
  deleteNotification,
};
