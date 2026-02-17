/**
 * Notification Service
 * Handles job creation from bookings and sends notifications via LINE + in-app
 */

import { getSupabaseClient } from '../lib/supabase.js'
import { lineService } from './lineService.js'

/**
 * Create job(s) from a confirmed booking (idempotent)
 * - Single booking: 1 job
 * - Couple booking (simultaneous): 1 job per recipient (each needs a separate staff)
 * Returns array of job IDs
 */
export async function createJobsFromBooking(bookingId: string): Promise<string[]> {
  const supabase = getSupabaseClient()

  // Check if jobs already exist for this booking (idempotency)
  const { data: existingJobs } = await supabase
    .from('jobs')
    .select('id')
    .eq('booking_id', bookingId)

  if (existingJobs && existingJobs.length > 0) {
    console.log(`📋 Jobs already exist for booking ${bookingId}: ${existingJobs.map(j => j.id).join(', ')}`)
    return existingJobs.map(j => j.id)
  }

  // Fetch booking with related data
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*, service:services(*)')
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    console.error('❌ Booking not found for job creation:', bookingId, bookingError)
    return []
  }

  // Get customer profile_id (jobs.customer_id FK → profiles.id)
  let customerProfileId: string | null = null
  let customerName = 'ลูกค้า'
  let customerPhone: string | null = null

  if (booking.customer_id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('profile_id, full_name, phone')
      .eq('id', booking.customer_id)
      .single()

    if (customer) {
      customerProfileId = customer.profile_id
      customerName = customer.full_name || 'ลูกค้า'
      customerPhone = customer.phone
    }
  }

  // Get hotel name if hotel booking
  let hotelName: string | null = null
  if (booking.hotel_id) {
    const { data: hotel } = await supabase
      .from('hotels')
      .select('name')
      .eq('id', booking.hotel_id)
      .single()

    if (hotel) hotelName = hotel.name
  }

  const recipientCount = booking.recipient_count || 1
  const isCouple = recipientCount > 1

  // Base job data (shared across all jobs for this booking)
  const baseJobData = {
    booking_id: bookingId,
    customer_id: customerProfileId || booking.customer_id,
    hotel_id: booking.hotel_id || null,
    customer_name: customerName,
    customer_phone: customerPhone,
    hotel_name: hotelName,
    room_number: booking.hotel_room_number || null,
    address: booking.address || '',
    latitude: booking.latitude || null,
    longitude: booking.longitude || null,
    scheduled_date: booking.booking_date,
    scheduled_time: booking.booking_time,
    payment_status: 'paid' as const,
    status: 'pending' as const,
    customer_notes: booking.customer_notes || null,
  }

  const jobIds: string[] = []

  if (isCouple) {
    // Couple booking: fetch booking_services for per-recipient details
    const { data: bookingServices } = await supabase
      .from('booking_services')
      .select('recipient_index, recipient_name, duration, price, service:services(name_th, name_en, staff_commission_rate)')
      .eq('booking_id', bookingId)
      .order('recipient_index', { ascending: true })

    if (bookingServices && bookingServices.length > 0) {
      // Create 1 job per recipient
      for (const bs of bookingServices) {
        const svc = bs.service as any
        const recipientLabel = bs.recipient_name || `คนที่ ${(bs.recipient_index || 0) + 1}`
        const price = Number(bs.price) || 0
        const commissionRate = Number(svc?.staff_commission_rate || booking.service?.staff_commission_rate) || 0
        const earnings = Math.round(price * commissionRate / 100)
        const jobData = {
          ...baseJobData,
          staff_id: null,
          service_name: `${svc?.name_th || booking.service?.name_th || 'บริการ'} (${recipientLabel})`,
          service_name_en: svc?.name_en || booking.service?.name_en || null,
          duration_minutes: bs.duration || booking.duration || 60,
          amount: price,
          staff_earnings: earnings,
        }

        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .insert(jobData)
          .select('id')
          .single()

        if (jobError) {
          console.error(`❌ Failed to create job for recipient ${bs.recipient_index}:`, jobError)
        } else {
          jobIds.push(job.id)
          console.log(`✅ Couple job created: ${job.id} for recipient ${recipientLabel}`)
        }
      }
    } else {
      // Fallback: no booking_services found, create N identical jobs
      const fallbackCommissionRate = Number(booking.service?.staff_commission_rate) || 0
      for (let i = 0; i < recipientCount; i++) {
        const fallbackAmount = Math.round((booking.final_price || 0) / recipientCount)
        const fallbackEarnings = Math.round(fallbackAmount * fallbackCommissionRate / 100)
        const jobData = {
          ...baseJobData,
          staff_id: null,
          service_name: `${booking.service?.name_th || 'บริการ'} (คนที่ ${i + 1})`,
          service_name_en: booking.service?.name_en || null,
          duration_minutes: booking.duration || 60,
          amount: fallbackAmount,
          staff_earnings: fallbackEarnings,
        }

        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .insert(jobData)
          .select('id')
          .single()

        if (jobError) {
          console.error(`❌ Failed to create fallback job ${i}:`, jobError)
        } else {
          jobIds.push(job.id)
          console.log(`✅ Couple job created (fallback): ${job.id} for คนที่ ${i + 1}`)
        }
      }
    }
  } else {
    // Single booking: 1 job
    const singleAmount = Number(booking.final_price) || 0
    const singleCommissionRate = Number(booking.service?.staff_commission_rate) || 0
    const singleEarnings = booking.staff_earnings
      ? Number(booking.staff_earnings)
      : Math.round(singleAmount * singleCommissionRate / 100)
    const jobData = {
      ...baseJobData,
      staff_id: booking.staff_id || null,
      service_name: booking.service?.name_th || 'บริการ',
      service_name_en: booking.service?.name_en || null,
      duration_minutes: booking.duration || 60,
      amount: singleAmount,
      staff_earnings: singleEarnings,
    }

    if (booking.staff_id) {
      jobData.status = 'assigned' as const
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert(jobData)
      .select('id')
      .single()

    if (jobError) {
      console.error('❌ Failed to create job:', jobError)
    } else {
      jobIds.push(job.id)
      console.log(`✅ Job created: ${job.id} for booking ${bookingId}`)
    }
  }

  return jobIds
}

/**
 * Send notifications for a confirmed booking
 * - LINE multicast to available staff
 * - LINE push to admins
 * - In-app notification for admins
 */
export async function sendBookingConfirmedNotifications(
  bookingId: string,
  jobIds: string[]
): Promise<{ staffNotified: number; adminsNotified: number }> {
  const supabase = getSupabaseClient()
  const result = { staffNotified: 0, adminsNotified: 0 }

  // Fetch booking details
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*, service:services(*)')
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    console.error('❌ Booking not found for notification:', bookingId)
    return result
  }

  // Get customer name
  let customerName = 'ลูกค้า'
  if (booking.customer_id) {
    const { data: customer } = await supabase
      .from('customers')
      .select('full_name')
      .eq('id', booking.customer_id)
      .single()

    if (customer) {
      customerName = customer.full_name || 'ลูกค้า'
    }
  }

  // Get hotel name
  let hotelName: string | null = null
  if (booking.hotel_id) {
    const { data: hotel } = await supabase
      .from('hotels')
      .select('name')
      .eq('id', booking.hotel_id)
      .single()

    if (hotel) hotelName = hotel.name
  }

  const serviceName = booking.service?.name_th || 'บริการ'
  const scheduledDate = booking.booking_date
  const scheduledTime = booking.booking_time
  const recipientCount = booking.recipient_count || 1
  const isCouple = recipientCount > 1

  // For couple bookings, fetch booking_services for LINE message details
  let coupleServices: Array<{
    recipientIndex: number
    recipientName: string | null
    serviceName: string
    durationMinutes: number
  }> = []
  let totalStaffEarnings = 0

  if (isCouple) {
    const { data: bookingServices } = await supabase
      .from('booking_services')
      .select('recipient_index, recipient_name, duration, price, service:services(name_th, staff_commission_rate)')
      .eq('booking_id', bookingId)
      .order('recipient_index', { ascending: true })

    if (bookingServices) {
      coupleServices = bookingServices.map(bs => {
        const price = Number(bs.price) || 0
        const rate = Number((bs.service as any)?.staff_commission_rate || booking.service?.staff_commission_rate) || 0
        const earnings = Math.round(price * rate / 100)
        totalStaffEarnings += earnings
        return {
          recipientIndex: bs.recipient_index || 0,
          recipientName: bs.recipient_name,
          serviceName: (bs.service as any)?.name_th || serviceName,
          durationMinutes: bs.duration || booking.duration || 60,
          staffEarnings: earnings,
        }
      })
    }
  } else {
    // Single booking earnings
    const singleAmount = Number(booking.final_price) || 0
    const singleRate = Number(booking.service?.staff_commission_rate) || 0
    totalStaffEarnings = booking.staff_earnings
      ? Number(booking.staff_earnings)
      : Math.round(singleAmount * singleRate / 100)
  }

  // === 1. Notify available staff via LINE ===
  const { data: availableStaff } = await supabase
    .from('staff')
    .select('id, profile_id')
    .eq('is_available', true)
    .eq('status', 'active')

  if (availableStaff && availableStaff.length > 0) {
    // Get LINE user IDs from profiles
    const profileIds = availableStaff.map(s => s.profile_id).filter(Boolean)
    const { data: staffProfiles } = await supabase
      .from('profiles')
      .select('id, line_user_id')
      .in('id', profileIds)
      .not('line_user_id', 'is', null)

    const staffLineIds = staffProfiles?.map(p => p.line_user_id).filter(Boolean) as string[] || []

    if (staffLineIds.length > 0) {
      const success = await lineService.sendNewJobToStaff(staffLineIds, {
        serviceName,
        scheduledDate,
        scheduledTime,
        address: booking.address || '',
        hotelName,
        roomNumber: booking.hotel_room_number,
        staffEarnings: totalStaffEarnings,
        durationMinutes: booking.duration || 60,
        jobIds,
        isCouple,
        totalRecipients: recipientCount,
        coupleServices,
      })

      if (success) {
        result.staffNotified = staffLineIds.length
        console.log(`📱 LINE sent to ${staffLineIds.length} staff`)
      }
    }
  }

  // === 2. Notify admins via LINE + in-app ===
  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('id, line_user_id')
    .eq('role', 'ADMIN')

  if (adminProfiles && adminProfiles.length > 0) {
    // LINE push to admins with line_user_id
    const adminLineIds = adminProfiles
      .map(p => p.line_user_id)
      .filter(Boolean) as string[]

    if (adminLineIds.length > 0) {
      const coupleLabel = isCouple ? ` (Couple ${recipientCount} คน)` : ''
      await lineService.sendNewBookingToAdmin(adminLineIds, {
        bookingNumber: booking.booking_number,
        customerName,
        serviceName: serviceName + coupleLabel,
        scheduledDate,
        scheduledTime,
        finalPrice: booking.final_price || 0,
        hotelName,
        isHotelBooking: booking.is_hotel_booking || false,
      })
    }

    // In-app notifications for all admins
    const coupleText = isCouple ? ` (Couple ${recipientCount} คน)` : ''
    const notificationRows = adminProfiles.map(admin => ({
      user_id: admin.id,
      type: 'new_booking',
      title: isCouple ? 'การจอง Couple ใหม่' : 'การจองใหม่',
      message: `${customerName} จองบริการ ${serviceName}${coupleText} วันที่ ${scheduledDate} เวลา ${scheduledTime}`,
      data: {
        booking_id: bookingId,
        job_ids: jobIds,
        booking_number: booking.booking_number,
      },
      is_read: false,
    }))

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notificationRows)

    if (notifError) {
      console.error('❌ Failed to insert admin notifications:', notifError)
    } else {
      result.adminsNotified = adminProfiles.length
      console.log(`🔔 In-app notification sent to ${adminProfiles.length} admins`)
    }
  }

  return result
}

/**
 * Combined: Create job(s) + send notifications
 * Used by payment webhook and manual admin dispatch
 */
export async function processBookingConfirmed(bookingId: string): Promise<{
  success: boolean
  jobIds: string[]
  staffNotified: number
  adminsNotified: number
}> {
  // Step 1: Create job(s) — couple bookings create multiple jobs
  const jobIds = await createJobsFromBooking(bookingId)
  if (jobIds.length === 0) {
    return { success: false, jobIds: [], staffNotified: 0, adminsNotified: 0 }
  }

  // Step 2: Send notifications
  const { staffNotified, adminsNotified } = await sendBookingConfirmedNotifications(bookingId, jobIds)

  console.log(`✅ Booking ${bookingId} processed: jobs=${jobIds.join(',')}, staff=${staffNotified}, admins=${adminsNotified}`)
  return { success: true, jobIds, staffNotified, adminsNotified }
}
