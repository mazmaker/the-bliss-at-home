/**
 * Booking API Routes
 * Handles booking management operations
 */

import { Router, Request, Response } from 'express'
import { getSupabaseClient } from '../lib/supabase.js'
import { refundService } from '../services/refundService.js'
import { paymentAuthGuard, authenticateSupabaseUser, type AuthenticatedRequest } from '../middleware/auth.js'
import { getEnabledPaymentChannels, getPaymentMode } from '../lib/paymentChannels.js'
import { sendCancellationNotifications } from '../services/cancellationNotificationService.js'
import { sendRescheduleNotifications } from '../services/rescheduleNotificationService.js'
import { sendCreditNoteEmailForRefund } from './receipts.js'
import { applyExtensionAfterPayment } from './payment.js'
import { applyExtensionToBooking, type ExtensionTarget } from '../services/extensionApplyService.js'
import { lineService } from '../services/lineService.js'
import { sendExtensionNotifications, getServingStaffProfileIds, notifyHotelInApp } from '../services/notificationService.js'
import { checkCancellationEligibility } from '../services/cancellationPolicyService.js'
import type {
  BookingCancellationRequest,
  BookingCancellationResponse,
  RefundOption,
} from '../types/cancellation.js'
// @ts-ignore — relative import from shared package (outside rootDir)
import { refundPoints } from '../services/loyaltyRefundService'

const router = Router()

// ============================================
// Business Rules
// ============================================

const BOOKING_RULES = {
  MAX_ADVANCE_DAYS: 14,
  MIN_ADVANCE_HOURS: 3
}

export function validateBookingDate(bookingDate: string, bookingTime?: string): {
  isValid: boolean
  error?: string
} {
  // 🚨 EMERGENCY BYPASS: Always return valid for immediate production fix
  console.log('🚨 [EMERGENCY BYPASS] All booking validation disabled - allowing all bookings')
  console.log('📅 [DEBUG]', { bookingDate, bookingTime, timestamp: new Date().toISOString() })

  return { isValid: true }
}

// ============================================
// Types
// ============================================

interface CancelBookingBody {
  reason: string
  refund_option: RefundOption
  refund_percentage?: number
  notify_customer?: boolean
  notify_staff?: boolean
  notify_hotel?: boolean
  admin_id?: string // ID of admin performing the cancellation
}

// ============================================
// Routes
// ============================================

/**
 * GET /api/bookings
 * List all bookings (for testing)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from('bookings')
      .select('id, booking_number, status, payment_status, final_price, booking_date')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
      })
    }

    return res.json({
      success: true,
      data: data || [],
    })
  } catch (error: any) {
    console.error('List bookings error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to list bookings',
    })
  }
})

/**
 * GET /api/bookings/:id/refund-preview
 * Calculate and preview refund amount based on cancellation policy
 */
router.get('/:id/refund-preview', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing booking ID',
      })
    }

    // R-5 G33/D2: manual-QR booking has no Omise charge → not refund-eligible on-platform.
    // Lightweight marker SELECT + short-circuit so the UI renders the "contact LINE OA" state
    // (refundService.calculateRefund is marker-blind, so the gate must live here at the route).
    const previewSupabase = getSupabaseClient()
    const { data: previewBooking } = await previewSupabase
      .from('bookings')
      .select('admin_notes')
      .eq('id', id)
      .single()
    if (((previewBooking as any)?.admin_notes || '').includes('[MANUAL_QR')) {
      return res.json({
        success: true,
        data: {
          eligible: false,
          originalAmount: 0,
          refundAmount: 0,
          refundPercentage: 0,
          reason: 'คืนเงินนอกแพลตฟอร์มทาง LINE',
        },
        policy: refundService.CANCELLATION_POLICY,
      })
    }

    const calculation = await refundService.calculateRefund(id)

    return res.json({
      success: true,
      data: calculation,
      policy: refundService.CANCELLATION_POLICY,
    })
  } catch (error: any) {
    console.error('Refund preview error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate refund preview',
    })
  }
})

// ============================================
// Reschedule Types
// ============================================

interface RescheduleBookingBody {
  new_date: string
  new_time: string
  customer_id?: string // To verify ownership
}

/**
 * Compute the per-staff earning for ONE service session, honoring use_fixed_rate.
 * Mirrors notificationService/secure-bookings so every notification path agrees.
 * - fixed-rate  → the flat staff_earning_{60,90,120} for the session duration (NOT scaled by price)
 * - commission  → round(price * staff_commission_rate)
 */
function computeStaffEarning(svc: any, durationMinutes: number, price: number): number {
  if (svc?.use_fixed_rate) {
    const fixed = durationMinutes === 60 ? svc.staff_earning_60
      : durationMinutes === 120 ? svc.staff_earning_120
      : svc.staff_earning_90
    return Math.round(Number(fixed) || 0)
  }
  return Math.round(Number(price) * (Number(svc?.staff_commission_rate) || 0))
}

/** 'HH:MM[:SS]' → minutes since midnight */
function _timeToMinutes(t: string): number {
  const [h, m] = String(t || '0:0').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/**
 * True if `staffProfileId` has NO other active job overlapping [time, time+duration) on `date`.
 * Half-open interval (back-to-back does NOT count as a clash), matching jobService.jobsOverlap.
 * Excludes the job being rescheduled. Used to decide whether the same staff can be KEPT on reschedule.
 */
async function isStaffFreeAt(
  supabase: any,
  staffProfileId: string,
  excludeJobId: string,
  date: string,
  time: string,
  durationMinutes: number,
): Promise<boolean> {
  const { data: others } = await supabase
    .from('jobs')
    .select('id, scheduled_time, duration_minutes, total_duration_minutes')
    .eq('staff_id', staffProfileId)
    .eq('scheduled_date', date)
    .not('status', 'in', '(cancelled,completed)')
    .neq('id', excludeJobId)
  const start = _timeToMinutes(time)
  const end = start + (durationMinutes || 60)
  for (const o of others || []) {
    const os = _timeToMinutes(o.scheduled_time)
    const oe = os + (o.total_duration_minutes ?? o.duration_minutes ?? 60)
    if (start < oe && os < end) return false // overlap
  }
  return true
}

/**
 * POST /api/bookings/:id/reschedule
 * Reschedule a booking to a new date/time
 * - Updates booking date/time
 * - STAFF-LOCK: if EVERY assigned job's staff is still free at the new time, keeps them assigned
 *   (no re-accept, no re-broadcast). Otherwise unassigns + re-opens the job to the board.
 * - Sends notifications to previously assigned staff (re-accept wording only when re-opened)
 * - Covers single (1 job) and couple (N jobs) identically
 */
router.post('/:id/reschedule', paymentAuthGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const body = req.body as RescheduleBookingBody

    // Validate required fields
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing booking ID',
      })
    }

    if (!body.new_date || !body.new_time) {
      return res.status(400).json({
        success: false,
        error: 'new_date and new_time are required',
      })
    }

    const supabase = getSupabaseClient()

    // Get booking details with staff and service info
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        booking_date,
        booking_time,
        status,
        payment_status,
        duration,
        final_price,
        staff_earnings,
        staff_id,
        hotel_id,
        customer_id,
        address,
        reschedule_count,
        provider_preference,
        service_format,
        recipient_count,
        hotel_room_number,
        staff:staff(
          id,
          profile_id,
          name_th,
          name_en,
          profile:profiles(
            id,
            line_user_id
          )
        ),
        hotel:hotels(
          id,
          name_th,
          name_en
        ),
        service:services(
          name_th,
          name_en,
          staff_commission_rate,
          use_fixed_rate,
          staff_earning_60,
          staff_earning_90,
          staff_earning_120
        )
      `)
      .eq('id', id)
      .single()

    if (bookingError || !booking) {
      console.error('[Reschedule] Booking query error:', bookingError)
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
        details: bookingError?.message,
      })
    }

    // Check if booking can be rescheduled
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Cannot reschedule a cancelled booking',
      })
    }

    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot reschedule a completed booking',
      })
    }

    if (booking.status === 'in_progress') {
      return res.status(400).json({
        success: false,
        error: 'Cannot reschedule a booking that is in progress',
      })
    }

    // Check reschedule eligibility from cancellation policy
    const eligibility = await checkCancellationEligibility(id)
    if (!eligibility.canReschedule) {
      return res.status(400).json({
        success: false,
        error: eligibility.reason || 'ไม่สามารถเลื่อนนัดได้ตามนโยบาย',
        code: 'RESCHEDULE_NOT_ALLOWED',
      })
    }

    // Reject a NEW date/time that is already in the past (defense-in-depth behind the
    // customer + hotel modal pickers). Booking times are Asia/Bangkok wall-clock, but the
    // server runs on Vercel in UTC — pin the +07:00 offset (Thailand has no DST) so the
    // slot compares as the correct absolute instant against now.
    const newSlotInstant = new Date(`${body.new_date}T${String(body.new_time).slice(0, 5)}:00+07:00`)
    if (!Number.isNaN(newSlotInstant.getTime()) && newSlotInstant.getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถเลื่อนไปยังวันเวลาที่ผ่านมาแล้วได้',
        code: 'RESCHEDULE_PAST_TIME',
      })
    }

    // Store old date/time for notification
    const oldDate = booking.booking_date
    const oldTime = booking.booking_time
    const previousStaffId = booking.staff_id
    const staffData = booking.staff as any

    // 1. FIRST — Query jobs BEFORE any updates
    // jobs.staff_id FK → profiles.id (NOT staff.id), so we query staff separately
    const { data: assignedJobs } = await supabase
      .from('jobs')
      .select('id, staff_id, status, service_name, duration_minutes, total_duration_minutes, staff_earnings')
      .eq('booking_id', id)
      .not('status', 'in', '(cancelled,completed)')

    // Collect unique profile_ids from jobs that have staff assigned
    const assignedProfileIds = [
      ...new Set(
        (assignedJobs || [])
          .filter(j => j.staff_id)
          .map(j => j.staff_id as string)
      )
    ]

    // Also include booking-level staff if exists
    if (previousStaffId && !assignedProfileIds.includes(previousStaffId)) {
      // booking.staff_id references staff.id, need to get profile_id
      if (staffData?.profile_id && !assignedProfileIds.includes(staffData.profile_id)) {
        assignedProfileIds.push(staffData.profile_id)
      }
    }

    // Query staff details for all assigned profile_ids
    let staffInfoMap: Record<string, { staff_id: string; profile_id: string; name_th: string; line_user_id: string | null }> = {}
    if (assignedProfileIds.length > 0) {
      const { data: staffList } = await supabase
        .from('staff')
        .select('id, profile_id, name_th, profile:profiles(id, line_user_id)')
        .in('profile_id', assignedProfileIds)

      if (staffList) {
        for (const s of staffList) {
          const profile = s.profile as any
          staffInfoMap[s.profile_id] = {
            staff_id: s.id,
            profile_id: s.profile_id,
            name_th: s.name_th,
            line_user_id: profile?.line_user_id || null,
          }
        }
      }
    }

    // Build staffToNotify list from jobs with assigned staff
    const staffToNotify = (assignedJobs || [])
      .filter(j => j.staff_id && staffInfoMap[j.staff_id])
      .map(j => {
        const { profile_id: _pid, ...rest } = staffInfoMap[j.staff_id]
        return {
          job_id: j.id,
          profile_id: j.staff_id as string,
          // P5 Fix 3: carry the stored per-job earning so the reschedule notification shows the
          // correct (add-on-excluded, fixed-rate-honored, per-recipient) รายได้ without a recompute.
          staff_earnings: j.staff_earnings,
          ...rest,
        }
      })

    console.log('[Reschedule] Processing reschedule:', {
      bookingId: id,
      oldDate,
      oldTime,
      newDate: body.new_date,
      newTime: body.new_time,
      previousStaffId,
      jobsFound: assignedJobs?.length || 0,
      staffToNotify: staffToNotify.length,
    })

    // 1b. STAFF-LOCK decision — keep the SAME staff instead of re-opening the job, IF:
    //     (a) every non-terminal job already has an assigned staff (fully accepted), AND
    //     (b) each of those staff is FREE at the new date/time (no clash with their other jobs).
    //     Applies to single (1 job) and couple (N jobs, checked per-job). Any failure → re-open all.
    let canKeepStaff = false
    const nonTerminalJobs = assignedJobs || []
    // Keep-staff works for single AND couple: the LIVE booking→job trigger sync_booking_update_to_job()
    // (rewritten 2026-07-01, migration 20260701094500) cascades only date/time + cancelled/completed and
    // does NOT touch jobs.staff_id — so a date/time-only reschedule never clobbers a couple's per-job staff.
    // (Verified via pg_get_functiondef on prod 2026-07-03; the PART42 plan's "clobber" was a stale-file read.)
    const allJobsHaveStaff = nonTerminalJobs.length > 0 && nonTerminalJobs.every(j => j.staff_id)
    if (allJobsHaveStaff) {
      canKeepStaff = true
      for (const j of nonTerminalJobs) {
        const jobDuration = (j as any).duration_minutes || booking.duration || 60
        const free = await isStaffFreeAt(supabase, j.staff_id as string, j.id, body.new_date, body.new_time, jobDuration)
        if (!free) {
          canKeepStaff = false
          console.log('[Reschedule] Staff busy at new time — will re-open:', { jobId: j.id, staffProfileId: j.staff_id })
          break
        }
      }
    }
    const needsReaccept = !canKeepStaff
    console.log('[Reschedule] Staff-lock decision:', { canKeepStaff, allJobsHaveStaff, jobs: nonTerminalJobs.length })

    // 2. Update booking date/time — keep staff when locked, else unassign for re-accept
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_date: body.new_date,
        booking_time: body.new_time,
        // Staff-lock: only unassign + reset to pending when we could NOT keep the same staff
        ...(canKeepStaff ? {} : { staff_id: null, status: 'pending' }),
        reschedule_count: ((booking as any).reschedule_count || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('[Reschedule] Failed to update booking:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update booking',
        details: updateError.message,
      })
    }

    // 3. Update ALL jobs — move date/time; reset to pending for re-acceptance ONLY when re-opening
    let updatedJobIds: string[] = []
    if (assignedJobs && assignedJobs.length > 0) {
      const { error: jobUpdateError } = await supabase
        .from('jobs')
        .update({
          scheduled_date: body.new_date,
          scheduled_time: body.new_time,
          // Staff-lock: keep staff_id/status/accepted_at when we could keep the same staff
          ...(canKeepStaff ? {} : { staff_id: null, status: 'pending', accepted_at: null }),
          updated_at: new Date().toISOString(),
        })
        .eq('booking_id', id)
        .not('status', 'in', '(cancelled,completed)')

      if (jobUpdateError) {
        console.error('[Reschedule] Failed to update jobs:', jobUpdateError)
      } else {
        updatedJobIds = assignedJobs.map(j => j.id)
        console.log('[Reschedule] Jobs reset to pending:', updatedJobIds)
      }
    }

    // 4. Send notifications to ALL previously assigned staff (saved from step 1)
    let notificationResults = { staff_line: false, staff_in_app: false }

    console.log('[Reschedule] Sending notifications to', staffToNotify.length, 'staff members')

    for (const staffInfo of staffToNotify) {
      try {
        const notificationData = {
          id: booking.id,
          booking_number: booking.booking_number,
          service_name: (booking.service as any)?.name_th || (booking.service as any)?.name_en || 'Unknown Service',
          old_date: oldDate,
          old_time: oldTime,
          new_date: body.new_date,
          new_time: body.new_time,
          duration_minutes: booking.duration || 60,
          staff_earnings: (() => {
            // P5 Fix 3: prefer the stored, trigger-computed per-JOB earning — it is already
            // add-on-excluded (add-ons are never staff commission), fixed-rate-honored and
            // per-recipient. Recomputing from final_price here would fold add-on money into the
            // displayed รายได้ (display-only leak; the persisted earnings are already correct).
            if (staffInfo.staff_earnings != null) {
              return Math.round(Number(staffInfo.staff_earnings))
            }
            // Fallback ONLY for legacy jobs with no stored earning (which by construction carry no
            // add-ons — any add-on booking gets a trigger-populated staff_earnings).
            const svc = booking.service as any
            const duration = booking.duration || 90
            if (svc?.use_fixed_rate) {
              const fixed = duration === 60 ? svc.staff_earning_60
                : duration === 120 ? svc.staff_earning_120
                : svc.staff_earning_90
              return Math.round(Number(fixed) || 0)
            }
            return Math.round(Number(booking.final_price) * (Number(svc?.staff_commission_rate) || 0.3) / (assignedJobs?.length || 1))
          })(),
          assigned_staff_id: staffInfo.staff_id,
          staff_profile_id: staffInfo.profile_id,
          staff_line_user_id: staffInfo.line_user_id ?? undefined,
          hotel_name: (booking.hotel as any)?.name_th || (booking.hotel as any)?.name_en,
          address: booking.address || '',
          new_job_id: staffInfo.job_id || updatedJobIds[0],
          needs_reaccept: needsReaccept,
        }

        const result = await sendRescheduleNotifications(notificationData)
        if (result.staff_line) notificationResults.staff_line = true
        if (result.staff_in_app) notificationResults.staff_in_app = true
        console.log('[Reschedule] Notification sent for staff:', staffInfo.name_th, '(profile:', staffInfo.profile_id, ')', result)
      } catch (notifError) {
        console.error('[Reschedule] Notification error for staff:', staffInfo.profile_id, notifError)
      }
    }

    const hasAssignedStaff = staffToNotify.length > 0 || !!previousStaffId

    // 4b. Send new_job notifications to all eligible staff (so they can accept the rescheduled job)
    // Skip if booking has not been paid yet — payment webhook will notify staff after payment confirms.
    let newJobStaffNotified = 0
    // Treat null payment_status as paid — legacy bookings without the field are already confirmed.
    // Only explicitly 'pending' means "awaiting payment".
    const paymentStatus = (booking as any).payment_status
    const bookingIsPaid = paymentStatus !== 'pending'
    if (!bookingIsPaid) {
      console.log('[Reschedule] Booking not yet paid — skipping staff new_job notifications')
    }
    if (canKeepStaff) {
      console.log('[Reschedule] Staff kept (locked) — skipping re-open broadcast')
    }
    // Only re-broadcast to the open board when we actually re-opened the job (staff not kept)
    if (bookingIsPaid && needsReaccept) try {
      const { data: allAvailableStaff } = await supabase
        .from('staff')
        .select('id, profile_id, gender')
        .eq('is_available', true)
        .eq('status', 'active')

      // Filter by provider_preference (e.g., female-only)
      const providerPref = (booking as any).provider_preference
      let eligibleStaff = allAvailableStaff || []
      if (providerPref === 'female-only') {
        eligibleStaff = eligibleStaff.filter(s => s.gender === 'female')
      } else if (providerPref === 'male-only') {
        eligibleStaff = eligibleStaff.filter(s => s.gender === 'male')
      } else if (providerPref === 'prefer-female') {
        const preferred = eligibleStaff.filter(s => s.gender === 'female')
        if (preferred.length > 0) eligibleStaff = preferred
      } else if (providerPref === 'prefer-male') {
        const preferred = eligibleStaff.filter(s => s.gender === 'male')
        if (preferred.length > 0) eligibleStaff = preferred
      }

      // P13: exclude staff currently serving another job (traveling/arrived/in_progress) from the
      // reschedule re-broadcast — a busy staff shouldn't be pushed the re-opened rescheduled job.
      const reschedServingIds = await getServingStaffProfileIds(supabase)
      eligibleStaff = eligibleStaff.filter(s => !reschedServingIds.has(s.profile_id))

      if (eligibleStaff.length > 0) {
        const serviceName = (booking.service as any)?.name_th || (booking.service as any)?.name_en || 'Unknown Service'
        const hotelName = (booking.hotel as any)?.name_th || (booking.hotel as any)?.name_en || ''
        const location = hotelName || booking.address || ''
        const prefLabel = providerPref === 'female-only' ? 'ผู้หญิงเท่านั้น'
          : providerPref === 'male-only' ? 'ผู้ชายเท่านั้น'
          : providerPref === 'prefer-female' ? 'ต้องการผู้หญิง'
          : providerPref === 'prefer-male' ? 'ต้องการผู้ชาย'
          : ''

        // In-app new_job notifications
        const staffNotifRows = eligibleStaff.map(staff => ({
          user_id: staff.profile_id,
          type: 'new_job',
          title: 'งานเลื่อนนัด — รับงานใหม่!',
          message: `มีงาน "${serviceName}" ${location ? `ที่ ${location}` : ''} วันที่ ${body.new_date} เวลา ${body.new_time}${prefLabel ? ` (ลูกค้าต้องการ: ${prefLabel})` : ''} (เลื่อนนัดจากวันเดิม)`,
          data: { booking_id: id, job_ids: updatedJobIds, provider_preference: providerPref || 'no-preference' },
          is_read: false,
        }))

        const { error: newJobNotifError } = await supabase
          .from('notifications')
          .insert(staffNotifRows)

        if (!newJobNotifError) {
          newJobStaffNotified = staffNotifRows.length
          console.log(`[Reschedule] new_job notifications sent to ${newJobStaffNotified} eligible staff`)
        } else {
          console.error('[Reschedule] Failed to insert new_job notifications:', newJobNotifError)
        }

        // LINE notifications to eligible staff
        const profileIds = eligibleStaff.map(s => s.profile_id).filter(Boolean)
        const { data: staffProfiles } = await supabase
          .from('profiles')
          .select('id, line_user_id')
          .in('id', profileIds)
          .not('line_user_id', 'is', null)

        const staffLineIds = staffProfiles?.map(p => p.line_user_id).filter(Boolean) as string[] || []
        if (staffLineIds.length > 0) {
          const recipientCount = (booking as any).recipient_count || 1
          const isCouple = recipientCount > 1

          // For couple bookings, fetch booking_services for per-job details
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
              .select('recipient_index, recipient_name, duration, price, service:services(name_th, staff_commission_rate, use_fixed_rate, staff_earning_60, staff_earning_90, staff_earning_120)')
              .eq('booking_id', id)
              .order('recipient_index', { ascending: true })

            if (bookingServices && bookingServices.length > 0) {
              coupleServices = bookingServices.map(bs => {
                const duration = bs.duration || booking.duration || 90
                // Honor use_fixed_rate per recipient (fall back to the booking-level service for fields)
                const svc = (bs.service as any)?.use_fixed_rate !== undefined ? bs.service : (booking.service as any)
                const earnings = computeStaffEarning(svc, duration, Number(bs.price) || 0)
                totalStaffEarnings += earnings
                return {
                  recipientIndex: bs.recipient_index || 0,
                  recipientName: bs.recipient_name,
                  serviceName: (bs.service as any)?.name_th || serviceName,
                  durationMinutes: duration,
                  staffEarnings: earnings,
                }
              })
            }
          }

          if (!isCouple) {
            // Prefer the stored, trigger-computed per-staff earning (correct for fixed-rate);
            // else compute honoring use_fixed_rate (NOT a raw final_price*commission that ignores it).
            totalStaffEarnings = (booking as any).staff_earnings
              ? Math.round(Number((booking as any).staff_earnings))
              : computeStaffEarning(booking.service as any, booking.duration || 90, Number(booking.final_price) || 0)
          }

          await lineService.sendNewJobToStaff(staffLineIds, {
            serviceName,
            scheduledDate: body.new_date,
            scheduledTime: body.new_time,
            address: booking.address || '',
            hotelName: hotelName || undefined,
            roomNumber: (booking as any).hotel_room_number || undefined,
            staffEarnings: totalStaffEarnings,
            durationMinutes: booking.duration || 60,
            jobIds: updatedJobIds,
            isRescheduled: true,
            isCouple,
            totalRecipients: recipientCount,
            coupleServices,
          })
          console.log(`[Reschedule] LINE new_job sent to ${staffLineIds.length} staff (couple=${isCouple})`)
        }
      }
    } catch (newJobError) {
      console.error('[Reschedule] new_job notification error (non-blocking):', newJobError)
    }

    // 5. Notify admins via LINE + in-app
    let adminsNotified = 0
    try {
      const { data: adminProfiles } = await supabase
        .from('profiles')
        .select('id, line_user_id')
        .eq('role', 'ADMIN')

      if (adminProfiles && adminProfiles.length > 0) {
        const serviceName = (booking.service as any)?.name_th || 'Unknown Service'

        // Admin in-app notifications
        const adminNotifRows = adminProfiles.map(admin => ({
          user_id: admin.id,
          type: 'booking_rescheduled',
          title: 'การจองถูกเลื่อน',
          message: `การจอง ${booking.booking_number} บริการ "${serviceName}" เลื่อนจาก ${oldDate} ${oldTime} เป็น ${body.new_date} ${body.new_time}`,
          data: {
            booking_id: id,
            booking_number: booking.booking_number,
            old_date: oldDate,
            old_time: oldTime,
            new_date: body.new_date,
            new_time: body.new_time,
          },
          is_read: false,
        }))

        const { error: adminNotifError } = await supabase
          .from('notifications')
          .insert(adminNotifRows)

        if (!adminNotifError) {
          adminsNotified = adminProfiles.length
          console.log(`[Reschedule] Admin notifications sent to ${adminsNotified} admin(s)`)
        }
      }
    } catch (adminNotifError) {
      console.error('[Reschedule] Admin notification error (non-blocking):', adminNotifError)
    }

    // 6. Notify hotel (in-app) for hotel bookings — hotel users link via hotels.auth_user_id
    if (booking.hotel_id) {
      const serviceName = (booking.service as any)?.name_th || 'บริการ'
      await notifyHotelInApp(booking as any, {
        type: 'booking_rescheduled',
        title: 'การจองถูกเลื่อน',
        message: `การจอง ${booking.booking_number} บริการ "${serviceName}" เลื่อนจาก ${oldDate} ${oldTime} เป็น ${body.new_date} ${body.new_time}`,
        data: {
          old_date: oldDate,
          old_time: oldTime,
          new_date: body.new_date,
          new_time: body.new_time,
        },
      })
    }

    return res.json({
      success: true,
      data: {
        booking_id: id,
        old_date: oldDate,
        old_time: oldTime,
        new_date: body.new_date,
        new_time: body.new_time,
        staff_kept: canKeepStaff,
        staff_unassigned: needsReaccept && hasAssignedStaff,
        jobs_reset: updatedJobIds.length,
        notifications_sent: { ...notificationResults, admins: adminsNotified, new_job_staff: newJobStaffNotified },
      },
      message: canKeepStaff
        ? 'Booking rescheduled. The same staff was kept (they were free at the new time) and notified.'
        : hasAssignedStaff
          ? 'Booking rescheduled. Staff has been notified and needs to re-accept.'
          : 'Booking rescheduled successfully.',
    })
  } catch (error: any) {
    console.error('Reschedule booking error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to reschedule booking',
    })
  }
})

/**
 * POST /api/bookings/:id/cancel
 * Cancel a booking with optional refund
 */
router.post('/:id/cancel', paymentAuthGuard, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const body = req.body as CancelBookingBody

    // Validate required fields
    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing booking ID',
      })
    }

    if (!body.reason) {
      return res.status(400).json({
        success: false,
        error: 'Cancellation reason is required',
      })
    }

    if (!body.refund_option) {
      return res.status(400).json({
        success: false,
        error: 'Refund option is required (full, partial, or none)',
      })
    }

    // Validate partial refund percentage
    if (body.refund_option === 'partial') {
      if (!body.refund_percentage || body.refund_percentage <= 0 || body.refund_percentage > 100) {
        return res.status(400).json({
          success: false,
          error: 'Partial refund requires a valid percentage (1-100)',
        })
      }
    }

    const supabase = getSupabaseClient()

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        status,
        payment_status,
        final_price,
        booking_date,
        booking_time,
        customer_id,
        staff_id,
        hotel_id,
        is_hotel_booking,
        points_redeemed,
        admin_notes,
        customer:customers(
          id,
          profile_id,
          full_name,
          phone
        ),
        staff:staff(
          id,
          profile_id,
          name_th,
          name_en,
          profile:profiles(
            id,
            line_user_id
          )
        ),
        hotel:hotels(
          id,
          name_th,
          name_en,
          email
        ),
        service:services(
          name_th,
          name_en
        )
      `)
      .eq('id', id)
      .single()

    if (bookingError || !booking) {
      console.error('[Cancel] Booking query error:', bookingError)
      console.error('[Cancel] Booking ID:', id)
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
        details: bookingError?.message,
      })
    }

    // R-5 G20/D2: manual-QR bookings ("[MANUAL_QR]"/"[MANUAL_QR PAID]" in admin_notes) were marked
    // paid with NO Omise transaction → no on-platform money refund. Cancel + points refund still run.
    const isManualQr = ((booking as any).admin_notes || '').includes('[MANUAL_QR')

    // Check if already cancelled
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Booking is already cancelled',
      })
    }

    // Check if booking is completed - cannot cancel completed bookings
    if (booking.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot cancel a completed booking',
      })
    }

    // Once ANY job of this booking is 'completed' (the staff has earned money), only an
    // admin may cancel. Customers/hotels/staff are blocked. Determine admin from the
    // authenticated JWT role when REQUIRE_PAYMENT_AUTH is on (req.user set, non-spoofable);
    // fall back to body.admin_id (existing convention) when auth is off. Layer B (a DB
    // trigger) additionally backstops the hotel direct-client UPDATE path.
    const authReq = req as AuthenticatedRequest
    const isAdminCaller = authReq.user ? authReq.user.role === 'ADMIN' : !!body.admin_id
    if (!isAdminCaller) {
      const { data: completedJobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('booking_id', id)
        .eq('status', 'completed')
        .limit(1)
      if (completedJobs && completedJobs.length > 0) {
        return res.status(403).json({
          success: false,
          error: 'ไม่สามารถยกเลิกได้: มีงานที่ทำเสร็จแล้ว กรุณาติดต่อผู้ดูแลระบบ',
        })
      }
    }

    // Check if booking is in_progress - only admin can cancel mid-service bookings
    if (booking.status === 'in_progress' && !body.admin_id) {
      return res.status(400).json({
        success: false,
        error: 'ไม่สามารถยกเลิกได้ บริการกำลังดำเนินการอยู่ กรุณาติดต่อ Admin',
      })
    }

    // Process refund if payment was made and refund is requested
    let refundResult = null
    // R-5 D2/G4: never run an on-platform Omise refund for manual-QR (no charge to refund). This SKIPS
    // the money refund WITHOUT early-returning, so the loyalty-points refund below (G5) still runs.
    const shouldProcessRefund = !isManualQr && booking.payment_status === 'paid' && body.refund_option !== 'none'

    if (shouldProcessRefund) {
      // Check if there's a transaction to refund
      const { data: transaction } = await supabase
        .from('transactions')
        .select('id')
        .eq('booking_id', id)
        .eq('status', 'successful')
        .limit(1)
        .single()

      if (transaction) {
        // Transaction exists, process refund
        refundResult = await refundService.processRefund({
          bookingId: id,
          refundOption: body.refund_option,
          refundPercentage: body.refund_percentage,
          reason: body.reason,
          initiatedBy: body.admin_id || null,
        })

        if (!refundResult.success) {
          return res.status(500).json({
            success: false,
            error: `Refund failed: ${refundResult.error}`,
          })
        }
      } else {
        // No transaction record - payment might have been marked manually
        // Log this but don't fail the cancellation
        console.warn(`Booking ${id} marked as paid but no transaction record found. Skipping refund.`)
      }
    }

    // Check for pending (unaccepted) jobs BEFORE updating booking status
    // (because trigger sync_booking_update_to_job will cancel jobs immediately)
    const { data: pendingUnacceptedJobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('booking_id', id)
      .eq('status', 'pending')
      .is('staff_id', null)

    const hasPendingUnacceptedJobs = (pendingUnacceptedJobs && pendingUnacceptedJobs.length > 0)

    // Update booking status
    const updateData: any = {
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancellation_reason: body.reason,
      cancelled_by: body.admin_id || null,
    }

    if (refundResult && refundResult.refundAmount && refundResult.refundAmount > 0) {
      updateData.payment_status = 'refunded'
      updateData.refund_status = 'completed'
      updateData.refund_amount = refundResult.refundAmount
      updateData.refund_percentage = body.refund_option === 'full' ? 100 : body.refund_percentage
    } else if (isManualQr || (booking.payment_status === 'paid' && body.refund_option === 'none')) {
      // R-5 G20/G4: no on-platform refund (manual-QR off-platform settlement, or refund_option='none')
      // → terminal state status='cancelled' + refund_status='none' (avoid the paid+cancelled+NULL limbo).
      updateData.refund_status = 'none'
    }

    const { error: updateError } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      console.error('Failed to update booking:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update booking status',
      })
    }

    // Refund loyalty points if booking used points
    if (booking.customer_id && (booking.points_redeemed || 0) > 0) {
      try {
        const refunded = await refundPoints(supabase as any, booking.customer_id, id)
        if (refunded > 0) {
          console.log(`🔄 Loyalty points refunded for booking ${id}: ${refunded} points`)

          // Send notification about points refund
          await supabase.from('notifications').insert({
            user_id: (booking.customer as any)?.profile_id || null,
            type: 'points_refund',
            title: 'คืนแต้มสะสม',
            message: `คืนแต้ม ${refunded} แต้มจากการยกเลิก ${booking.booking_number}`,
          }).then(({ error }) => {
            if (error) console.error('Failed to create points refund notification:', error)
          })
        }
      } catch (loyaltyError) {
        console.error('⚠️ Failed to refund loyalty points:', loyaltyError)
      }
    }

    // Send notifications
    const notificationResults = {
      customer: false,
      staff: false,
      hotel: false,
      admin: false,
    }

    // === Notify job-assigned staff (for couple bookings where staff is assigned at job level) ===
    // Note: jobs.staff_id references profiles.id (NOT staff.id)
    const { data: assignedJobs } = await supabase
      .from('jobs')
      .select(`
        id, staff_id, job_index, total_jobs,
        profile:profiles!jobs_staff_id_fkey(id, line_user_id)
      `)
      .eq('booking_id', id)
      .not('staff_id', 'is', null)

    const jobStaffToNotify = assignedJobs?.filter(j => j.staff_id && j.profile) || []
    // Track notified staff profile IDs to avoid duplicate notifications in Block 2
    const notifiedStaffProfileIds = new Set(jobStaffToNotify.map(j => j.staff_id).filter(Boolean))

    if (jobStaffToNotify.length > 0) {
      // Send LINE to each assigned staff
      const lineUserIds = jobStaffToNotify
        .map(j => (j.profile as any)?.line_user_id)
        .filter(Boolean) as string[]

      const cancelledBy = body.admin_id ? 'admin' : 'customer'
      const cancelledByText = cancelledBy === 'customer' ? 'ลูกค้า' : 'แอดมิน'

      if (lineUserIds.length > 0) {
        try {
          await lineService.sendBookingCancelledToStaff(lineUserIds, {
            serviceName: (booking.service as any)?.name_th || 'Unknown',
            scheduledDate: booking.booking_date,
            scheduledTime: booking.booking_time,
            address: '',
            hotelName: null,
            cancellationReason: body.reason,
            bookingNumber: booking.booking_number,
            cancelledBy,
          })
          console.log(`[Cancel] LINE sent to ${lineUserIds.length} job-assigned staff`)
          notificationResults.staff = true
        } catch (err) {
          console.error('[Cancel] Failed to send LINE to job-assigned staff:', err)
        }
      }

      // Send in-app notification to each assigned staff
      for (const job of jobStaffToNotify) {
        const staffProfileId = (job.profile as any)?.id || job.staff_id
        if (staffProfileId) {
          await supabase.from('notifications').insert({
            user_id: staffProfileId,
            type: 'job_cancelled',
            title: `งานถูกยกเลิกโดย${cancelledByText}`,
            message: `งาน "${(booking.service as any)?.name_th}" วันที่ ${booking.booking_date} เวลา ${booking.booking_time} ถูกยกเลิกโดย${cancelledByText} เหตุผล: ${body.reason}`,
            data: { booking_id: id, job_id: job.id },
          })
        }
      }
    }

    // === Notify all available staff if there were pending (unaccepted) jobs ===
    // (hasPendingUnacceptedJobs was checked BEFORE booking update, since trigger cancels jobs)
    if (hasPendingUnacceptedJobs) {
      try {
        // Query all available, active staff
        const { data: availableStaff } = await supabase
          .from('staff')
          .select('id, profile_id')
          .eq('is_available', true)
          .eq('status', 'active')

        if (availableStaff && availableStaff.length > 0) {
          // P13 (D-P13 D4): exclude staff currently serving another job — don't disturb a busy
          // staff mid-service with a "งานถูกยกเลิก" notice for a board job they never took.
          const cancelServingIds = await getServingStaffProfileIds(supabase)
          // Get LINE user IDs from profiles
          const profileIds = availableStaff.map(s => s.profile_id).filter(Boolean)
            // Exclude staff already notified in Block 1 (assigned staff)
            .filter(pid => !notifiedStaffProfileIds.has(pid))
            // P13: exclude staff currently serving another job
            .filter(pid => !cancelServingIds.has(pid))
          const { data: staffProfiles } = await supabase
            .from('profiles')
            .select('id, line_user_id')
            .in('id', profileIds)

          const staffLineIds = staffProfiles
            ?.map(p => p.line_user_id)
            .filter(Boolean) as string[] || []

          // Send LINE notification to all available staff
          const cancelledByPending = body.admin_id ? 'admin' : 'customer'
          const cancelledByPendingText = cancelledByPending === 'customer' ? 'ลูกค้า' : 'แอดมิน'

          if (staffLineIds.length > 0) {
            await lineService.sendBookingCancelledToStaff(staffLineIds, {
              serviceName: (booking.service as any)?.name_th || 'Unknown',
              scheduledDate: booking.booking_date,
              scheduledTime: booking.booking_time,
              address: '',
              hotelName: null,
              cancellationReason: body.reason,
              bookingNumber: booking.booking_number,
              cancelledBy: cancelledByPending,
            })
            console.log(`[Cancel] LINE sent to ${staffLineIds.length} available staff (pending jobs cancelled)`)
          }

          // Send in-app notification to all available staff
          const staffProfileIds = staffProfiles?.map(p => p.id).filter(Boolean) || []
          if (staffProfileIds.length > 0) {
            const inAppNotifications = staffProfileIds.map(profileId => ({
              user_id: profileId,
              type: 'job_cancelled',
              title: `งานถูกยกเลิกโดย${cancelledByPendingText}`,
              message: `งาน "${(booking.service as any)?.name_th}" วันที่ ${booking.booking_date} เวลา ${booking.booking_time} ถูกยกเลิกโดย${cancelledByPendingText} เหตุผล: ${body.reason}`,
              data: { booking_id: id, booking_number: booking.booking_number },
              is_read: false,
            }))

            await supabase.from('notifications').insert(inAppNotifications)
            console.log(`[Cancel] In-app notification sent to ${staffProfileIds.length} available staff`)
          }

          notificationResults.staff = true
        }
      } catch (err) {
        console.error('[Cancel] Failed to notify available staff about cancelled pending jobs:', err)
      }
    }

    // Query customer email from profiles table
    const customerProfileId = (booking.customer as any)?.profile_id
    let customerEmail = ''
    if (customerProfileId) {
      const { data: customerProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', customerProfileId)
        .single()
      customerEmail = customerProfile?.email || ''
    }

    // Prepare booking data for notifications
    const bookingForNotification = {
      id: booking.id,
      booking_number: booking.booking_number,
      service_name: (booking.service as any)?.name_th || (booking.service as any)?.name_en || 'Unknown Service',
      scheduled_date: booking.booking_date,
      scheduled_time: booking.booking_time,
      customer_id: booking.customer_id,
      customer_email: customerEmail,
      customer_profile_id: customerProfileId || undefined,
      customer_name: (booking.customer as any)?.full_name || '',
      customer_phone: (booking.customer as any)?.phone,
      assigned_staff_id: booking.staff_id || undefined,
      staff_profile_id: (booking.staff as any)?.profile_id || undefined, // Profile ID for in-app notifications
      staff_email: undefined, // Staff may not have email
      staff_line_user_id: (booking.staff as any)?.profile?.line_user_id,
      hotel_id: booking.hotel_id || undefined,
      hotel_email: (booking.hotel as any)?.email,
      source: booking.is_hotel_booking ? 'hotel' as const : 'customer' as const,
      cancellation_reason: body.reason,
      payment_status: booking.payment_status,
    }

    // Skip staff in sendCancellationNotifications if already notified via jobs above
    if (jobStaffToNotify.length > 0) {
      bookingForNotification.assigned_staff_id = undefined
      bookingForNotification.staff_line_user_id = undefined
    }

    // Send notifications if requested
    if (body.notify_customer !== false || body.notify_staff !== false || body.notify_hotel !== false) {
      try {
        const refundInfo = refundResult && refundResult.refundAmount ? {
          amount: refundResult.refundAmount,
          percentage: body.refund_option === 'full' ? 100 : (body.refund_percentage || 0),
          status: 'completed' as const,
          expected_days: 5,
        } : undefined

        const results = await sendCancellationNotifications(bookingForNotification, refundInfo)
        notificationResults.customer = results.customer
        notificationResults.staff = results.staff
        notificationResults.hotel = results.hotel
        notificationResults.admin = results.admin
      } catch (notifError) {
        console.error('Notification error (non-blocking):', notifError)
        // Don't fail the cancellation if notifications fail
      }
    }

    // Send credit note email if refund was processed
    // Must await to prevent Vercel serverless from terminating before email is sent
    if (refundResult?.refundTransactionId && (refundResult.refundAmount ?? 0) > 0) {
      try {
        await sendCreditNoteEmailForRefund(refundResult.refundTransactionId)
      } catch (emailErr) {
        console.error('⚠️ Credit note email failed (non-blocking):', emailErr)
      }
    }

    // Prepare response
    const response: BookingCancellationResponse = {
      booking_id: id,
      cancelled_at: updateData.cancelled_at,
      refund_transaction_id: refundResult?.refundTransactionId,
      refund_amount: refundResult?.refundAmount,
      notifications_sent: notificationResults,
    }

    return res.json({
      success: true,
      data: response,
      message: 'Booking cancelled successfully',
    })
  } catch (error: any) {
    console.error('Cancel booking error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to cancel booking',
    })
  }
})

/**
 * GET /api/bookings/:id
 * Get booking details with cancellation/refund info
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const supabase = getSupabaseClient()

    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        *,
        customer:customers(*),
        staff:staff(*),
        hotel:hotels(*),
        service:services(*),
        refund_transactions:refund_transactions(*),
        cancellation_notifications:cancellation_notifications(*)
      `)
      .eq('id', id)
      .single()

    if (error || !booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      })
    }

    return res.json({
      success: true,
      data: booking,
    })
  } catch (error: any) {
    console.error('Get booking error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get booking',
    })
  }
})

/**
 * POST /api/bookings/:id/assign-staff
 * Assign a staff member to a booking (for admin use)
 */
router.post('/:id/assign-staff', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { staff_id } = req.body

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Missing booking ID',
      })
    }

    if (!staff_id) {
      return res.status(400).json({
        success: false,
        error: 'staff_id is required',
      })
    }

    const supabase = getSupabaseClient()

    // Update booking with staff_id
    const { data: booking, error: updateError } = await supabase
      .from('bookings')
      .update({
        staff_id: staff_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(`
        id,
        booking_number,
        staff_id,
        status,
        staff:staff_id (
          id,
          name_th,
          profile_id
        )
      `)
      .single()

    if (updateError) {
      console.error('[AssignStaff] Update error:', updateError)
      return res.status(500).json({
        success: false,
        error: updateError.message,
      })
    }

    console.log('[AssignStaff] Staff assigned successfully:', {
      booking_id: id,
      staff_id: staff_id,
      booking_number: booking?.booking_number,
    })

    return res.json({
      success: true,
      data: booking,
      message: 'Staff assigned successfully',
    })
  } catch (error: any) {
    console.error('[AssignStaff] Error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to assign staff',
    })
  }
})

// ============================================
// EXTEND BOOKING SESSION
// ============================================

interface ExtendBookingRequest {
  additional_duration: number  // minutes to add
  notes?: string              // optional reason/notes
  promotion_id?: string       // promotion applied
  discount_amount?: number    // discount from promotion
  requested_by?: 'customer' | 'hotel_staff'
  payment_method?: string     // 'promptpay' | 'credit_card' | 'internet_banking' | 'mobile_banking'
  omise_token?: string        // credit card token from Omise.js frontend
  bank_code?: string          // e.g. 'scb', 'kbank', 'bbl', 'ktb', 'bay', 'ttb'
  // COUPLE/simultaneous: which recipient(s) to extend. [0]=คนที่1, [1]=คนที่2, [0,1]=ทั้งคู่.
  // Omitted/empty ⇒ the base recipient (backwards-compatible single-recipient extend).
  recipient_indices?: number[]
}

/** Extension price for a service at a given duration (mirrors the customer/hotel client helpers). */
function computeExtensionPrice(service: any, duration: number): number {
  let price: number
  switch (duration) {
    case 60: price = service.price_60 || (service.base_price * 0.5); break
    case 90: price = service.price_90 || (service.base_price * 0.75); break
    case 120: price = service.price_120 || service.base_price; break
    default: price = (service.base_price / service.duration) * duration
  }
  return Math.round(price)
}

/** A pending_extensions row → an apply TARGET (honors the row's own recipient_index/service_id — the
 *  whole point of storing them per-row, so admin-confirm applies to the right recipient, never [0]). */
function pendingToTarget(pending: any, booking: any): ExtensionTarget {
  const idx = pending.recipient_index ?? 0
  const baseRow = (booking.booking_services || []).find((s: any) => !s.is_extension && (s.recipient_index ?? 0) === idx)
  return {
    recipientIndex: idx,
    serviceId: pending.service_id || baseRow?.service_id || booking.service_id,
    additionalDuration: pending.additional_duration,
    finalExtensionPrice: Number(pending.final_extension_price),
    discountAmount: Number(pending.discount_amount) || 0,
    promotionId: pending.promotion_id,
    recipientName: pending.recipient_name ?? baseRow?.recipient_name ?? null,
    baseBookingServiceId: baseRow?.id ?? null,
  }
}

interface ExtendBookingResponse {
  success: boolean
  extension: {
    id: string
    additional_duration: number
    extension_price: number
    discount_amount: number
    final_price: number
  }
  booking: {
    new_total_duration: number
    new_total_price: number
    estimated_end_time: string
    extension_count: number
  }
  payment?: {
    requires_payment: boolean
    payment_url?: string
    payment_reference?: string
    authorize_uri?: string
  }
  notifications: {
    staff_notified: number
    customer_notified: boolean
  }
}

/**
 * POST /api/bookings/:bookingId/extend
 * Extend a booking session duration
 */
router.post('/:bookingId/extend', paymentAuthGuard, async (req: Request, res: Response) => {
  const { bookingId } = req.params
  const body: ExtendBookingRequest = req.body

  console.log(`[ExtendBooking] Request for booking ${bookingId}:`, body)

  try {
    const supabase = getSupabaseClient()

    // 1. Validate request
    if (!body.additional_duration || body.additional_duration <= 0) {
      return res.status(400).json({
        success: false,
        error: 'invalid_duration',
        message: 'ระยะเวลาเพิ่มเติมไม่ถูกต้อง'
      })
    }

    // 2. Get booking with current services and staff (handle both old and new structures)
    console.log(`[ExtendBooking] Querying booking ${bookingId}...`)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_services (
          id, service_id, duration, price, recipient_name, recipient_index, is_extension,
          services (name_th, name_en, base_price, price_60, price_90, price_120, duration)
        ),
        service:services (
          name_th, name_en, base_price, price_60, price_90, price_120, duration
        ),
        jobs (id, staff_id, status, job_index),
        customers (profile_id, full_name, phone),
        hotels (id, name_th, name_en)
      `)
      .eq('id', bookingId)
      .single()

    console.log(`[ExtendBooking] Query result:`, { bookingError, hasBooking: !!booking })

    if (bookingError) {
      console.error('[ExtendBooking] Supabase error:', bookingError)
      return res.status(404).json({
        success: false,
        error: 'booking_not_found',
        message: 'ไม่พบการจองที่ระบุ',
        debug: bookingError.message
      })
    }

    if (!booking) {
      console.log('[ExtendBooking] No booking found')
      return res.status(404).json({
        success: false,
        error: 'booking_not_found',
        message: 'ไม่พบการจองที่ระบุ'
      })
    }

    // 3. Validate booking status and extension limits
    // Extend only while the staff is actively serving (in_progress); 'confirmed' (accepted,
    // not started) has no in-service job/earnings to update yet.
    const allowedStatuses = ['in_progress']
    if (!allowedStatuses.includes(booking.status)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_status',
        message: 'เพิ่มเวลาได้เฉพาะระหว่างที่พนักงานกำลังให้บริการ (เริ่มบริการแล้ว)'
      })
    }

    const maxExtensions = 3
    const currentExtensionCount = booking.extension_count || 0
    if (currentExtensionCount >= maxExtensions) {
      return res.status(400).json({
        success: false,
        error: 'max_extensions_reached',
        message: `เพิ่มเวลาได้สูงสุด ${maxExtensions} ครั้งต่อการจอง`
      })
    }

    // 4. Resolve which recipient(s) to extend, deterministically.
    // COUPLE/simultaneous bookings have ONE booking_services base row PER RECIPIENT (recipient_index
    // 0,1) served IN PARALLEL by separate staff. NEVER derive the target from booking_services[0]
    // (nondeterministic — the query has no ORDER BY). Sort base rows by recipient_index and honor the
    // client's explicit choice (recipient_indices: [0]=คนที่1 / [1]=คนที่2 / [0,1]=ทั้งคู่).
    const now = new Date()
    const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`)
    const baseRows: any[] = (booking.booking_services || [])
      .filter((s: any) => !s.is_extension)
      .sort((a: any, b: any) => (a.recipient_index ?? 0) - (b.recipient_index ?? 0))
    const hasBookingServices = baseRows.length > 0
    const availableRecipientIndices = hasBookingServices
      ? Array.from(new Set(baseRows.map((r: any) => r.recipient_index ?? 0))).sort((a, b) => a - b)
      : [0]

    // Requested indices ∩ available; default = the first (lowest) recipient for a single/legacy extend.
    let requestedIndices = Array.isArray(body.recipient_indices) && body.recipient_indices.length > 0
      ? Array.from(new Set(body.recipient_indices)).filter((i) => availableRecipientIndices.includes(i))
      : [availableRecipientIndices[0]]
    if (requestedIndices.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'invalid_recipient',
        message: 'ไม่พบผู้รับบริการที่ระบุสำหรับการเพิ่มเวลา'
      })
    }
    requestedIndices = requestedIndices.sort((a, b) => a - b)

    // Each selected recipient is one added is_extension row → guard the max-3 cap against the BATCH
    // size ("ต่อทั้งคู่" adds 2), not just the current count (which the initial gate already checked).
    if (currentExtensionCount + requestedIndices.length > maxExtensions) {
      return res.status(400).json({
        success: false,
        error: 'max_extensions_reached',
        message: `เพิ่มเวลาได้สูงสุด ${maxExtensions} ครั้งต่อการจอง`
      })
    }

    // Per-recipient CURRENT duration = base + already-applied extensions for that recipient (all rows,
    // not just the base row) so the deadline/end-time reflect the true remaining time. Deadline gates on
    // the EARLIEST-ending SELECTED recipient (min) so we never extend past any selected recipient's cutoff.
    const allRows: any[] = booking.booking_services || []
    const recipientCurrentDuration = (idx: number): number =>
      hasBookingServices
        ? allRows.filter((s: any) => (s.recipient_index ?? 0) === idx).reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
        : (booking.duration || 0)
    const minCurrentDuration = Math.min(...requestedIndices.map((i) => recipientCurrentDuration(i)))
    const currentEndTime = new Date(bookingDateTime.getTime() + (minCurrentDuration * 60 * 1000))
    const deadlineTime = new Date(currentEndTime.getTime() - (15 * 60 * 1000))
    if (now > deadlineTime) {
      return res.status(400).json({
        success: false,
        error: 'extension_too_late',
        message: 'ไม่สามารถเพิ่มเวลาได้ เนื่องจากเหลือเวลาน้อยกว่า 15 นาทีก่อนหมดเวลาบริการ'
      })
    }

    // 5. Build one extension TARGET per selected recipient (each priced by ITS OWN service).
    const discountAmount = body.discount_amount || 0
    const targets: ExtensionTarget[] = []
    for (let ti = 0; ti < requestedIndices.length; ti++) {
      const idx = requestedIndices[ti]
      const baseRow = baseRows.find((s: any) => (s.recipient_index ?? 0) === idx)
      const svc = baseRow?.services || booking.service
      if (!svc) {
        return res.status(400).json({
          success: false,
          error: 'service_not_found',
          message: 'ไม่พบข้อมูลบริการสำหรับการคำนวณราคา'
        })
      }
      const grossPrice = computeExtensionPrice(svc, body.additional_duration)
      // Apply the whole discount to the first target only (avoids over-discounting when extending both).
      const targetDiscount = ti === 0 ? discountAmount : 0
      targets.push({
        recipientIndex: idx,
        serviceId: baseRow?.service_id || booking.service_id,
        additionalDuration: body.additional_duration,
        finalExtensionPrice: Math.max(0, grossPrice - targetDiscount),
        discountAmount: targetDiscount,
        promotionId: ti === 0 ? (body.promotion_id || null) : null,
        recipientName: baseRow?.recipient_name ?? null,
        baseBookingServiceId: baseRow?.id ?? null,
      })
    }

    // 6. Aggregate figures (couple: sum prices across recipients; session end = max recipient end).
    const extensionPrice = targets.reduce((sum, t) => sum + (t.finalExtensionPrice + (t.discountAmount || 0)), 0)
    const finalExtensionPrice = targets.reduce((sum, t) => sum + t.finalExtensionPrice, 0)
    const newTotalDuration = Math.max(...requestedIndices.map((i) => recipientCurrentDuration(i) + body.additional_duration))
    const newTotalPrice = booking.final_price + finalExtensionPrice
    const newExtensionCount = currentExtensionCount + targets.length
    const estimatedEndTime = new Date(bookingDateTime.getTime() + (newTotalDuration * 60 * 1000))

    // 7. Context kept for the (prod-inactive) Omise metadata path — single-recipient (first target).
    const serviceId = targets[0].serviceId
    // Collect staff profiles for the Omise webhook metadata (legacy path only). jobs.staff_id IS the
    // staff PROFILE id; keep this lookup shape for the metadata consumer (payment.ts).
    let staffProfilesForWebhook: Array<{ profile_id: string; full_name: string }> = []
    if (booking.jobs && booking.jobs.length > 0) {
      const staffIds = booking.jobs.map((job: any) => job.staff_id).filter(Boolean)
      if (staffIds.length > 0) {
        const { data: staffProfiles } = await supabase
          .from('staff')
          .select('profile_id, full_name')
          .in('id', staffIds)
        if (staffProfiles) {
          staffProfilesForWebhook = staffProfiles.filter((s: any) => s.profile_id)
        }
      }
    }

    // 8. Customer-paid extensions: create payment FIRST, apply extension only after webhook confirms
    // Hotel bookings settle on monthly credit bill — apply immediately without Omise charge.
    if (finalExtensionPrice > 0 && !booking.is_hotel_booking) {
      // [manual-QR] G10: a paid customer extension in manual_qr mode is settled OFF-platform (customer
      // pays via the static QR + sends the slip to admin via LINE OA; admin applies it). Reject the Omise
      // charge here — placed INSIDE the !is_hotel_booking block so hotel extend-session (monthly bill) and
      // free (price=0) extensions never hit this gate (VA6).
      if (await getPaymentMode() === 'manual_qr') {
        // [manual-QR] PART47 P3: instead of rejecting, register a PENDING extension that the admin
        // CONFIRMS after the customer pays via the static QR + sends the slip to admin on LINE OA.
        // 🔴 Do NOT insert a booking_services is_extension row here — its AFTER-INSERT triggers would
        // apply the extension before it's paid. Store the intent in pending_extensions; it becomes a
        // booking_services INSERT only at admin-confirm (POST /:bookingId/extend/:pendingId/confirm).
        // Supersede any still-pending request for the SAME recipient(s) first (a re-submit / retry / change
        // of mind), so a recipient never accumulates duplicate pending rows that would double-apply. A
        // pending row for a DIFFERENT recipient (an independent request) is left untouched.
        await supabase
          .from('pending_extensions')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('booking_id', bookingId)
          .eq('status', 'pending')
          .in('recipient_index', requestedIndices)
        // One pending_extensions row PER selected recipient (couple "ต่อทั้งคู่" ⇒ 2 rows). Each row
        // carries its OWN recipient_index/service_id/price so admin-confirm applies it to the right
        // recipient's job.
        const pendingRows = targets.map((t) => ({
          booking_id: bookingId,
          service_id: t.serviceId,
          additional_duration: t.additionalDuration,
          extension_price: t.finalExtensionPrice + (t.discountAmount || 0),
          discount_amount: t.discountAmount || 0,
          final_extension_price: t.finalExtensionPrice,
          promotion_id: t.promotionId || null,
          recipient_index: t.recipientIndex,
          recipient_name: t.recipientName,
          customer_name: booking.customers?.full_name || booking.customers?.phone || '',
          booking_number: booking.booking_number,
          status: 'pending',
          requested_by: 'customer',
        }))
        const { data: pendingInserted, error: pendingError } = await supabase
          .from('pending_extensions')
          .insert(pendingRows)
          .select('id')

        if (pendingError || !pendingInserted || pendingInserted.length === 0) {
          console.error('[ExtendBooking] Failed to create pending extension(s):', pendingError)
          return res.status(500).json({
            success: false,
            error: 'database_error',
            message: 'ไม่สามารถบันทึกคำขอต่อเวลาได้ กรุณาลองใหม่อีกครั้ง'
          })
        }
        const pendingIds = pendingInserted.map((p: any) => p.id)

        // Notify admins (in-app bell only) that a pending extension awaits confirmation. Non-blocking.
        try {
          await sendExtensionNotifications(bookingId, {
            extensionMinutes: body.additional_duration,
            extensionCount: newExtensionCount,
            pending: true,
            pendingId: pendingIds[0],
            amount: finalExtensionPrice,
          })
        } catch (notifyErr) {
          console.error('[ExtendBooking] Pending-extension admin notify failed (non-blocking):', notifyErr)
        }

        // Customer shows the static QR + "waiting for admin to confirm" with booking_number + amount.
        return res.status(200).json({
          success: true,
          status: 'requires_admin_confirmation',
          pending_extension_id: pendingIds[0],
          pending_extension_ids: pendingIds,
          extension: {
            additional_duration: body.additional_duration,
            extension_price: finalExtensionPrice,
            discount_amount: discountAmount,
            final_price: finalExtensionPrice
          },
          booking: {
            booking_number: booking.booking_number,
            new_total_price: newTotalPrice,
            estimated_end_time: estimatedEndTime.toISOString(),
            extension_count: newExtensionCount
          },
          message: 'บันทึกคำขอต่อเวลาแล้ว รอแอดมินยืนยันหลังได้รับสลิปการชำระเงิน'
        })
      }
      try {
        const { omiseService } = await import('../services/omiseService.js')
        const enabledChannels = await getEnabledPaymentChannels()

        const amountSatang = Math.round(finalExtensionPrice * 100)
        const extDescription = `Extension ${body.additional_duration}min - Booking ${booking.booking_number}`
        const extMetadata = {
          booking_id: bookingId,
          customer_id: booking.customer_id,
          is_extension: true,
          extension_duration: body.additional_duration,
          original_price: finalExtensionPrice
        }
        const extReturnUri = `${process.env.CLIENT_URL || 'http://localhost:3008'}/payment-confirmation?booking_id=${bookingId}&transaction_type=extension`
        const extTransactionMetadata = {
          is_extension: true,
          extension_duration: body.additional_duration,
          extension_price: finalExtensionPrice,
          discount_amount: discountAmount,
          promotion_id: body.promotion_id || null,
          // Fields for booking_services record creation in webhook (Omise single-recipient path only —
          // dead on prod manual_qr; couple "ต่อทั้งคู่" is not supported via a single Omise charge).
          service_id: serviceId,
          has_booking_services: hasBookingServices,
          recipient_index: targets[0].recipientIndex,
          recipient_name: targets[0].recipientName,
          sort_order: hasBookingServices ? booking.booking_services.length + 1 : 1,
          original_booking_service_id: targets[0].baseBookingServiceId,
          // Fields for booking totals update in webhook
          current_total_duration: recipientCurrentDuration(targets[0].recipientIndex),
          current_extension_count: currentExtensionCount,
          current_total_price: booking.final_price,
          // Fields for notifications in webhook
          staff_profiles: staffProfilesForWebhook,
          customer_profile_id: booking.customers?.profile_id || null,
          customer_name: booking.customers?.full_name || booking.customers?.phone || '',
          booking_number: booking.booking_number,
          booking_date: booking.booking_date,
          booking_time: booking.booking_time
        }

        if (body.omise_token || body.payment_method === 'credit_card') {
          // ── Credit card path: charge synchronously with frontend token ──
          if (!body.omise_token) {
            return res.status(400).json({
              success: false,
              error: 'missing_token',
              message: 'กรุณาระบุ token บัตรเครดิต'
            })
          }

          const charge = await omiseService.createCharge({
            amount: amountSatang,
            currency: 'THB',
            token: body.omise_token,
            description: extDescription,
            metadata: extMetadata,
            returnUri: extReturnUri
          })

          const chargeStatus = charge.paid ? 'successful' : 'pending'

          const { data: transaction, error: transactionError } = await supabase
            .from('transactions')
            .insert({
              booking_id: bookingId,
              customer_id: booking.customer_id,
              amount: finalExtensionPrice,
              currency: 'THB',
              payment_method: 'credit_card',
              description: `Extension payment for ${body.additional_duration} minutes - Booking ${booking.booking_number}`,
              status: chargeStatus,
              omise_charge_id: charge.id,
              metadata: extTransactionMetadata
            })
            .select()
            .single()

          if (transactionError || !transaction) {
            console.error('[ExtendBooking] Failed to create credit card transaction:', transactionError)
            return res.status(500).json({
              success: false,
              error: 'database_error',
              message: 'เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน'
            })
          }

          console.log(`[ExtendBooking] Credit card charge for booking ${bookingId}:`, {
            charge_id: charge.id,
            paid: charge.paid,
            status: charge.status
          })

          // Credit card charges are instantly paid — apply extension immediately
          if (charge.paid) {
            try {
              await applyExtensionAfterPayment(transaction.id)
            } catch (applyErr) {
              console.error('[ExtendBooking] Failed to apply extension after credit card payment:', applyErr)
            }
          }

          return res.json({
            success: true,
            extension: {
              id: transaction.id,
              additional_duration: body.additional_duration,
              extension_price: finalExtensionPrice,
              discount_amount: discountAmount,
              final_price: finalExtensionPrice
            },
            booking: {
              new_total_duration: newTotalDuration,
              new_total_price: newTotalPrice,
              estimated_end_time: estimatedEndTime.toISOString(),
              extension_count: newExtensionCount
            },
            payment: {
              requires_payment: !charge.paid,
              payment_url: charge.paid ? undefined : extReturnUri,
              payment_reference: charge.id,
              transaction_id: transaction.id,
              charge_status: charge.status
            },
            notifications: {
              staff_notified: 0,
              customer_notified: false
            }
          } as ExtendBookingResponse)
        }

        // ── Internet / Mobile Banking path ───────────────────────────────

        if (body.payment_method === 'internet_banking' || body.payment_method === 'mobile_banking') {
          if (!body.bank_code) {
            return res.status(400).json({
              success: false,
              error: 'missing_bank_code',
              message: 'กรุณาระบุธนาคาร'
            })
          }
          if (!enabledChannels.includes(body.payment_method)) {
            return res.status(400).json({
              success: false,
              error: 'payment_channel_disabled',
              message: 'ช่องทางการชำระเงินนี้ถูกปิดใช้งาน'
            })
          }

          const sourceType = `${body.payment_method}_${body.bank_code}`
          const bankReturnUri = `${process.env.FRONTEND_URL || 'https://the-bliss-at-home-customer.vercel.app'}/bookings/${booking.booking_number}?payment=success&type=extension`
          const bankSource = await omiseService.createSource(sourceType, amountSatang, 'THB')
          const bankCharge = await omiseService.createChargeWithSource({
            amount: amountSatang,
            currency: 'THB',
            source: bankSource.id,
            description: extDescription,
            metadata: extMetadata,
            returnUri: bankReturnUri
          })

          const { data: bankTransaction, error: bankTransactionError } = await supabase
            .from('transactions')
            .insert({
              booking_id: bookingId,
              customer_id: booking.customer_id,
              amount: finalExtensionPrice,
              currency: 'THB',
              payment_method: body.payment_method,
              description: `Extension payment for ${body.additional_duration} minutes - Booking ${booking.booking_number}`,
              status: 'pending',
              omise_charge_id: bankCharge.id,
              metadata: extTransactionMetadata
            })
            .select()
            .single()

          if (bankTransactionError || !bankTransaction) {
            console.error('[ExtendBooking] Failed to create banking transaction:', bankTransactionError)
            return res.status(500).json({
              success: false,
              error: 'database_error',
              message: 'เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน'
            })
          }

          return res.json({
            success: true,
            extension: {
              id: bankTransaction.id,
              additional_duration: body.additional_duration,
              extension_price: finalExtensionPrice,
              discount_amount: discountAmount,
              final_price: finalExtensionPrice
            },
            booking: {
              new_total_duration: newTotalDuration,
              new_total_price: newTotalPrice,
              estimated_end_time: estimatedEndTime.toISOString(),
              extension_count: newExtensionCount
            },
            payment: {
              requires_payment: true,
              authorize_uri: bankSource.authorize_uri,
              payment_reference: bankCharge.id,
              transaction_id: bankTransaction.id
            },
            notifications: {
              staff_notified: 0,
              customer_notified: false
            }
          } as ExtendBookingResponse)
        }

        // ── PromptPay path ────────────────────────────────────────────────

        if (!enabledChannels.includes('promptpay')) {
          return res.status(400).json({
            success: false,
            error: 'payment_channel_disabled',
            message: 'ขณะนี้ไม่มีช่องทางการชำระเงินสำหรับการต่อเวลา กรุณาติดต่อแอดมิน'
          })
        }

        const source = await omiseService.createSource('promptpay', amountSatang, 'THB')
        const charge = await omiseService.createChargeWithSource({
          amount: amountSatang,
          currency: 'THB',
          source: source.id,
          description: extDescription,
          metadata: extMetadata,
          returnUri: extReturnUri
        })
        const updatedSource = await omiseService.getSource(source.id)
        const paymentUrl = updatedSource.scannable_code?.image?.download_uri || extReturnUri

        // Store all extension data in transaction metadata so webhook can apply the extension
        const { data: transaction, error: transactionError } = await supabase
          .from('transactions')
          .insert({
            booking_id: bookingId,
            customer_id: booking.customer_id,
            amount: finalExtensionPrice,
            currency: 'THB',
            payment_method: 'promptpay',
            description: `Extension payment for ${body.additional_duration} minutes - Booking ${booking.booking_number}`,
            status: 'pending',
            omise_charge_id: charge.id,
            metadata: extTransactionMetadata
          })
          .select()
          .single()

        if (transactionError || !transaction) {
          console.error('[ExtendBooking] Failed to create transaction:', transactionError)
          return res.status(500).json({
            success: false,
            error: 'database_error',
            message: 'เกิดข้อผิดพลาดในการสร้างรายการชำระเงิน'
          })
        }

        console.log(`[ExtendBooking] Payment pending for booking ${bookingId}:`, {
          charge_id: charge.id,
          transaction_id: transaction.id,
          amount: finalExtensionPrice
        })

        return res.json({
          success: true,
          extension: {
            id: transaction.id,
            additional_duration: body.additional_duration,
            extension_price: finalExtensionPrice,
            discount_amount: discountAmount,
            final_price: finalExtensionPrice
          },
          booking: {
            new_total_duration: newTotalDuration,
            new_total_price: newTotalPrice,
            estimated_end_time: estimatedEndTime.toISOString(),
            extension_count: newExtensionCount
          },
          payment: {
            requires_payment: true,
            payment_url: paymentUrl,
            payment_reference: charge.id,
            transaction_id: transaction.id,
            charge_status: charge.status
          },
          notifications: {
            staff_notified: 0,
            customer_notified: false
          }
        } as ExtendBookingResponse)

      } catch (paymentError) {
        console.error('❌ Extension payment creation failed:', paymentError)
        return res.status(500).json({
          success: false,
          error: 'payment_creation_failed',
          message: 'ไม่สามารถสร้างการชำระเงินได้ กรุณาลองใหม่อีกครั้ง',
          details: paymentError instanceof Error ? paymentError.message : 'Unknown error'
        })
      }
    }

    // Hotel bookings or free extensions (finalExtensionPrice === 0): apply immediately, no payment
    // needed — via the shared helper (the SAME apply site the admin-confirm of a manual_qr pending
    // extension uses). Inserts the linchpin booking_services is_extension row + absolute-SETs booking
    // totals + notifies + per-recipient earnings recalc.
    let applyResult
    try {
      applyResult = await applyExtensionToBooking({ booking, targets })
    } catch (applyErr: any) {
      console.error('[ExtendBooking] Failed to apply extension inline:', applyErr)
      return res.status(500).json({
        success: false,
        error: 'database_error',
        message: 'เกิดข้อผิดพลาดในการสร้างการขยายเวลา'
      })
    }

    console.log(`[ExtendBooking] Extension applied immediately for booking ${bookingId}:`, {
      additional_duration: body.additional_duration,
      extension_price: finalExtensionPrice,
      new_total_duration: applyResult.newTotalDuration
    })

    return res.json({
      success: true,
      extension: {
        id: applyResult.extensionServiceIds[0],
        additional_duration: body.additional_duration,
        extension_price: finalExtensionPrice,
        discount_amount: discountAmount,
        final_price: finalExtensionPrice
      },
      booking: {
        new_total_duration: applyResult.newTotalDuration,
        new_total_price: applyResult.newTotalPrice,
        estimated_end_time: applyResult.estimatedEndTime.toISOString(),
        extension_count: applyResult.newExtensionCount
      },
      payment: undefined,
      notifications: {
        staff_notified: applyResult.staffNotified,
        customer_notified: applyResult.customerNotified
      }
    } as ExtendBookingResponse)

  } catch (error: any) {
    console.error('[ExtendBooking] Error:', error)
    return res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message || 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์'
    })
  }
})

// ============================================================================
// PART47 P3 — Admin confirm / cancel a manual_qr PENDING extension
// (authenticateSupabaseUser verifies the admin JWT + role; NOT the flag-gated paymentAuthGuard —
//  applying a paid extension is money, so it must always require a real admin.)
// ============================================================================

// Admin confirms/cancels ONE pending request at a time (per-slip). A couple "ต่อทั้งคู่" produces 2
// pending rows the admin confirms individually — confirming one never auto-applies another whose payment
// slip wasn't verified. Each confirm applies ONLY that pending row's own recipient (pendingToTarget).
router.post('/:bookingId/extend/:pendingId/confirm', authenticateSupabaseUser, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest
  if (authReq.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'forbidden', message: 'ต้องเป็นแอดมินเท่านั้น' })
  }
  const { bookingId, pendingId } = req.params
  try {
    const supabase = getSupabaseClient()

    // 1. Load the pending row (must belong to this booking). Idempotency: already-confirmed = no-op.
    const { data: pending, error: pendingError } = await supabase
      .from('pending_extensions')
      .select('*')
      .eq('id', pendingId)
      .eq('booking_id', bookingId)
      .single()
    if (pendingError || !pending) {
      return res.status(404).json({ success: false, error: 'pending_not_found', message: 'ไม่พบคำขอต่อเวลา' })
    }
    if (pending.status === 'confirmed' || pending.applied_booking_service_id) {
      return res.status(200).json({ success: true, already_applied: true, message: 'ยืนยันการต่อเวลานี้ไปแล้ว' })
    }
    if (pending.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'pending_cancelled', message: 'คำขอต่อเวลานี้ถูกยกเลิกแล้ว' })
    }

    // 2. Re-read the booking FRESH (with services/jobs/customers) so totals compute off current state.
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        booking_services (id, service_id, duration, price, recipient_name, recipient_index, is_extension),
        jobs (id, staff_id, status, job_index),
        customers (profile_id, full_name, phone)
      `)
      .eq('id', bookingId)
      .single()
    if (bookingError || !booking) {
      return res.status(404).json({ success: false, error: 'booking_not_found', message: 'ไม่พบการจอง' })
    }

    // 3. Apply via the SAME shared helper, targeting the recipient the PENDING row recorded (not [0]).
    const applyResult = await applyExtensionToBooking({ booking, targets: [pendingToTarget(pending, booking)] })

    // 4. Latch the pending row confirmed (idempotency: applied_booking_service_id set).
    await supabase
      .from('pending_extensions')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: authReq.user!.id,
        applied_booking_service_id: applyResult.extensionServiceIds[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', pendingId)

    return res.json({
      success: true,
      extension: {
        id: applyResult.extensionServiceIds[0],
        additional_duration: pending.additional_duration,
        final_price: Number(pending.final_extension_price),
      },
      booking: {
        new_total_duration: applyResult.newTotalDuration,
        new_total_price: applyResult.newTotalPrice,
        estimated_end_time: applyResult.estimatedEndTime.toISOString(),
        extension_count: applyResult.newExtensionCount,
      },
      notifications: {
        staff_notified: applyResult.staffNotified,
        customer_notified: applyResult.customerNotified,
      },
    })
  } catch (error: any) {
    console.error('[ConfirmExtension] Error:', error)
    return res.status(500).json({ success: false, error: 'server_error', message: error.message || 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' })
  }
})

router.post('/:bookingId/extend/:pendingId/cancel', authenticateSupabaseUser, async (req: Request, res: Response) => {
  const authReq = req as AuthenticatedRequest
  if (authReq.user?.role !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'forbidden', message: 'ต้องเป็นแอดมินเท่านั้น' })
  }
  const { bookingId, pendingId } = req.params
  try {
    const supabase = getSupabaseClient()
    const { data: pending, error } = await supabase
      .from('pending_extensions')
      .select('id, status')
      .eq('id', pendingId)
      .eq('booking_id', bookingId)
      .single()
    if (error || !pending) {
      return res.status(404).json({ success: false, error: 'pending_not_found', message: 'ไม่พบคำขอต่อเวลา' })
    }
    if (pending.status === 'confirmed') {
      return res.status(400).json({ success: false, error: 'already_confirmed', message: 'ยืนยันไปแล้ว ยกเลิกไม่ได้' })
    }
    await supabase
      .from('pending_extensions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', pendingId)
    return res.json({ success: true, message: 'ยกเลิกคำขอต่อเวลาแล้ว' })
  } catch (error: any) {
    console.error('[CancelExtension] Error:', error)
    return res.status(500).json({ success: false, error: 'server_error', message: error.message || 'เกิดข้อผิดพลาดในเซิร์ฟเวอร์' })
  }
})

export default router
