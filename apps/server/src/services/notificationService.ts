/**
 * Notification Service
 * Handles job creation from bookings and sends notifications via LINE + in-app
 */

import { getSupabaseClient } from '../lib/supabase.js'
import { lineService } from './lineService.js'
import { emailService, creditDueReminderEmailTemplate } from './emailService.js'
import { googleCalendarService } from './googleCalendarService.js'

/**
 * Get Thai label for provider preference (server-side helper)
 */
function getProviderPreferenceLabelServer(preference: string | null | undefined): string {
  switch (preference) {
    case 'female-only': return 'ผู้หญิงเท่านั้น'
    case 'male-only': return 'ผู้ชายเท่านั้น'
    case 'prefer-female': return 'ต้องการผู้หญิง'
    case 'prefer-male': return 'ต้องการผู้ชาย'
    default: return 'ไม่ระบุ'
  }
}

/**
 * Filter staff by provider preference (gender-based)
 */
function filterStaffByProviderPreference<T extends { gender?: string | null }>(
  staff: T[],
  preference: string | null | undefined
): T[] {
  if (!preference || preference === 'no-preference') return staff

  switch (preference) {
    case 'female-only':
      return staff.filter(s => s.gender === 'female')
    case 'male-only':
      return staff.filter(s => s.gender === 'male')
    case 'prefer-female': {
      const preferred = staff.filter(s => s.gender === 'female')
      return preferred.length > 0 ? preferred : staff
    }
    case 'prefer-male': {
      const preferred = staff.filter(s => s.gender === 'male')
      return preferred.length > 0 ? preferred : staff
    }
    default:
      return staff
  }
}

/**
 * Create job(s) from a confirmed booking (idempotent)
 * - Single booking: 1 job
 * - Couple booking (simultaneous): 1 job per recipient (each needs a separate staff)
 * Returns array of job IDs
 */
export async function createJobsFromBooking(bookingId: string): Promise<string[]> {
  const supabase = getSupabaseClient()

  // Fetch booking with related data (needed for couple-aware idempotency check)
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('*, service:services(*)')
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    console.error('❌ Booking not found for job creation:', bookingId, bookingError)
    return []
  }

  const expectedJobCount = booking.recipient_count || 1

  // Couple-aware idempotency check
  const { data: existingJobs } = await supabase
    .from('jobs')
    .select('id')
    .eq('booking_id', bookingId)

  if (existingJobs && existingJobs.length > 0) {
    if (existingJobs.length >= expectedJobCount) {
      // Correct number of jobs already exist
      console.log(`📋 Jobs already exist for booking ${bookingId} (${existingJobs.length}/${expectedJobCount}): ${existingJobs.map(j => j.id).join(', ')}`)
      return existingJobs.map(j => j.id)
    }
    // Couple booking with fewer jobs than needed (trigger created 1 but need more)
    // Delete incomplete set and recreate properly below
    console.log(`📋 Couple booking ${bookingId} has ${existingJobs.length} jobs but needs ${expectedJobCount}. Deleting and recreating...`)
    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .eq('booking_id', bookingId)
      .is('staff_id', null) // Only delete unassigned jobs

    if (deleteError) {
      console.error(`❌ Failed to delete incomplete jobs for booking ${bookingId}:`, deleteError)
      return existingJobs.map(j => j.id)
    }
    // Fall through to create proper jobs below
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
        const earnings = Math.round(price * commissionRate)
        const jobData = {
          ...baseJobData,
          staff_id: null,
          service_name: `${svc?.name_th || booking.service?.name_th || 'บริการ'} (${recipientLabel})`,
          service_name_en: svc?.name_en || booking.service?.name_en || null,
          duration_minutes: bs.duration || booking.duration || 60,
          amount: price,
          staff_earnings: earnings,
          job_index: (bs.recipient_index || 0) + 1,
          total_jobs: recipientCount,
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
          job_index: i + 1,
          total_jobs: recipientCount,
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
  } else if (booking.is_hotel_booking && booking.customer_notes) {
    // Hotel bookings store guest name in customer_notes: "Guest: name, Phone: xxx"
    const guestMatch = booking.customer_notes.match(/Guest:\s*([^,]+)/)
    if (guestMatch) {
      customerName = guestMatch[1].trim()
    }
  }

  // Get hotel name
  let hotelName: string | null = null
  if (booking.hotel_id) {
    const { data: hotel } = await supabase
      .from('hotels')
      .select('name_th, name_en')
      .eq('id', booking.hotel_id)
      .single()

    if (hotel) hotelName = hotel.name_th || hotel.name_en
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
        const earnings = Math.round(price * rate)
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
      : Math.round(singleAmount * singleRate)
  }

  // === 1. Notify available staff via LINE (filtered by provider preference) ===
  const { data: allAvailableStaff } = await supabase
    .from('staff')
    .select('id, profile_id, gender')
    .eq('is_available', true)
    .eq('status', 'active')

  const availableStaff = filterStaffByProviderPreference(allAvailableStaff || [], booking.provider_preference)
  console.log(`👥 Staff filter: preference=${booking.provider_preference || 'no-preference'}, total=${allAvailableStaff?.length || 0}, filtered=${availableStaff.length}`)

  if (availableStaff.length > 0) {
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
    // Build service description for couple bookings
    let serviceDesc = `"${serviceName}"`
    if (isCouple && coupleServices.length > 0) {
      const serviceList = coupleServices.map(s => s.serviceName).join(' + ')
      serviceDesc = `Couple ${recipientCount} คน: ${serviceList}`
    }
    const staffNotifRows = availableStaff.map(staff => ({
      user_id: staff.profile_id,
      type: 'new_job',
      title: isCouple ? 'งาน Couple ใหม่เข้ามา!' : 'งานใหม่เข้ามา!',
      message: `มีงาน ${serviceDesc} ${location ? `ที่ ${location}` : ''} วันที่ ${scheduledDate} เวลา ${scheduledTime}${booking.provider_preference && booking.provider_preference !== 'no-preference' ? ` (ลูกค้าต้องการ: ${getProviderPreferenceLabelServer(booking.provider_preference)})` : ''}`,
      data: { booking_id: bookingId, job_ids: jobIds, provider_preference: booking.provider_preference || 'no-preference' },
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

  // Detect mid-service cancellation
  const isMidService = job.status === 'in_progress' && job.started_at
  let serviceElapsedMinutes: number | null = null
  if (isMidService) {
    serviceElapsedMinutes = Math.floor((Date.now() - new Date(job.started_at).getTime()) / 60000)
  }
  const cancellationType = isMidService ? 'mid_service' : 'pre_service'

  console.log(`[Cancel] type=${cancellationType}${isMidService ? ` elapsed=${serviceElapsedMinutes}min` : ''}`)

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
      cancellation_type: cancellationType,
      service_elapsed_minutes: serviceElapsedMinutes,
      staff_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (cancelError) {
    console.error('❌ Failed to cancel job:', cancelError)
    return { ...result, error: 'Failed to cancel job' }
  }

  console.log(`🚫 Job ${jobId} cancelled by ${staffName} (${reason}) [${cancellationType}]`)

  // 4. For pre-service: clone to new pending job so other staff can accept
  //    For mid-service: do NOT create replacement job (service already started)
  let newJob: { id: string } | null = null

  if (!isMidService) {
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

    const { data: clonedJob, error: cloneError } = await supabase
      .from('jobs')
      .insert(newJobData)
      .select('id')
      .single()

    if (cloneError || !clonedJob) {
      console.error('❌ Failed to clone job:', cloneError)
      return { ...result, error: 'Failed to create replacement job' }
    }

    newJob = clonedJob
    result.newJobId = clonedJob.id
    console.log(`✅ New pending job created: ${clonedJob.id} (replacing ${jobId})`)
  } else {
    console.log(`⚠️ Mid-service cancellation — no replacement job created`)
  }

  // 4.5 Update staff performance metrics
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const { data: existingMetrics } = await supabase
    .from('staff_performance_metrics')
    .select('id, cancelled_jobs, mid_service_cancellations, total_jobs, completed_jobs, cancel_rate')
    .eq('staff_id', job.staff_id)
    .eq('year', year)
    .eq('month', month)
    .single()

  if (existingMetrics) {
    const cancelledJobs = (existingMetrics.cancelled_jobs || 0) + 1
    const midServiceCount = (existingMetrics.mid_service_cancellations || 0) + (isMidService ? 1 : 0)
    const totalJobs = existingMetrics.total_jobs || 1
    const cancelRate = totalJobs > 0 ? Math.round((cancelledJobs / totalJobs) * 100) : 0
    await supabase
      .from('staff_performance_metrics')
      .update({
        cancelled_jobs: cancelledJobs,
        mid_service_cancellations: midServiceCount,
        cancel_rate: cancelRate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingMetrics.id)
    console.log(`📊 Staff metrics updated: cancelled_jobs=${cancelledJobs}, mid_service=${midServiceCount}, cancel_rate=${cancelRate}%`)
  } else {
    await supabase
      .from('staff_performance_metrics')
      .insert({
        staff_id: job.staff_id,
        year,
        month,
        total_jobs: 1,
        completed_jobs: 0,
        cancelled_jobs: 1,
        mid_service_cancellations: isMidService ? 1 : 0,
        cancel_rate: 100,
      })
    console.log(`📊 Staff metrics created for ${year}-${month}`)
  }

  // 5. Check couple context
  let isCouple = false
  let totalRecipients = 1
  let activeStaffCount = 0
  let recipientName: string | null = null
  let couplePartnerJobs: any[] = []

  if (job.booking_id) {
    const excludeIds = [jobId]
    if (newJob) excludeIds.push(newJob.id)

    const { data: siblingJobs } = await supabase
      .from('jobs')
      .select('id, status, staff_id, service_name')
      .eq('booking_id', job.booking_id)
      .not('id', 'in', `(${excludeIds.join(',')})`)

    if (siblingJobs && siblingJobs.length > 0) {
      isCouple = true
      totalRecipients = siblingJobs.length + 1
      activeStaffCount = siblingJobs.filter(j => j.staff_id && j.status !== 'cancelled').length
      couplePartnerJobs = siblingJobs.filter(j => j.staff_id && j.status !== 'cancelled')
    }

    const match = job.service_name?.match(/\((.+?)\)$/)
    if (match) recipientName = match[1]
  }

  // 6. Get provider_preference + booking number from booking
  let providerPreference: string | null = null
  let bookingNumber: string | null = null
  if (job.booking_id) {
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('provider_preference, booking_number')
      .eq('id', job.booking_id)
      .single()
    providerPreference = bookingData?.provider_preference || null
    bookingNumber = bookingData?.booking_number || null
  }

  // === NOTIFICATION BRANCHING: mid-service vs pre-service ===

  if (isMidService) {
    // ─── MID-SERVICE: Urgent notifications to Admin, Hotel, Couple partner ───
    // Do NOT notify all available staff (no replacement job)

    const midServiceLabel = `ยกเลิกระหว่างให้บริการ (ทำไปแล้ว ${serviceElapsedMinutes} นาที จาก ${job.duration_minutes} นาที)`
    const coupleText = isCouple ? ` [Couple ${totalRecipients} คน — เหลือ ${activeStaffCount} ตำแหน่งที่มี Staff]` : ''

    // 7a. Notify admins (urgent)
    const { data: adminProfiles } = await supabase
      .from('profiles')
      .select('id, line_user_id')
      .eq('role', 'ADMIN')

    if (adminProfiles && adminProfiles.length > 0) {
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

      const adminNotifRows = adminProfiles.map(admin => ({
        user_id: admin.id,
        type: 'job_cancelled',
        title: 'Staff ยกเลิกระหว่างให้บริการ',
        message: `${staffName} ${midServiceLabel} งาน ${job.service_name} วันที่ ${job.scheduled_date} เหตุผล: ${reason}${coupleText}`,
        data: {
          job_id: jobId,
          booking_id: job.booking_id,
          booking_number: bookingNumber,
          staff_name: staffName,
          reason,
          cancellation_type: 'mid_service',
          service_elapsed_minutes: serviceElapsedMinutes,
        },
        is_read: false,
      }))

      const { error: notifError } = await supabase.from('notifications').insert(adminNotifRows)
      if (!notifError) {
        result.adminsNotified = adminProfiles.length
        console.log(`🔴 [MidService] Admin notification sent to ${adminProfiles.length} admins`)
      }
    }

    // 7b. Notify hotel (urgent)
    if (job.hotel_id) {
      try {
        const { data: hotelProfiles } = await supabase
          .from('profiles')
          .select('id, line_user_id')
          .eq('hotel_id', job.hotel_id)
          .eq('role', 'HOTEL')

        if (hotelProfiles && hotelProfiles.length > 0) {
          // LINE to hotel
          const hotelLineIds = hotelProfiles.map(p => p.line_user_id).filter(Boolean) as string[]
          if (hotelLineIds.length > 0) {
            await lineService.sendBookingCancelledToStaff(hotelLineIds, {
              serviceName: job.service_name,
              scheduledDate: job.scheduled_date,
              scheduledTime: job.scheduled_time,
              address: '',
              hotelName: job.hotel_name,
              cancellationReason: `${staffName} ${midServiceLabel} เหตุผล: ${reason}`,
              bookingNumber,
              cancelledBy: 'admin',
            })
          }

          // In-app to hotel
          const hotelNotifRows = hotelProfiles.map(profile => ({
            user_id: profile.id,
            type: 'staff_cancelled',
            title: 'พนักงานยกเลิกระหว่างให้บริการ',
            message: `พนักงาน ${staffName} ${midServiceLabel} งาน "${job.service_name}" เหตุผล: ${reason} กรุณาติดต่อแขก Admin ได้รับแจ้งแล้ว`,
            data: {
              booking_id: job.booking_id,
              job_id: jobId,
              staff_name: staffName,
              reason,
              cancellation_type: 'mid_service',
              service_elapsed_minutes: serviceElapsedMinutes,
            },
            is_read: false,
          }))

          await supabase.from('notifications').insert(hotelNotifRows)
          console.log(`🔴 [MidService] Hotel notification sent to ${hotelProfiles.length} hotel user(s)`)
        }
      } catch (hotelNotifError) {
        console.error('[Hotel] Mid-service notification error (non-blocking):', hotelNotifError)
      }
    }

    // 7c. Notify couple partner staff (if couple booking)
    if (isCouple && couplePartnerJobs.length > 0) {
      const partnerStaffIds = couplePartnerJobs.map(j => j.staff_id).filter(Boolean)
      if (partnerStaffIds.length > 0) {
        // Get partner LINE user IDs
        const { data: partnerProfiles } = await supabase
          .from('profiles')
          .select('id, line_user_id')
          .in('id', partnerStaffIds)

        if (partnerProfiles && partnerProfiles.length > 0) {
          // LINE to couple partner
          const partnerLineIds = partnerProfiles.map(p => p.line_user_id).filter(Boolean) as string[]
          if (partnerLineIds.length > 0) {
            await lineService.sendBookingCancelledToStaff(partnerLineIds, {
              serviceName: job.service_name,
              scheduledDate: job.scheduled_date,
              scheduledTime: job.scheduled_time,
              address: '',
              hotelName: job.hotel_name,
              cancellationReason: `พนักงานอีกคนในงาน Couple ยกเลิกระหว่างให้บริการ Admin ได้รับแจ้งแล้ว กรุณาทำงานของคุณต่อตามปกติ`,
              bookingNumber,
              cancelledBy: 'admin',
            })
          }

          // In-app to couple partner
          const partnerNotifRows = partnerProfiles.map(profile => ({
            user_id: profile.id,
            type: 'job_cancelled',
            title: 'พนักงานคู่ยกเลิกงาน',
            message: `พนักงานอีกคนในงาน Couple ยกเลิกระหว่างให้บริการ เหตุผล: ${reason} Admin ได้รับแจ้งแล้ว กรุณาทำงานของคุณต่อตามปกติ`,
            data: {
              booking_id: job.booking_id,
              job_id: jobId,
              cancellation_type: 'mid_service',
            },
            is_read: false,
          }))

          await supabase.from('notifications').insert(partnerNotifRows)
          console.log(`🔴 [MidService] Couple partner notification sent to ${partnerProfiles.length} staff`)
        }
      }
    }

    // 7d. Notify customer (in-app only, if customer booking)
    if (!job.hotel_id && job.customer_id) {
      const { data: customerProfile } = await supabase
        .from('customers')
        .select('profile_id')
        .eq('id', job.customer_id)
        .single()

      if (customerProfile?.profile_id) {
        await supabase.from('notifications').insert({
          user_id: customerProfile.profile_id,
          type: 'booking_cancelled',
          title: 'การให้บริการถูกหยุดชั่วคราว',
          message: `บริการ "${job.service_name}" ถูกหยุดระหว่างให้บริการ Admin กำลังดำเนินการติดต่อกลับ`,
          data: {
            booking_id: job.booking_id,
            booking_number: bookingNumber,
            cancellation_type: 'mid_service',
          },
          is_read: false,
        })
        console.log(`🔴 [MidService] Customer notification sent`)
      }
    }

  } else {
    // ─── PRE-SERVICE: Original flow — notify available staff + admin + hotel ───

    // 6.1 Notify available staff via LINE (filtered by provider preference)
    const { data: allAvailableStaff } = await supabase
      .from('staff')
      .select('id, profile_id, gender')
      .eq('is_available', true)
      .eq('status', 'active')

    const availableStaff = filterStaffByProviderPreference(allAvailableStaff || [], providerPreference)
    console.log(`👥 Staff filter (cancelled): preference=${providerPreference || 'no-preference'}, total=${allAvailableStaff?.length || 0}, filtered=${availableStaff.length}`)

    if (availableStaff.length > 0 && newJob) {
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
          new_job_id: newJob?.id || null,
          booking_id: job.booking_id,
          booking_number: bookingNumber,
          staff_name: staffName,
          reason,
          cancellation_type: 'pre_service',
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

    // 8. Notify hotel users if this is a hotel booking
    if (job.hotel_id) {
      try {
        const { data: hotelProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('hotel_id', job.hotel_id)
          .eq('role', 'HOTEL')

        if (hotelProfiles && hotelProfiles.length > 0) {
          const hotelNotifRows = hotelProfiles.map(profile => ({
            user_id: profile.id,
            type: 'staff_cancelled',
            title: 'พนักงานยกเลิกงาน',
            message: `พนักงาน ${staffName} ยกเลิกงาน "${job.service_name}" วันที่ ${job.scheduled_date} เวลา ${job.scheduled_time} เหตุผล: ${reason} ระบบกำลังหาพนักงานใหม่`,
            data: {
              booking_id: job.booking_id,
              job_id: jobId,
              new_job_id: newJob?.id || null,
              staff_name: staffName,
              reason,
            },
            is_read: false,
          }))

          await supabase.from('notifications').insert(hotelNotifRows)
          console.log(`[Hotel] Staff cancellation notification sent to ${hotelProfiles.length} hotel user(s)`)
        }
      } catch (hotelNotifError) {
        console.error('[Hotel] Notification error (non-blocking):', hotelNotifError)
      }
    }
  }

  result.success = true
  const newJobLog = newJob ? `new=${newJob.id}` : 'no-replacement'
  console.log(`✅ Job cancellation [${cancellationType}] processed: cancelled=${jobId}, ${newJobLog}, staff=${result.staffNotified}, admins=${result.adminsNotified}`)
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

  // 3. Get available staff (with gender for provider preference filtering)
  const { data: availableStaff } = await supabase
    .from('staff')
    .select('id, profile_id, gender')
    .eq('is_available', true)
    .eq('status', 'active')

  let staffProfiles: Array<{ id: string; line_user_id: string | null }> | null = null
  if (availableStaff && availableStaff.length > 0) {
    const staffProfileIds = availableStaff.map(s => s.profile_id).filter(Boolean)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, line_user_id')
      .in('id', staffProfileIds)
      .not('line_user_id', 'is', null)

    staffProfiles = profiles
  }

  // 4. Get admin profiles (for level 2 & 3)
  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('id, line_user_id')
    .eq('role', 'ADMIN')

  // 5. Get booking numbers and provider_preference for notifications
  const bookingIds = [...new Set(pendingJobs.map(j => j.booking_id).filter(Boolean))]
  let bookingNumberMap = new Map<string, string>()
  let providerPreferenceMap = new Map<string, string>()
  if (bookingIds.length > 0) {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, booking_number, provider_preference')
      .in('id', bookingIds)

    if (bookings) {
      bookingNumberMap = new Map(bookings.map(b => [b.id, b.booking_number]))
      providerPreferenceMap = new Map(bookings.map(b => [b.id, b.provider_preference || 'no-preference']))
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
      // Filter staff by provider preference for this job
      const jobPreference = job.booking_id ? providerPreferenceMap.get(job.booking_id) : null
      const filteredStaff = filterStaffByProviderPreference(availableStaff || [], jobPreference)
      const filteredProfileIds = new Set(filteredStaff.map(s => s.profile_id))
      const filteredLineIds = staffProfiles
        ?.filter(p => filteredProfileIds.has(p.id))
        .map(p => p.line_user_id)
        .filter(Boolean) as string[] || []

      // LINE multicast to filtered staff
      if (filteredLineIds.length > 0) {
        await lineService.sendJobEscalationToStaff(filteredLineIds, {
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

      // In-app for filtered staff
      if (filteredStaff.length > 0) {
        const staffNotifRows = filteredStaff.map(staff => ({
          user_id: staff.profile_id,
          type: 'job_no_staff',
          title: 'งานยังไม่มีคนรับ!',
          message: `งาน "${job.service_name}" วันที่ ${job.scheduled_date} รอมาแล้ว ${minutesPending} นาที${jobPreference && jobPreference !== 'no-preference' ? ` (ลูกค้าต้องการ: ${getProviderPreferenceLabelServer(jobPreference)})` : ''}`,
          data: { job_id: job.id, booking_id: job.booking_id, escalation_level: 1, provider_preference: jobPreference || 'no-preference' },
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

/**
 * Process booking cancellation by admin
 * Cancel all associated jobs and notify assigned staff via LINE + in-app
 */
export async function processBookingCancelled(
  bookingId: string,
  cancellationReason: string,
  refundStatus?: string,
  refundAmount?: number
): Promise<{
  success: boolean
  jobsCancelled: number
  staffNotified: number
  error?: string
}> {
  const supabase = getSupabaseClient()
  const result = {
    success: false,
    jobsCancelled: 0,
    staffNotified: 0,
  }

  // 1. Get booking details
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, booking_number, booking_date, booking_time, address, hotel_id')
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    console.error('❌ Booking not found for cancellation notification:', bookingId)
    return { ...result, error: 'Booking not found' }
  }

  // Get hotel name if applicable
  let hotelName: string | null = null
  if (booking.hotel_id) {
    const { data: hotel } = await supabase
      .from('hotels')
      .select('name')
      .eq('id', booking.hotel_id)
      .single()
    if (hotel) hotelName = hotel.name
  }

  // 2. Get all jobs associated with this booking that have assigned staff
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('id, staff_id, service_name, scheduled_date, scheduled_time, address, hotel_name, room_number')
    .eq('booking_id', bookingId)
    .not('staff_id', 'is', null)
    .neq('status', 'cancelled')

  if (jobsError) {
    console.error('❌ Failed to fetch jobs for booking:', jobsError)
    return { ...result, error: 'Failed to fetch jobs' }
  }

  if (!jobs || jobs.length === 0) {
    console.log(`📋 No assigned jobs found for booking ${bookingId}, no staff to notify`)
    result.success = true
    return result
  }

  // 3. Get staff profiles with LINE IDs
  // Note: jobs.staff_id IS profiles.id (profile_id), so we can query profiles directly
  const staffIds = [...new Set(jobs.map(j => j.staff_id).filter(Boolean))] as string[]

  const { data: staffProfiles } = await supabase
    .from('profiles')
    .select('id, line_user_id')
    .in('id', staffIds)

  const staffLineIds = staffProfiles?.filter(p => p.line_user_id).map(p => p.line_user_id) as string[] || []

  console.log(`📋 Staff IDs: ${staffIds.length}, LINE IDs found: ${staffLineIds.length}`)

  // 4. Send LINE notifications to assigned staff
  if (staffLineIds.length > 0) {
    // Use the first job's details for notification (they should be similar for same booking)
    const job = jobs[0]
    const success = await lineService.sendBookingCancelledToStaff(staffLineIds, {
      serviceName: job.service_name,
      scheduledDate: job.scheduled_date,
      scheduledTime: job.scheduled_time?.substring(0, 5) || '',
      address: job.address || '',
      hotelName: job.hotel_name || hotelName,
      roomNumber: job.room_number,
      cancellationReason,
      bookingNumber: booking.booking_number,
      refundStatus,
      refundAmount,
    })

    if (success) {
      result.staffNotified = staffLineIds.length
      console.log(`📱 LINE cancellation sent to ${staffLineIds.length} staff`)
    }
  }

  // 5. Create in-app notifications for assigned staff
  const staffNotifRows = staffIds.map(staffProfileId => ({
    user_id: staffProfileId,
    type: 'booking_cancelled',
    title: 'งานถูกยกเลิก',
    message: `งาน "${jobs[0].service_name}" วันที่ ${jobs[0].scheduled_date} ถูกยกเลิกโดยแอดมิน เหตุผล: ${cancellationReason}`,
    data: {
      booking_id: bookingId,
      booking_number: booking.booking_number,
      cancellation_reason: cancellationReason,
      refund_status: refundStatus,
      refund_amount: refundAmount,
    },
    is_read: false,
  }))

  if (staffNotifRows.length > 0) {
    const { error: notifError } = await supabase
      .from('notifications')
      .insert(staffNotifRows)

    if (notifError) {
      console.error('❌ Failed to insert staff cancellation notifications:', notifError)
    } else {
      console.log(`🔔 In-app cancellation notification sent to ${staffNotifRows.length} staff`)
    }
  }

  // 6. Cancel all jobs for this booking
  const { error: cancelError } = await supabase
    .from('jobs')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: 'ADMIN',
      cancellation_reason: cancellationReason,
      updated_at: new Date().toISOString(),
    })
    .eq('booking_id', bookingId)
    .neq('status', 'cancelled')

  if (cancelError) {
    console.error('❌ Failed to cancel jobs:', cancelError)
    return { ...result, error: 'Failed to cancel jobs' }
  }

  result.jobsCancelled = jobs.length
  result.success = true
  console.log(`✅ Booking cancellation processed: booking=${bookingId}, jobs=${result.jobsCancelled}, staff=${result.staffNotified}`)
  return result
}

/**
 * Send LINE + in-app notification to staff when admin completes a payout
 */
export async function sendPayoutCompletedNotification(
  payoutId: string
): Promise<{ success: boolean; lineNotified: boolean; inAppNotified: boolean; error?: string }> {
  const supabase = getSupabaseClient()
  const result = { success: false, lineNotified: false, inAppNotified: false }

  // 1. Fetch payout details
  const { data: payout, error: payoutError } = await supabase
    .from('payouts')
    .select('*')
    .eq('id', payoutId)
    .single()

  if (payoutError || !payout) {
    console.error('❌ Payout not found:', payoutId, payoutError)
    return { ...result, error: 'Payout not found' }
  }

  // payouts.staff_id IS profiles.id (FK to profiles)
  const staffProfileId = payout.staff_id

  // 2. Get staff name from staff table
  const { data: staffData } = await supabase
    .from('staff')
    .select('name_th')
    .eq('profile_id', staffProfileId)
    .single()

  const staffName = staffData?.name_th || 'พนักงาน'

  // 3. Get LINE user ID from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('line_user_id')
    .eq('id', staffProfileId)
    .single()

  // 4. Send LINE notification (if staff has LINE linked)
  if (profile?.line_user_id) {
    try {
      const lineSuccess = await lineService.sendPayoutCompletedToStaff(profile.line_user_id, {
        staffName,
        netAmount: Number(payout.net_amount) || 0,
        grossEarnings: Number(payout.gross_earnings) || 0,
        platformFee: Number(payout.platform_fee) || 0,
        totalJobs: payout.total_jobs || 0,
        periodStart: payout.period_start,
        periodEnd: payout.period_end,
        transferReference: payout.transfer_reference || '',
        transferredAt: payout.transferred_at || new Date().toISOString(),
      })

      if (lineSuccess) {
        result.lineNotified = true
        console.log(`📱 LINE payout notification sent to staff ${staffProfileId}`)
      }
    } catch (lineError) {
      console.error('❌ LINE payout notification failed:', lineError)
    }
  } else {
    console.log(`⚠️ Staff ${staffProfileId} has no LINE user ID, skipping LINE notification`)
  }

  // 5. Insert in-app notification
  const periodStartDate = new Date(payout.period_start)
  const periodEndDate = new Date(payout.period_end)
  const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
  const periodText = `${monthNames[periodStartDate.getMonth()]} ${periodStartDate.getFullYear() + 543}`

  const { error: notifError } = await supabase
    .from('notifications')
    .insert({
      user_id: staffProfileId,
      type: 'payment_received',
      title: 'ได้รับเงินเรียบร้อย!',
      message: `โอนเงิน ฿${Number(payout.net_amount).toLocaleString()} รอบ ${periodText} (${payout.total_jobs || 0} งาน) เข้าบัญชีแล้ว`,
      data: {
        payout_id: payoutId,
        net_amount: payout.net_amount,
        transfer_reference: payout.transfer_reference,
        period_start: payout.period_start,
        period_end: payout.period_end,
      },
      is_read: false,
    })

  if (notifError) {
    console.error('❌ Failed to insert payout notification:', notifError)
  } else {
    result.inAppNotified = true
    console.log(`🔔 In-app payout notification sent to staff ${staffProfileId}`)
  }

  result.success = true
  console.log(`✅ Payout notification processed: payout=${payoutId}, LINE=${result.lineNotified}, inApp=${result.inAppNotified}`)
  return result
}

// ============================================
// Credit Due Reminders (Daily Cron)
// ============================================

/**
 * Process credit due reminders for hotels
 * Runs daily at 09:00 ICT — checks which hotels have credit due within 1 day
 * Sends in-app notification + email to hotel and admin users
 */
export async function processCreditDueReminders(): Promise<number> {
  const supabase = getSupabaseClient()
  let sentCount = 0

  const now = new Date()
  const today = now.getDate()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDay = tomorrow.getDate()

  // Find hotels where credit_cycle_day = tomorrow (1-day advance warning)
  // or credit_cycle_day = today (due today)
  const { data: hotels, error: hotelsError } = await supabase
    .from('hotels')
    .select('id, name_th, name_en, email, credit_days, credit_start_date, credit_cycle_day')
    .not('credit_cycle_day', 'is', null)
    .not('credit_start_date', 'is', null)
    .in('credit_cycle_day', [today, tomorrowDay])
    .eq('status', 'active')

  if (hotelsError) {
    console.error('❌ [CreditReminder] Failed to fetch hotels:', hotelsError)
    return 0
  }

  if (!hotels || hotels.length === 0) {
    return 0
  }

  console.log(`📋 [CreditReminder] Found ${hotels.length} hotel(s) with credit due today/tomorrow`)

  // Get company settings for email
  const { data: settings } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['company_name_th', 'company_phone', 'company_email'])

  const settingsMap = Object.fromEntries((settings || []).map(s => [s.key, s.value]))
  const companyName = settingsMap.company_name_th || 'The Bliss Massage at Home'
  const companyPhone = settingsMap.company_phone || ''
  const companyEmail = settingsMap.company_email || ''

  // Get admin profiles for in-app notifications
  const { data: adminProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'ADMIN')

  for (const hotel of hotels) {
    const isDueToday = hotel.credit_cycle_day === today
    const isDueTomorrow = hotel.credit_cycle_day === tomorrowDay
    const daysRemaining = isDueToday ? 0 : 1
    const notificationType = isDueToday ? 'credit_overdue' : 'credit_due_reminder'

    // Check if we already sent this notification today
    const todayStr = now.toISOString().split('T')[0]
    const { data: existingNotif } = await supabase
      .from('hotel_credit_notifications')
      .select('id')
      .eq('hotel_id', hotel.id)
      .eq('notification_type', notificationType)
      .gte('created_at', `${todayStr}T00:00:00`)
      .limit(1)

    if (existingNotif && existingNotif.length > 0) {
      console.log(`⏭️ [CreditReminder] Already sent ${notificationType} for ${hotel.name_th} today`)
      continue
    }

    // Get pending bills for this hotel
    const { data: pendingBills } = await supabase
      .from('monthly_bills')
      .select('id, bill_number, period_start, period_end, total_amount, total_discount')
      .eq('hotel_id', hotel.id)
      .eq('status', 'pending')

    const bills = (pendingBills || []).map(b => ({
      billNumber: b.bill_number,
      periodStart: b.period_start,
      periodEnd: b.period_end,
      netAmount: (b.total_amount || 0) - (b.total_discount || 0),
    }))
    const totalOutstanding = bills.reduce((sum, b) => sum + b.netAmount, 0)

    // Calculate due date string
    const dueDate = new Date(now.getFullYear(), now.getMonth(), hotel.credit_cycle_day!)
    if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1)
    const dueDateStr = dueDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })

    // === 1. Send Email to hotel ===
    if (hotel.email) {
      try {
        const html = creditDueReminderEmailTemplate({
          hotelName: hotel.name_th || hotel.name_en || 'Hotel',
          dueDate: dueDateStr,
          daysRemaining,
          pendingBills: bills,
          totalOutstanding,
          companyName,
          companyPhone,
          companyEmail,
        })

        const emailResult = await emailService.sendEmail({
          to: hotel.email,
          subject: isDueToday
            ? `🔴 ครบกำหนดชำระวันนี้ — ${hotel.name_th}`
            : `🟡 แจ้งเตือน: ครบกำหนดชำระพรุ่งนี้ — ${hotel.name_th}`,
          html,
        })

        // Record notification
        await supabase.from('hotel_credit_notifications').insert({
          hotel_id: hotel.id,
          notification_type: notificationType,
          channel: 'email',
          status: emailResult.success ? 'sent' : 'failed',
          sent_at: emailResult.success ? new Date().toISOString() : null,
        })

        if (emailResult.success) {
          console.log(`📧 [CreditReminder] Email sent to ${hotel.email} for ${hotel.name_th}`)
        }
      } catch (err) {
        console.error(`❌ [CreditReminder] Email failed for ${hotel.name_th}:`, err)
      }
    }

    // === 2. In-app notification to hotel users ===
    // Hotel users are linked via hotels.auth_user_id (not profiles.hotel_id)
    const { data: hotelRecord } = await supabase
      .from('hotels')
      .select('auth_user_id')
      .eq('id', hotel.id)
      .single()

    const hotelProfiles = hotelRecord?.auth_user_id ? [{ id: hotelRecord.auth_user_id }] : []

    if (hotelProfiles && hotelProfiles.length > 0) {
      const hotelNotifRows = hotelProfiles.map(p => ({
        user_id: p.id,
        type: notificationType,
        title: isDueToday ? 'ครบกำหนดชำระเครดิตวันนี้' : 'แจ้งเตือน: ครบกำหนดชำระเครดิตพรุ่งนี้',
        message: isDueToday
          ? `ยอดค้างชำระ ฿${totalOutstanding.toLocaleString()} ครบกำหนดวันนี้ กรุณาชำระโดยเร็ว`
          : `ยอดค้างชำระ ฿${totalOutstanding.toLocaleString()} จะครบกำหนดพรุ่งนี้ (${dueDateStr})`,
        data: {
          hotel_id: hotel.id,
          hotel_name: hotel.name_th,
          total_outstanding: totalOutstanding,
          due_date: dueDate.toISOString(),
          bills_count: bills.length,
        },
        is_read: false,
      }))

      await supabase.from('notifications').insert(hotelNotifRows)

      // Record in-app notification
      await supabase.from('hotel_credit_notifications').insert({
        hotel_id: hotel.id,
        notification_type: notificationType,
        channel: 'in_app',
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
    }

    // === 3. In-app notification to admin users ===
    if (adminProfiles && adminProfiles.length > 0) {
      const adminNotifRows = adminProfiles.map(admin => ({
        user_id: admin.id,
        type: notificationType,
        title: isDueToday
          ? `🔴 ครบกำหนดชำระ: ${hotel.name_th}`
          : `🟡 แจ้งเตือน: ${hotel.name_th} ครบกำหนดพรุ่งนี้`,
        message: `${hotel.name_th} — ยอดค้างชำระ ฿${totalOutstanding.toLocaleString()} ${isDueToday ? 'ครบกำหนดวันนี้' : 'จะครบกำหนด ' + dueDateStr}`,
        data: {
          hotel_id: hotel.id,
          hotel_name: hotel.name_th,
          total_outstanding: totalOutstanding,
          due_date: dueDate.toISOString(),
          bills_count: bills.length,
        },
        is_read: false,
      }))

      await supabase.from('notifications').insert(adminNotifRows)
    }

    // === 4. Create Google Calendar event ===
    if (await googleCalendarService.isConfigured()) {
      try {
        const eventId = await googleCalendarService.createCreditDueEvent({
          hotelId: hotel.id,
          hotelName: hotel.name_th || hotel.name_en || 'Hotel',
          dueDate,
          totalOutstanding,
          billNumbers: bills.map(b => b.billNumber),
        })

        if (eventId) {
          await supabase.from('hotel_credit_notifications').insert({
            hotel_id: hotel.id,
            notification_type: notificationType,
            channel: 'google_calendar',
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
        }
      } catch (err) {
        console.error(`[CreditReminder] Google Calendar error for ${hotel.name_th}:`, err)
      }
    }

    sentCount++
    console.log(`✅ [CreditReminder] Processed ${hotel.name_th}: ${notificationType}, outstanding=฿${totalOutstanding}`)
  }

  return sentCount
}
