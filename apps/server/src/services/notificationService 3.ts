/**
 * Notification Service
 * Handles job creation from bookings and sends notifications via LINE + in-app
 */

import { getSupabaseClient } from '../lib/supabase.js'
import { lineService } from './lineService.js'
import { emailService } from './emailService.js'

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
    status: 'pending' as 'pending' | 'assigned',
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
    staffEarnings: number
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

    // In-app notifications for staff
    const location = hotelName || booking.address || ''
    const staffNotifRows = availableStaff.map(staff => ({
      user_id: staff.profile_id,
      type: 'new_job',
      title: 'งานใหม่เข้ามา!',
      message: `มีงาน "${serviceName}" ${location ? `ที่ ${location}` : ''} วันที่ ${scheduledDate} เวลา ${scheduledTime}`,
      data: { booking_id: bookingId, job_ids: jobIds },
      is_read: false,
    }))

    if (staffNotifRows.length > 0) {
      const { error: staffNotifError } = await supabase
        .from('notifications')
        .insert(staffNotifRows)

      if (staffNotifError) {
        console.error('❌ Failed to insert staff notifications:', staffNotifError)
      } else {
        console.log(`🔔 In-app notification sent to ${staffNotifRows.length} staff`)
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

/**
 * Process job cancellation by staff:
 * 1. Cancel the existing job (keep audit trail)
 * 2. Clone to a new pending job
 * 3. Notify available staff via LINE
 * 4. Notify admins via LINE + in-app
 */
export async function processJobCancelled(
  jobId: string,
  reason: string,
  notes?: string
): Promise<{
  success: boolean
  newJobId: string | null
  staffNotified: number
  adminsNotified: number
  error?: string
}> {
  const supabase = getSupabaseClient()
  const result = { success: false, newJobId: null as string | null, staffNotified: 0, adminsNotified: 0 }

  // 1. Fetch the job
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return { ...result, error: 'Job not found' }
  }

  if (job.status === 'completed' || job.status === 'cancelled') {
    return { ...result, error: `Job already ${job.status}` }
  }

  if (!job.staff_id) {
    return { ...result, error: 'Job has no assigned staff' }
  }

  // 2. Get staff name for admin notification
  const { data: staffProfile } = await supabase
    .from('profiles')
    .select('full_name, display_name')
    .eq('id', job.staff_id)
    .single()

  const staffName = staffProfile?.display_name || staffProfile?.full_name || 'Staff'

  // 3. Cancel the existing job (preserve audit trail)
  const { error: cancelError } = await supabase
    .from('jobs')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: 'STAFF',
      cancellation_reason: reason,
      staff_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (cancelError) {
    console.error('❌ Failed to cancel job:', cancelError)
    return { ...result, error: 'Failed to cancel job' }
  }

  console.log(`🚫 Job ${jobId} cancelled by ${staffName} (${reason})`)

  // 4. Clone to new pending job
  const newJobData = {
    booking_id: job.booking_id,
    customer_id: job.customer_id,
    hotel_id: job.hotel_id,
    staff_id: null,
    customer_name: job.customer_name,
    customer_phone: job.customer_phone,
    hotel_name: job.hotel_name,
    room_number: job.room_number,
    address: job.address,
    latitude: job.latitude,
    longitude: job.longitude,
    distance_km: job.distance_km,
    service_name: job.service_name,
    service_name_en: job.service_name_en,
    duration_minutes: job.duration_minutes,
    scheduled_date: job.scheduled_date,
    scheduled_time: job.scheduled_time,
    amount: job.amount,
    staff_earnings: job.staff_earnings,
    payment_status: job.payment_status,
    status: 'pending',
    customer_notes: job.customer_notes,
  }

  const { data: newJob, error: cloneError } = await supabase
    .from('jobs')
    .insert(newJobData)
    .select('id')
    .single()

  if (cloneError || !newJob) {
    console.error('❌ Failed to clone job:', cloneError)
    return { ...result, error: 'Failed to create replacement job' }
  }

  result.newJobId = newJob.id
  console.log(`✅ New pending job created: ${newJob.id} (replacing ${jobId})`)

  // 4.5 Update staff performance metrics (cancelled_jobs count)
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { data: existingMetrics } = await supabase
    .from('staff_performance_metrics')
    .select('id, cancelled_jobs, total_jobs, completed_jobs, cancel_rate')
    .eq('staff_id', job.staff_id)
    .eq('year', year)
    .eq('month', month)
    .single()

  if (existingMetrics) {
    const cancelledJobs = (existingMetrics.cancelled_jobs || 0) + 1
    const totalJobs = existingMetrics.total_jobs || 1
    const cancelRate = totalJobs > 0 ? Math.round((cancelledJobs / totalJobs) * 100) : 0
    await supabase
      .from('staff_performance_metrics')
      .update({
        cancelled_jobs: cancelledJobs,
        cancel_rate: cancelRate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingMetrics.id)
    console.log(`📊 Staff metrics updated: cancelled_jobs=${cancelledJobs}, cancel_rate=${cancelRate}%`)
  } else {
    // Create initial metrics row for this month
    await supabase
      .from('staff_performance_metrics')
      .insert({
        staff_id: job.staff_id,
        year,
        month,
        total_jobs: 1,
        completed_jobs: 0,
        cancelled_jobs: 1,
        cancel_rate: 100,
      })
    console.log(`📊 Staff metrics created for ${year}-${month}`)
  }

  // 5. Check couple context
  let isCouple = false
  let totalRecipients = 1
  let activeStaffCount = 0
  let recipientName: string | null = null

  if (job.booking_id) {
    const { data: siblingJobs } = await supabase
      .from('jobs')
      .select('id, status, staff_id, service_name')
      .eq('booking_id', job.booking_id)
      .neq('id', jobId)           // exclude the cancelled job
      .neq('id', newJob.id)       // exclude the new job

    if (siblingJobs && siblingJobs.length > 0) {
      isCouple = true
      totalRecipients = siblingJobs.length + 1  // siblings + this one
      activeStaffCount = siblingJobs.filter(j => j.staff_id && j.status !== 'cancelled').length
    }

    // Extract recipient name from service_name if it contains parenthetical
    const match = job.service_name?.match(/\((.+?)\)$/)
    if (match) recipientName = match[1]
  }

  // 6. Notify available staff via LINE
  const { data: availableStaff } = await supabase
    .from('staff')
    .select('id, profile_id')
    .eq('is_available', true)
    .eq('status', 'active')

  if (availableStaff && availableStaff.length > 0) {
    const profileIds = availableStaff.map(s => s.profile_id).filter(Boolean)
    const { data: staffProfiles } = await supabase
      .from('profiles')
      .select('id, line_user_id')
      .in('id', profileIds)
      .not('line_user_id', 'is', null)

    const staffLineIds = staffProfiles?.map(p => p.line_user_id).filter(Boolean) as string[] || []

    if (staffLineIds.length > 0) {
      const success = await lineService.sendJobReAvailableToStaff(staffLineIds, {
        serviceName: job.service_name,
        scheduledDate: job.scheduled_date,
        scheduledTime: job.scheduled_time,
        address: job.address || '',
        hotelName: job.hotel_name,
        roomNumber: job.room_number,
        staffEarnings: Number(job.staff_earnings) || 0,
        durationMinutes: job.duration_minutes,
        newJobId: newJob.id,
        isCouple,
        recipientName,
        totalRecipients,
        activeStaffCount,
      })

      if (success) {
        result.staffNotified = staffLineIds.length
        console.log(`📱 LINE re-available sent to ${staffLineIds.length} staff`)
      }
    }

    // In-app notifications for staff
    const staffNotifRows = availableStaff.map(staff => ({
      user_id: staff.profile_id,
      type: 'job_cancelled',
      title: 'งานว่างเพิ่ม!',
      message: `งาน "${job.service_name}" วันที่ ${job.scheduled_date} ว่างแล้ว เนื่องจากพนักงานยกเลิก`,
      data: { job_id: jobId, new_job_id: newJob.id, booking_id: job.booking_id },
      is_read: false,
    }))

    if (staffNotifRows.length > 0) {
      const { error: staffNotifError } = await supabase
        .from('notifications')
        .insert(staffNotifRows)

      if (staffNotifError) {
        console.error('❌ Failed to insert staff cancellation notifications:', staffNotifError)
      } else {
        console.log(`🔔 Cancellation notification sent to ${staffNotifRows.length} staff`)
      }
    }
  }

  // 7. Notify admins via LINE + in-app
  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('id, line_user_id')
    .eq('role', 'ADMIN')

  if (adminProfiles && adminProfiles.length > 0) {
    // Get booking number
    let bookingNumber: string | null = null
    if (job.booking_id) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('booking_number')
        .eq('id', job.booking_id)
        .single()
      bookingNumber = booking?.booking_number || null
    }

    // LINE push to admins
    const adminLineIds = adminProfiles.map(p => p.line_user_id).filter(Boolean) as string[]
    if (adminLineIds.length > 0) {
      await lineService.sendJobCancelledToAdmin(adminLineIds, {
        staffName,
        reason,
        notes,
        serviceName: job.service_name,
        scheduledDate: job.scheduled_date,
        scheduledTime: job.scheduled_time,
        customerName: job.customer_name,
        bookingNumber,
        isCouple,
        totalRecipients,
        activeStaffCount,
      })
    }

    // In-app notifications
    const coupleText = isCouple ? ` (Couple ${totalRecipients} คน — เหลือ ${activeStaffCount} ตำแหน่งที่มี Staff)` : ''
    const notificationRows = adminProfiles.map(admin => ({
      user_id: admin.id,
      type: 'job_cancelled',
      title: 'Staff ยกเลิกงาน',
      message: `${staffName} ยกเลิกงาน ${job.service_name} วันที่ ${job.scheduled_date} เหตุผล: ${reason}${coupleText}`,
      data: {
        job_id: jobId,
        new_job_id: newJob.id,
        booking_id: job.booking_id,
        booking_number: bookingNumber,
        staff_name: staffName,
        reason,
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
      console.log(`🔔 Cancellation notification sent to ${adminProfiles.length} admins`)
    }
  }

  result.success = true
  console.log(`✅ Job cancellation processed: cancelled=${jobId}, new=${newJob.id}, staff=${result.staffNotified}, admins=${result.adminsNotified}`)
  return result
}

/**
 * Process job reminders (called by cron every minute)
 * Queries upcoming jobs with assigned staff, checks reminder preferences,
 * sends LINE push notifications for due reminders, tracks sent records.
 */
export async function processJobReminders(): Promise<number> {
  const supabase = getSupabaseClient()
  const now = new Date()
  let sentCount = 0

  // 1. Get upcoming jobs (within next 25 hours, assigned to staff, not finished)
  const todayStr = now.toLocaleDateString('en-CA') // YYYY-MM-DD format
  const tomorrowDate = new Date(now.getTime() + 25 * 60 * 60 * 1000)
  const tomorrowStr = tomorrowDate.toLocaleDateString('en-CA')

  const { data: upcomingJobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id, staff_id, service_name, scheduled_date, scheduled_time, duration_minutes, staff_earnings, address, hotel_name, room_number, customer_name, status')
    .not('staff_id', 'is', null)
    .in('status', ['confirmed', 'assigned', 'traveling', 'arrived'])
    .gte('scheduled_date', todayStr)
    .lte('scheduled_date', tomorrowStr)

  if (jobsError) {
    console.error('[Reminder] Query error:', jobsError)
    return 0
  }

  if (!upcomingJobs || upcomingJobs.length === 0) {
    return 0
  }

  console.log(`[Reminder] Found ${upcomingJobs.length} upcoming jobs to check`)

  // 2. Get staff reminder preferences (only enabled ones)
  const staffIds = [...new Set(upcomingJobs.map(j => j.staff_id).filter(Boolean))] as string[]
  if (staffIds.length === 0) return 0

  const { data: staffRecords } = await supabase
    .from('staff')
    .select('profile_id, reminder_minutes, reminders_enabled')
    .in('profile_id', staffIds)
    .eq('reminders_enabled', true)

  if (!staffRecords || staffRecords.length === 0) return 0

  const staffPrefsMap = new Map(staffRecords.map(s => [s.profile_id, s.reminder_minutes as number[]]))

  // 3. Get LINE user IDs
  const enabledProfileIds = staffRecords.map(s => s.profile_id).filter(Boolean) as string[]
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, line_user_id')
    .in('id', enabledProfileIds)
    .not('line_user_id', 'is', null)

  if (!profiles || profiles.length === 0) return 0

  const lineIdMap = new Map(profiles.map(p => [p.id, p.line_user_id as string]))

  // 4. Get already-sent reminders for these jobs
  const jobIds = upcomingJobs.map(j => j.id)
  const { data: sentReminders } = await supabase
    .from('sent_job_reminders')
    .select('job_id, minutes_before')
    .in('job_id', jobIds)

  const sentSet = new Set(sentReminders?.map(r => `${r.job_id}-${r.minutes_before}`) || [])

  // 5. Check each job × each reminder time
  for (const job of upcomingJobs) {
    const reminderMinutes = staffPrefsMap.get(job.staff_id)
    if (!reminderMinutes || reminderMinutes.length === 0) continue

    const lineUserId = lineIdMap.get(job.staff_id)
    if (!lineUserId) continue

    // Parse job datetime in Thailand timezone (UTC+7)
    const rawTime = (job.scheduled_time || '00:00:00').split('.')[0] // Remove microseconds
    const jobDateTime = new Date(`${job.scheduled_date}T${rawTime}+07:00`)

    // Skip if job time already passed
    if (jobDateTime <= now) continue

    for (const minutesBefore of reminderMinutes) {
      const remindAt = new Date(jobDateTime.getTime() - minutesBefore * 60000)
      const sentKey = `${job.id}-${minutesBefore}`

      // Send if remind_at has passed and not yet sent
      if (remindAt <= now && !sentSet.has(sentKey)) {
        const success = await lineService.sendJobReminderToStaff(lineUserId, {
          serviceName: job.service_name,
          scheduledDate: job.scheduled_date,
          scheduledTime: rawTime.substring(0, 5),
          address: job.address || '',
          hotelName: job.hotel_name,
          roomNumber: job.room_number,
          staffEarnings: Number(job.staff_earnings) || 0,
          durationMinutes: job.duration_minutes,
          customerName: job.customer_name,
          jobId: job.id,
          minutesBefore,
        })

        if (success) {
          // Mark as sent
          await supabase
            .from('sent_job_reminders')
            .insert({ job_id: job.id, minutes_before: minutesBefore })

          sentCount++
          console.log(`⏰ Reminder sent: job=${job.id}, ${minutesBefore}min before, staff=${job.staff_id}`)
        }
      }
    }
  }

  return sentCount
}

/**
 * Process job escalations (called by cron every 5 minutes)
 * Detects pending jobs without staff and sends escalating notifications:
 * Level 1 (>30min): Re-remind staff via LINE + in-app
 * Level 2 (>2hrs): Alert admins via in-app
 * Level 3 (<24hrs to appointment): Urgent admin alert via in-app
 */
export async function processJobEscalations(): Promise<number> {
  const supabase = getSupabaseClient()
  const now = new Date()
  let sentCount = 0

  const todayStr = now.toLocaleDateString('en-CA')

  // 1. Get pending jobs without staff (only future/today)
  const { data: pendingJobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id, booking_id, service_name, scheduled_date, scheduled_time, duration_minutes, staff_earnings, address, hotel_name, room_number, customer_name, created_at')
    .eq('status', 'pending')
    .is('staff_id', null)
    .gte('scheduled_date', todayStr)

  if (jobsError) {
    console.error('[Escalation] Query error:', jobsError)
    return 0
  }

  if (!pendingJobs || pendingJobs.length === 0) return 0

  // 2. Get already-sent escalations
  const jobIds = pendingJobs.map(j => j.id)
  const { data: sentEscalations } = await supabase
    .from('sent_job_escalations')
    .select('job_id, escalation_level')
    .in('job_id', jobIds)

  const sentSet = new Set(sentEscalations?.map(r => `${r.job_id}-${r.escalation_level}`) || [])

  // 3. Get available staff LINE IDs (for level 1)
  const { data: availableStaff } = await supabase
    .from('staff')
    .select('id, profile_id')
    .eq('is_available', true)
    .eq('status', 'active')

  let staffLineIds: string[] = []
  let staffProfileIds: string[] = []
  if (availableStaff && availableStaff.length > 0) {
    staffProfileIds = availableStaff.map(s => s.profile_id).filter(Boolean)
    const { data: staffProfiles } = await supabase
      .from('profiles')
      .select('id, line_user_id')
      .in('id', staffProfileIds)
      .not('line_user_id', 'is', null)

    staffLineIds = staffProfiles?.map(p => p.line_user_id).filter(Boolean) as string[] || []
  }

  // 4. Get admin profiles (for level 2 & 3)
  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('id, line_user_id')
    .eq('role', 'ADMIN')

  // 5. Get booking numbers for notifications
  const bookingIds = [...new Set(pendingJobs.map(j => j.booking_id).filter(Boolean))]
  let bookingNumberMap = new Map<string, string>()
  if (bookingIds.length > 0) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, booking_number')
      .in('id', bookingIds)

    if (bookings) {
      bookingNumberMap = new Map(bookings.map(b => [b.id, b.booking_number]))
    }
  }

  // 6. Process each job
  for (const job of pendingJobs) {
    const createdAt = new Date(job.created_at || now.toISOString())
    const minutesPending = Math.floor((now.getTime() - createdAt.getTime()) / 60000)

    const rawTime = (job.scheduled_time || '00:00:00').split('.')[0]
    const jobDateTime = new Date(`${job.scheduled_date}T${rawTime}+07:00`)
    const minutesUntilAppointment = Math.floor((jobDateTime.getTime() - now.getTime()) / 60000)

    // Skip if appointment already passed
    if (jobDateTime <= now) continue

    const bookingNumber = job.booking_id ? bookingNumberMap.get(job.booking_id) || null : null

    // === Level 1: Staff re-reminder (pending > 30 min) ===
    if (minutesPending >= 30 && !sentSet.has(`${job.id}-1`)) {
      // LINE multicast to staff
      if (staffLineIds.length > 0) {
        await lineService.sendJobEscalationToStaff(staffLineIds, {
          serviceName: job.service_name,
          scheduledDate: job.scheduled_date,
          scheduledTime: rawTime.substring(0, 5),
          address: job.address || '',
          hotelName: job.hotel_name,
          roomNumber: job.room_number,
          staffEarnings: Number(job.staff_earnings) || 0,
          durationMinutes: job.duration_minutes,
          jobId: job.id,
          minutesPending,
        })
      }

      // In-app for staff
      if (availableStaff && availableStaff.length > 0) {
        const staffNotifRows = availableStaff.map(staff => ({
          user_id: staff.profile_id,
          type: 'job_no_staff',
          title: 'งานยังไม่มีคนรับ!',
          message: `งาน "${job.service_name}" วันที่ ${job.scheduled_date} รอมาแล้ว ${minutesPending} นาที`,
          data: { job_id: job.id, booking_id: job.booking_id, escalation_level: 1 },
          is_read: false,
        }))
        await supabase.from('notifications').insert(staffNotifRows)
      }

      await supabase.from('sent_job_escalations').insert({ job_id: job.id, escalation_level: 1 })
      sentCount++
      console.log(`📢 Escalation L1: job=${job.id}, pending ${minutesPending}min, staff re-reminded`)
    }

    // === Level 2: Admin alert (pending > 2 hours) ===
    if (minutesPending >= 120 && !sentSet.has(`${job.id}-2`) && adminProfiles) {
      const adminNotifRows = adminProfiles.map(admin => ({
        user_id: admin.id,
        type: 'job_no_staff_warning',
        title: '⚠️ งานยังไม่มี Staff รับ',
        message: `งาน "${job.service_name}" (${job.customer_name}) วันที่ ${job.scheduled_date} เวลา ${rawTime.substring(0, 5)} รอมาแล้ว ${Math.floor(minutesPending / 60)} ชั่วโมง${bookingNumber ? ` (${bookingNumber})` : ''}`,
        data: { job_id: job.id, booking_id: job.booking_id, booking_number: bookingNumber, escalation_level: 2, minutes_pending: minutesPending },
        is_read: false,
      }))
      await supabase.from('notifications').insert(adminNotifRows)

      await supabase.from('sent_job_escalations').insert({ job_id: job.id, escalation_level: 2 })
      sentCount++
      console.log(`⚠️ Escalation L2: job=${job.id}, pending ${minutesPending}min, admin alerted`)
    }

    // === Level 3: Urgent admin alert (appointment < 24 hours) ===
    if (minutesUntilAppointment <= 1440 && !sentSet.has(`${job.id}-3`) && adminProfiles) {
      const hoursUntil = Math.floor(minutesUntilAppointment / 60)
      const adminNotifRows = adminProfiles.map(admin => ({
        user_id: admin.id,
        type: 'job_no_staff_urgent',
        title: '🚨 ด่วน! งานใกล้ถึงเวลายังไม่มี Staff',
        message: `งาน "${job.service_name}" (${job.customer_name}) อีก ${hoursUntil} ชั่วโมงจะถึงเวลานัด แต่ยังไม่มี Staff รับ!${bookingNumber ? ` (${bookingNumber})` : ''}`,
        data: { job_id: job.id, booking_id: job.booking_id, booking_number: bookingNumber, escalation_level: 3, minutes_until_appointment: minutesUntilAppointment },
        is_read: false,
      }))
      await supabase.from('notifications').insert(adminNotifRows)

      await supabase.from('sent_job_escalations').insert({ job_id: job.id, escalation_level: 3 })
      sentCount++
      console.log(`🚨 Escalation L3: job=${job.id}, appointment in ${hoursUntil}hrs, URGENT admin alert`)
    }
  }

  return sentCount
}

/**
 * Cleanup old sent records (older than 3 days)
 * Called by daily cron job
 */
export async function cleanupOldReminders(): Promise<void> {
  const supabase = getSupabaseClient()
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { error: err1 } = await supabase
    .from('sent_job_reminders')
    .delete()
    .lt('sent_at', threeDaysAgo)

  const { error: err2 } = await supabase
    .from('sent_customer_email_reminders')
    .delete()
    .lt('sent_at', threeDaysAgo)

  const { error: err3 } = await supabase
    .from('sent_job_escalations')
    .delete()
    .lt('sent_at', threeDaysAgo)

  if (err1) console.error('❌ Failed to cleanup sent_job_reminders:', err1)
  if (err2) console.error('❌ Failed to cleanup sent_customer_email_reminders:', err2)
  if (err3) console.error('❌ Failed to cleanup sent_job_escalations:', err3)
  if (!err1 && !err2 && !err3) console.log('🧹 Old reminder/escalation records cleaned up')
}

/**
 * Process customer email reminders (called by cron every 5 minutes)
 * Sends email reminders to customers 24 hours and 2 hours before their appointment.
 */
export async function processCustomerEmailReminders(): Promise<number> {
  const supabase = getSupabaseClient()
  const now = new Date()
  let sentCount = 0

  const REMINDER_MINUTES = [1440, 120] // 24 hours, 2 hours

  // 1. Get upcoming jobs (within next 25 hours)
  const todayStr = now.toLocaleDateString('en-CA')
  const futureDate = new Date(now.getTime() + 25 * 60 * 60 * 1000)
  const futureStr = futureDate.toLocaleDateString('en-CA')

  const { data: upcomingJobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id, customer_id, service_name, scheduled_date, scheduled_time, duration_minutes, address, hotel_name, room_number, customer_name, status')
    .not('customer_id', 'is', null)
    .in('status', ['confirmed', 'assigned', 'traveling', 'arrived'])
    .gte('scheduled_date', todayStr)
    .lte('scheduled_date', futureStr)

  if (jobsError) {
    console.error('[CustomerReminder] Query error:', jobsError)
    return 0
  }

  if (!upcomingJobs || upcomingJobs.length === 0) return 0

  // 2. Get customer emails, language, and notification preferences
  const customerIds = [...new Set(upcomingJobs.map(j => j.customer_id).filter(Boolean))] as string[]
  if (customerIds.length === 0) return 0

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, language')
    .in('id', customerIds)
    .not('email', 'is', null)

  if (!profiles || profiles.length === 0) return 0

  // Check customer preferences (booking_updates toggle)
  const { data: customers } = await supabase
    .from('customers')
    .select('profile_id, preferences')
    .in('profile_id', customerIds)

  const optOutSet = new Set<string>()
  if (customers) {
    for (const c of customers) {
      const prefs = c.preferences as any
      if (prefs?.notifications?.booking_updates === false) {
        optOutSet.add(c.profile_id)
      }
    }
  }

  const profileMap = new Map(profiles
    .filter(p => !optOutSet.has(p.id))
    .map(p => [p.id, { email: p.email as string, language: (p.language || 'en') as string }])
  )

  // 3. Get already-sent email reminders for these jobs
  const jobIds = upcomingJobs.map(j => j.id)
  const { data: sentReminders } = await supabase
    .from('sent_customer_email_reminders')
    .select('job_id, minutes_before')
    .in('job_id', jobIds)

  const sentSet = new Set(sentReminders?.map(r => `${r.job_id}-${r.minutes_before}`) || [])

  // 4. Check each job × each reminder time
  for (const job of upcomingJobs) {
    const profile = profileMap.get(job.customer_id)
    if (!profile) continue

    // Parse job datetime in Thailand timezone (UTC+7)
    const rawTime = (job.scheduled_time || '00:00:00').split('.')[0]
    const jobDateTime = new Date(`${job.scheduled_date}T${rawTime}+07:00`)

    // Skip if job time already passed
    if (jobDateTime <= now) continue

    for (const minutesBefore of REMINDER_MINUTES) {
      const remindAt = new Date(jobDateTime.getTime() - minutesBefore * 60000)
      const sentKey = `${job.id}-${minutesBefore}`

      if (remindAt <= now && !sentSet.has(sentKey)) {
        try {
          await emailService.sendCustomerReminder(profile.email, {
            customerName: job.customer_name,
            serviceName: job.service_name,
            scheduledDate: job.scheduled_date,
            scheduledTime: rawTime.substring(0, 5),
            durationMinutes: job.duration_minutes,
            address: job.address || '',
            hotelName: job.hotel_name,
            roomNumber: job.room_number,
            minutesBefore,
          }, profile.language)

          await supabase
            .from('sent_customer_email_reminders')
            .insert({ job_id: job.id, minutes_before: minutesBefore })

          sentCount++
          console.log(`📧 Customer reminder sent: job=${job.id}, ${minutesBefore}min before, email=${profile.email}`)
        } catch (err) {
          console.error(`❌ Failed to send customer reminder: job=${job.id}, email=${profile.email}`, err)
        }
      }
    }
  }

  return sentCount
}
