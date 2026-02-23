/**
 * Booking API Routes
 * Handles booking management operations
 */

import { Router, Request, Response } from 'express'
import { getSupabaseClient } from '../lib/supabase.js'
import { refundService } from '../services/refundService.js'
import { sendCancellationNotifications } from '../services/cancellationNotificationService.js'
import { sendRescheduleNotifications } from '../services/rescheduleNotificationService.js'
import { sendCreditNoteEmailForRefund } from './receipts.js'
import { lineService } from '../services/lineService.js'
import { checkCancellationEligibility } from '../services/cancellationPolicyService.js'
import type {
  BookingCancellationRequest,
  BookingCancellationResponse,
  RefundOption,
} from '../types/cancellation.js'

const router = Router()

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
 * POST /api/bookings/:id/reschedule
 * Reschedule a booking to a new date/time
 * - Updates booking date/time
 * - Unassigns staff (they need to re-accept)
 * - Sends notifications to previously assigned staff
 */
router.post('/:id/reschedule', async (req: Request, res: Response) => {
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
        duration,
        final_price,
        staff_id,
        hotel_id,
        customer_id,
        address,
        reschedule_count,
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
          staff_commission_rate
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

    // Store old date/time for notification
    const oldDate = booking.booking_date
    const oldTime = booking.booking_time
    const previousStaffId = booking.staff_id
    const staffData = booking.staff as any

    // 1. FIRST — Query jobs BEFORE any updates
    // jobs.staff_id FK → profiles.id (NOT staff.id), so we query staff separately
    const { data: assignedJobs } = await supabase
      .from('jobs')
      .select('id, staff_id, status, service_name')
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
      .map(j => ({
        job_id: j.id,
        profile_id: j.staff_id as string,
        ...staffInfoMap[j.staff_id],
      }))

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

    // 2. Update booking date/time and unassign staff
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        booking_date: body.new_date,
        booking_time: body.new_time,
        staff_id: null,
        status: 'pending',
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

    // 3. Update ALL jobs — reset to pending for re-acceptance
    let updatedJobIds: string[] = []
    if (assignedJobs && assignedJobs.length > 0) {
      const { error: jobUpdateError } = await supabase
        .from('jobs')
        .update({
          scheduled_date: body.new_date,
          scheduled_time: body.new_time,
          staff_id: null,
          status: 'pending',
          accepted_at: null,
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
          staff_earnings: Math.round(Number(booking.final_price) * (Number((booking.service as any)?.staff_commission_rate) || 0.3) / (assignedJobs?.length || 1)),
          assigned_staff_id: staffInfo.staff_id,
          staff_profile_id: staffInfo.profile_id,
          staff_line_user_id: staffInfo.line_user_id,
          hotel_name: (booking.hotel as any)?.name_th || (booking.hotel as any)?.name_en,
          address: booking.address || '',
          new_job_id: staffInfo.job_id || updatedJobIds[0],
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

    return res.json({
      success: true,
      data: {
        booking_id: id,
        old_date: oldDate,
        old_time: oldTime,
        new_date: body.new_date,
        new_time: body.new_time,
        staff_unassigned: hasAssignedStaff,
        jobs_reset: updatedJobIds.length,
        notifications_sent: notificationResults,
      },
      message: hasAssignedStaff
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
router.post('/:id/cancel', async (req: Request, res: Response) => {
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

    // Process refund if payment was made and refund is requested
    let refundResult = null
    const shouldProcessRefund = booking.payment_status === 'paid' && body.refund_option !== 'none'

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
    } else if (booking.payment_status === 'paid' && body.refund_option === 'none') {
      // Payment was made but no refund requested
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

    // Send notifications
    const notificationResults = {
      customer: false,
      staff: false,
      hotel: false,
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

    if (jobStaffToNotify.length > 0) {
      // Send LINE to each assigned staff
      const lineUserIds = jobStaffToNotify
        .map(j => (j.profile as any)?.line_user_id)
        .filter(Boolean) as string[]

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
            title: 'งานถูกยกเลิก',
            message: `งาน "${(booking.service as any)?.name_th}" วันที่ ${booking.booking_date} เวลา ${booking.booking_time} ถูกยกเลิก เหตุผล: ${body.reason}`,
            data: { booking_id: id, job_id: job.id },
          })
        }
      }
    }

    // Prepare booking data for notifications
    const bookingForNotification = {
      id: booking.id,
      booking_number: booking.booking_number,
      service_name: (booking.service as any)?.name_th || (booking.service as any)?.name_en || 'Unknown Service',
      scheduled_date: booking.booking_date,
      scheduled_time: booking.booking_time,
      customer_id: booking.customer_id,
      customer_email: '', // Email is in profiles table, not customers - would need separate query
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
      } catch (notifError) {
        console.error('Notification error (non-blocking):', notifError)
        // Don't fail the cancellation if notifications fail
      }
    }

    // Send credit note email if refund was processed (non-blocking)
    if (refundResult?.refundTransactionId && refundResult.refundAmount > 0) {
      sendCreditNoteEmailForRefund(refundResult.refundTransactionId).catch(emailErr => {
        console.error('⚠️ Credit note email failed (non-blocking):', emailErr)
      })
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

export default router
