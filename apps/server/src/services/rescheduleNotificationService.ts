/**
 * Reschedule Notification Service
 * Sends notifications when bookings are rescheduled
 * Staff needs to re-accept the job after reschedule
 */

import { getSupabaseClient } from '../lib/supabase.js'
import { lineService } from './lineService.js'

// ============================================
// Types
// ============================================

interface BookingForRescheduleNotification {
  id: string
  booking_number: string
  service_name: string
  old_date: string
  old_time: string
  new_date: string
  new_time: string
  duration_minutes: number
  staff_earnings: number
  assigned_staff_id?: string
  staff_profile_id?: string
  staff_line_user_id?: string
  hotel_name?: string
  address?: string
  new_job_id?: string
}

interface NotificationResult {
  staff_line: boolean
  staff_in_app: boolean
}

// ============================================
// Main Function
// ============================================

/**
 * Send reschedule notifications to assigned staff
 */
export async function sendRescheduleNotifications(
  booking: BookingForRescheduleNotification
): Promise<NotificationResult> {
  const results: NotificationResult = {
    staff_line: false,
    staff_in_app: false,
  }

  // Only notify if staff was assigned
  if (!booking.assigned_staff_id) {
    console.log('[Reschedule] No staff assigned, skipping notifications')
    return results
  }

  const promises: Promise<void>[] = []

  // 1. LINE notification (if LINE user ID available)
  if (booking.staff_line_user_id) {
    promises.push(
      sendStaffLineNotification(booking)
        .then(() => {
          results.staff_line = true
        })
        .catch((error) => {
          console.error('[Reschedule] Failed to send LINE notification:', error)
        })
    )
  }

  // 2. In-app notification
  if (booking.staff_profile_id) {
    promises.push(
      createStaffInAppNotification(booking)
        .then(() => {
          results.staff_in_app = true
        })
        .catch((error) => {
          console.error('[Reschedule] Failed to create in-app notification:', error)
        })
    )
  }

  await Promise.allSettled(promises)

  return results
}

// ============================================
// Staff Notifications
// ============================================

async function sendStaffLineNotification(
  booking: BookingForRescheduleNotification
): Promise<void> {
  if (!booking.staff_line_user_id) {
    console.log('[LINE] Staff has no LINE user ID, skipping LINE notification')
    return
  }

  console.log('[LINE] Sending reschedule notification to staff:', {
    staff_id: booking.assigned_staff_id,
    line_user_id: booking.staff_line_user_id,
  })

  const success = await lineService.sendBookingRescheduledToStaff(
    [booking.staff_line_user_id],
    {
      serviceName: booking.service_name,
      oldDate: formatDate(booking.old_date),
      oldTime: booking.old_time,
      newDate: formatDate(booking.new_date),
      newTime: booking.new_time,
      address: booking.address || '',
      hotelName: booking.hotel_name,
      bookingNumber: booking.booking_number,
      staffEarnings: booking.staff_earnings,
      durationMinutes: booking.duration_minutes,
      jobId: booking.new_job_id,
    }
  )

  if (success) {
    console.log('[LINE] Staff reschedule notification sent successfully')
  } else {
    console.error('[LINE] Failed to send staff reschedule notification')
    throw new Error('Failed to send LINE notification to staff')
  }
}

async function createStaffInAppNotification(
  booking: BookingForRescheduleNotification
): Promise<void> {
  if (!booking.staff_profile_id) {
    console.log('[In-App] Staff has no profile ID, skipping in-app notification')
    return
  }

  console.log('[In-App] Creating reschedule notification for staff:', {
    staff_id: booking.assigned_staff_id,
    profile_id: booking.staff_profile_id,
  })

  const { error } = await getSupabaseClient()
    .from('notifications')
    .insert({
      user_id: booking.staff_profile_id,
      type: 'job_rescheduled',
      title: 'ลูกค้าเลื่อนนัด',
      message: `งานของคุณถูกเลื่อนจาก ${formatDate(booking.old_date)} ${booking.old_time} เป็น ${formatDate(booking.new_date)} ${booking.new_time} กรุณากดรับงานใหม่`,
      data: {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        service_name: booking.service_name,
        old_date: booking.old_date,
        old_time: booking.old_time,
        new_date: booking.new_date,
        new_time: booking.new_time,
        new_job_id: booking.new_job_id,
      },
      is_read: false,
    })

  if (error) {
    console.error('[In-App] Failed to create staff notification:', error)
    throw error
  }

  console.log('[In-App] Staff reschedule notification created successfully')
}

// ============================================
// Helper Functions
// ============================================

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const rescheduleNotificationService = {
  sendRescheduleNotifications,
}
