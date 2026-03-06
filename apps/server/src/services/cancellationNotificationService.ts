/**
 * Cancellation Notification Service
 * Sends notifications when bookings are cancelled
 */

import { getSupabaseClient } from '../lib/supabase.js'
import { emailService } from './emailService.js'
import { lineService } from './lineService.js'
import type {
  CancellationNotification,
  CreateCancellationNotificationInput,
  RefundInfo,
} from '../types/cancellation.js'

// ============================================
// Types
// ============================================

interface BookingForNotification {
  id: string
  booking_number: string
  service_name: string
  scheduled_date: string
  scheduled_time: string
  customer_id: string
  customer_email: string
  customer_profile_id?: string // Profile ID for in-app notifications
  customer_name: string
  customer_phone?: string
  assigned_staff_id?: string
  staff_profile_id?: string // Profile ID for in-app notifications
  staff_email?: string
  staff_line_user_id?: string
  hotel_id?: string
  hotel_email?: string
  source: 'customer' | 'hotel'
  cancellation_reason: string
  payment_status?: string
}

interface NotificationResult {
  customer: boolean
  staff: boolean
  hotel: boolean
  admin: boolean
}

// ============================================
// Main Function
// ============================================

/**
 * Send cancellation notifications to all relevant parties
 */
export async function sendCancellationNotifications(
  booking: BookingForNotification,
  refundInfo?: RefundInfo
): Promise<NotificationResult> {
  const results: NotificationResult = {
    customer: false,
    staff: false,
    hotel: false,
    admin: false,
  }

  const promises: Promise<void>[] = []

  // 1. Notify customer (always)
  promises.push(
    notifyCustomer(booking, refundInfo)
      .then(() => {
        results.customer = true
      })
      .catch((error) => {
        console.error('[Cancellation] Failed to notify customer:', error)
      })
  )

  // 2. Notify staff (if assigned)
  if (booking.assigned_staff_id) {
    promises.push(
      notifyStaff(booking)
        .then(() => {
          results.staff = true
        })
        .catch((error) => {
          console.error('[Cancellation] Failed to notify staff:', error)
        })
    )
  }

  // 3. Notify hotel (if booking source is hotel)
  if (booking.source === 'hotel' && booking.hotel_id) {
    promises.push(
      notifyHotel(booking)
        .then(() => {
          results.hotel = true
        })
        .catch((error) => {
          console.error('[Cancellation] Failed to notify hotel:', error)
        })
    )
  }

  // 4. Notify admins (always)
  promises.push(
    notifyAdmins(booking, refundInfo)
      .then(() => {
        results.admin = true
      })
      .catch((error) => {
        console.error('[Cancellation] Failed to notify admins:', error)
      })
  )

  await Promise.allSettled(promises)

  return results
}

// ============================================
// Customer Notifications
// ============================================

async function notifyCustomer(
  booking: BookingForNotification,
  refundInfo?: RefundInfo
): Promise<void> {
  const notifications: Promise<void>[] = []

  // 1. Email notification
  notifications.push(sendCustomerEmail(booking, refundInfo))

  // 2. In-app notification
  notifications.push(createInAppNotification(booking, refundInfo))

  await Promise.all(notifications)

  // Log notifications sent
  await logNotifications(booking.id, [
    {
      booking_id: booking.id,
      recipient_type: 'customer',
      recipient_id: booking.customer_id,
      channel: 'email',
      status: 'sent',
    },
    {
      booking_id: booking.id,
      recipient_type: 'customer',
      recipient_id: booking.customer_id,
      channel: 'in_app',
      status: 'sent',
    },
  ])
}

async function sendCustomerEmail(
  booking: BookingForNotification,
  refundInfo?: RefundInfo
): Promise<void> {
  if (!booking.customer_email) {
    console.log('[Email] No customer email available, skipping')
    return
  }

  const html = emailService.templates.bookingCancellation({
    customerName: booking.customer_name,
    bookingNumber: booking.booking_number,
    serviceName: booking.service_name,
    bookingDate: formatDate(booking.scheduled_date),
    bookingTime: booking.scheduled_time,
    cancellationReason: booking.cancellation_reason,
    refundAmount: refundInfo?.amount,
    refundPercentage: refundInfo?.percentage,
    supportEmail: process.env.SUPPORT_EMAIL,
    supportPhone: process.env.SUPPORT_PHONE,
  })

  const result = await emailService.sendEmail({
    to: booking.customer_email,
    subject: 'การจองของคุณถูกยกเลิก - The Bliss at Home',
    html,
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to send customer email')
  }

  console.log('[Email] Customer cancellation email sent:', booking.customer_email)
}

async function createInAppNotification(
  booking: BookingForNotification,
  refundInfo?: RefundInfo
): Promise<void> {
  if (!booking.customer_profile_id) {
    console.log('[In-App] No customer profile ID, skipping in-app notification')
    return
  }

  const message = refundInfo
    ? `การจองของคุณ #${booking.booking_number} ถูกยกเลิก เหตุผล: ${booking.cancellation_reason} จะได้รับเงินคืน ${refundInfo.amount?.toLocaleString()} บาท`
    : `การจองของคุณ #${booking.booking_number} ถูกยกเลิก เหตุผล: ${booking.cancellation_reason}`

  console.log('[In-App] Creating notification for customer:', {
    profile_id: booking.customer_profile_id,
    message,
  })

  const { error } = await getSupabaseClient()
    .from('notifications')
    .insert({
      user_id: booking.customer_profile_id,
      type: 'booking_cancelled',
      title: 'การจองถูกยกเลิก',
      message,
      data: {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        service_name: booking.service_name,
        cancellation_reason: booking.cancellation_reason,
        refund_info: refundInfo || null,
      },
      is_read: false,
    })

  if (error) {
    console.error('[In-App] Failed to create customer notification:', error)
    throw error
  }

  console.log('[In-App] Customer notification created successfully')
}

// ============================================
// Staff Notifications
// ============================================

async function notifyStaff(booking: BookingForNotification): Promise<void> {
  const notifications: Promise<void>[] = []

  // 1. LINE notification (if LINE user ID available)
  if (booking.staff_line_user_id) {
    notifications.push(sendStaffLineNotification(booking))
  }

  // 2. In-app notification
  notifications.push(createStaffInAppNotification(booking))

  await Promise.all(notifications)

  // Log notifications
  const logs: CreateCancellationNotificationInput[] = []
  if (booking.staff_line_user_id) {
    logs.push({
      booking_id: booking.id,
      recipient_type: 'staff',
      recipient_id: booking.assigned_staff_id!,
      channel: 'line',
      status: 'sent',
    })
  }
  logs.push({
    booking_id: booking.id,
    recipient_type: 'staff',
    recipient_id: booking.assigned_staff_id!,
    channel: 'in_app',
    status: 'sent',
  })

  await logNotifications(booking.id, logs)
}

async function sendStaffLineNotification(
  booking: BookingForNotification
): Promise<void> {
  if (!booking.staff_line_user_id) {
    console.log('[LINE] Staff has no LINE user ID, skipping LINE notification')
    return
  }

  console.log('[LINE] Sending cancellation notification to staff:', {
    staff_id: booking.assigned_staff_id,
    line_user_id: booking.staff_line_user_id,
  })

  // Call LINE service to send push notification
  const success = await lineService.sendBookingCancelledToStaff(
    [booking.staff_line_user_id],
    {
      serviceName: booking.service_name,
      scheduledDate: formatDate(booking.scheduled_date),
      scheduledTime: booking.scheduled_time,
      address: '', // Address not available in booking data
      hotelName: null, // Could be added to BookingForNotification if needed
      cancellationReason: booking.cancellation_reason,
      bookingNumber: booking.booking_number,
      cancelledBy: booking.source === 'customer' ? 'customer' : 'admin',
    }
  )

  if (success) {
    console.log('[LINE] Staff notification sent successfully')
  } else {
    console.error('[LINE] Failed to send staff notification')
    throw new Error('Failed to send LINE notification to staff')
  }
}

async function createStaffInAppNotification(
  booking: BookingForNotification
): Promise<void> {
  if (!booking.staff_profile_id) {
    console.log('[In-App] Staff has no profile ID, skipping in-app notification')
    return
  }

  console.log('[In-App] Creating notification for staff:', {
    staff_id: booking.assigned_staff_id,
    profile_id: booking.staff_profile_id,
  })

  // Create in-app notification in the notifications table
  const cancelledByText = booking.source === 'customer' ? 'ลูกค้า' : 'แอดมิน'
  const { error } = await getSupabaseClient()
    .from('notifications')
    .insert({
      user_id: booking.staff_profile_id, // Use profile_id, not staff_id
      type: 'job_cancelled',
      title: `งานถูกยกเลิกโดย${cancelledByText}`,
      message: `งานของคุณวันที่ ${formatDate(booking.scheduled_date)} เวลา ${booking.scheduled_time} ถูกยกเลิกโดย${cancelledByText} เหตุผล: ${booking.cancellation_reason}`,
      data: {
        booking_id: booking.id,
        booking_number: booking.booking_number,
        service_name: booking.service_name,
        cancellation_reason: booking.cancellation_reason,
      },
      is_read: false,
    })

  if (error) {
    console.error('[In-App] Failed to create staff notification:', error)
    throw error
  }

  console.log('[In-App] Staff notification created successfully')
}

// ============================================
// Admin Notifications
// ============================================

async function notifyAdmins(
  booking: BookingForNotification,
  refundInfo?: RefundInfo
): Promise<void> {
  const supabase = getSupabaseClient()

  // Query all admin profiles
  const { data: adminProfiles, error: adminError } = await supabase
    .from('profiles')
    .select('id, line_user_id')
    .eq('role', 'ADMIN')

  if (adminError || !adminProfiles || adminProfiles.length === 0) {
    console.log('[Admin] No admin profiles found, skipping admin notification')
    return
  }

  console.log(`[Admin] Sending cancellation notification to ${adminProfiles.length} admins`)

  const notifications: Promise<void>[] = []

  // 1. LINE notification to admins with line_user_id
  const adminLineIds = adminProfiles
    .map(p => p.line_user_id)
    .filter(Boolean) as string[]

  if (adminLineIds.length > 0) {
    notifications.push(
      lineService.sendBookingCancelledToAdmin(adminLineIds, {
        bookingNumber: booking.booking_number,
        customerName: booking.customer_name,
        serviceName: booking.service_name,
        scheduledDate: formatDate(booking.scheduled_date),
        scheduledTime: booking.scheduled_time,
        cancellationReason: booking.cancellation_reason,
        refundAmount: refundInfo?.amount,
        refundPercentage: refundInfo?.percentage,
      }).then(success => {
        if (success) {
          console.log(`[LINE] Admin cancellation notification sent to ${adminLineIds.length} admins`)
        } else {
          console.error('[LINE] Failed to send admin cancellation notification')
        }
      })
    )
  }

  // 2. In-app notifications for all admins
  const refundText = refundInfo?.amount
    ? ` คืนเงิน ${refundInfo.amount.toLocaleString()} บาท`
    : ''
  const notificationRows = adminProfiles.map(admin => ({
    user_id: admin.id,
    type: 'booking_cancelled',
    title: 'ลูกค้ายกเลิกการจอง',
    message: `${booking.customer_name} ยกเลิกการจอง #${booking.booking_number} บริการ ${booking.service_name} วันที่ ${formatDate(booking.scheduled_date)} เวลา ${booking.scheduled_time} เหตุผล: ${booking.cancellation_reason}${refundText}`,
    data: {
      booking_id: booking.id,
      booking_number: booking.booking_number,
      service_name: booking.service_name,
      cancellation_reason: booking.cancellation_reason,
      refund_info: refundInfo || null,
    },
    is_read: false,
  }))

  notifications.push(
    (async () => {
      const { error } = await supabase
        .from('notifications')
        .insert(notificationRows)

      if (error) {
        console.error('[In-App] Failed to insert admin notifications:', error)
        throw error
      }
      console.log(`[In-App] Cancellation notification sent to ${adminProfiles.length} admins`)
    })()
  )

  await Promise.all(notifications)

  // Log notifications for each admin
  const logs: CreateCancellationNotificationInput[] = []
  for (const admin of adminProfiles) {
    if (adminLineIds.includes(admin.line_user_id)) {
      logs.push({
        booking_id: booking.id,
        recipient_type: 'admin',
        recipient_id: admin.id,
        channel: 'line',
        status: 'sent',
      })
    }
    logs.push({
      booking_id: booking.id,
      recipient_type: 'admin',
      recipient_id: admin.id,
      channel: 'in_app',
      status: 'sent',
    })
  }

  await logNotifications(booking.id, logs)
}

// ============================================
// Hotel Notifications
// ============================================

async function notifyHotel(booking: BookingForNotification): Promise<void> {
  const notifications: Promise<void>[] = []

  // 1. Email notification
  if (booking.hotel_email) {
    notifications.push(sendHotelEmail(booking))
  }

  // 2. In-app notification
  notifications.push(createHotelInAppNotification(booking))

  await Promise.all(notifications)

  // Log notifications
  const logs: CreateCancellationNotificationInput[] = []
  if (booking.hotel_email) {
    logs.push({
      booking_id: booking.id,
      recipient_type: 'hotel',
      recipient_id: booking.hotel_id!,
      channel: 'email',
      status: 'sent',
    })
  }
  logs.push({
    booking_id: booking.id,
    recipient_type: 'hotel',
    recipient_id: booking.hotel_id!,
    channel: 'in_app',
    status: 'sent',
  })

  await logNotifications(booking.id, logs)
}

async function sendHotelEmail(booking: BookingForNotification): Promise<void> {
  if (!booking.hotel_email) {
    console.log('[Email] No hotel email available, skipping')
    return
  }

  const html = emailService.templates.hotelBookingCancellation({
    hotelName: 'Partner Hotel', // Could be passed in BookingForNotification
    bookingNumber: booking.booking_number,
    customerName: booking.customer_name,
    serviceName: booking.service_name,
    bookingDate: formatDate(booking.scheduled_date),
    bookingTime: booking.scheduled_time,
    cancellationReason: booking.cancellation_reason,
  })

  const result = await emailService.sendEmail({
    to: booking.hotel_email,
    subject: 'Booking Cancelled - The Bliss at Home',
    html,
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to send hotel email')
  }

  console.log('[Email] Hotel cancellation email sent:', booking.hotel_email)
}

async function createHotelInAppNotification(
  booking: BookingForNotification
): Promise<void> {
  console.log('[In-App] Creating notification for hotel:', {
    hotel_id: booking.hotel_id,
  })

  // TODO: Create in-app notification
  // await notificationService.create({
  //   user_id: booking.hotel_id,
  //   type: 'booking_cancelled',
  //   title: 'Booking Cancelled',
  //   message: `Booking #${booking.booking_number} has been cancelled`,
  //   data: { booking_id: booking.id },
  // })
}

// ============================================
// Helper Functions
// ============================================

async function logNotifications(
  bookingId: string,
  notifications: CreateCancellationNotificationInput[]
): Promise<void> {
  try {
    const { error } = await getSupabaseClient()
      .from('cancellation_notifications')
      .insert(notifications)

    if (error) throw error

    console.log(`[Notifications] Logged ${notifications.length} notifications for booking ${bookingId}`)
  } catch (error) {
    console.error('[Notifications] Failed to log notifications:', error)
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
