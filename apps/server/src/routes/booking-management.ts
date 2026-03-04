/**
 * Booking Management API Endpoints
 * Handles cancellation and rescheduling of bookings
 */

import { Router } from 'express'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const router = Router()

// Service Role Supabase (bypass RLS)
const serviceSupabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// User Context Supabase (for auth verification)
const createUserSupabase = (token: string) => {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

// Middleware: Authenticate using Supabase
async function authenticateSupabaseUser(req: any, res: any, next: any) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const userSupabase = createUserSupabase(token)
    const { data: { user }, error } = await userSupabase.auth.getUser()

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token', details: error?.message })
    }

    // Get user profile using service role
    const { data: profile, error: profileError } = await serviceSupabase
      .from('profiles')
      .select('id, role, email')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return res.status(401).json({ error: 'User profile not found', details: profileError?.message })
    }

    req.user = profile
    next()
  } catch (error: any) {
    return res.status(401).json({ error: 'Authentication failed', details: error.message })
  }
}

// Helper function: Check eligibility
async function checkBookingEligibility(bookingId: string, action: 'cancel' | 'reschedule') {
  // Get booking details
  const { data: booking, error: bookingError } = await serviceSupabase
    .from('bookings')
    .select('id, booking_date, booking_time, final_price, payment_status, status')
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    throw new Error('Booking not found')
  }

  // Calculate hours until booking
  const bookingDateTime = new Date(`${booking.booking_date} ${booking.booking_time}`)
  const now = new Date()
  const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

  // Fetch active policy tiers
  const { data: tiers, error: tiersError } = await serviceSupabase
    .from('cancellation_policy_tiers')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (tiersError || !tiers || tiers.length === 0) {
    throw new Error('Policy configuration not found')
  }

  // Find applicable tier
  let applicableTier = null
  for (const tier of tiers) {
    const minHours = tier.min_hours_before
    const maxHours = tier.max_hours_before

    if (maxHours === null) {
      if (hoursUntilBooking >= minHours) {
        applicableTier = tier
        break
      }
    } else {
      if (hoursUntilBooking >= minHours && hoursUntilBooking < maxHours) {
        applicableTier = tier
        break
      }
    }
  }

  if (!applicableTier) {
    applicableTier = tiers[tiers.length - 1]
  }

  // Check eligibility based on action
  const canPerformAction = action === 'cancel' ? applicableTier.can_cancel : applicableTier.can_reschedule

  return {
    booking,
    eligibility: {
      canCancel: applicableTier.can_cancel,
      canReschedule: applicableTier.can_reschedule,
      refundPercentage: applicableTier.refund_percentage,
      rescheduleFee: applicableTier.reschedule_fee,
      hoursUntilBooking: Math.max(0, hoursUntilBooking),
      tier: applicableTier
    },
    canPerformAction
  }
}

/**
 * POST /api/bookings/:id/cancel
 * Cancel a booking with automatic refund calculation
 */
router.post('/:id/cancel', authenticateSupabaseUser, async (req, res) => {
  try {
    const { id: bookingId } = req.params
    const {
      reason,
      refundOption = 'auto',  // 'auto', 'full', 'partial', 'none'
      refundPercentage,       // Optional override for partial
      notifyCustomer = true,
      notifyStaff = true,
      notifyHotel = false     // Only for admin cancellations
    } = req.body

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Cancellation reason is required'
      })
    }

    // Check eligibility
    const { booking, eligibility, canPerformAction } = await checkBookingEligibility(bookingId, 'cancel')

    if (!canPerformAction) {
      return res.status(400).json({
        success: false,
        error: 'Booking cannot be cancelled at this time',
        details: `Only ${eligibility.hoursUntilBooking.toFixed(1)} hours remaining before booking`
      })
    }

    // Calculate refund amount
    let refundAmount = 0
    let finalRefundPercentage = 0

    if (booking.payment_status === 'paid') {
      switch (refundOption) {
        case 'auto':
          finalRefundPercentage = eligibility.refundPercentage
          break
        case 'full':
          finalRefundPercentage = 100
          break
        case 'partial':
          finalRefundPercentage = refundPercentage || 50
          break
        case 'none':
          finalRefundPercentage = 0
          break
        default:
          finalRefundPercentage = eligibility.refundPercentage
      }

      refundAmount = Math.round((booking.final_price * finalRefundPercentage) / 100)
    }

    // Start transaction - cancel booking
    const { error: updateError } = await serviceSupabase
      .from('bookings')
      .update({
        status: 'cancelled',
        payment_status: refundAmount > 0 ? 'refunded' : booking.payment_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)

    if (updateError) {
      throw new Error(`Failed to cancel booking: ${updateError.message}`)
    }

    // Update related jobs to cancelled
    const { error: jobsError } = await serviceSupabase
      .from('jobs')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId)

    if (jobsError) {
      console.warn('Failed to update related jobs:', jobsError.message)
    }

    // Create cancellation record
    const { error: cancellationError } = await serviceSupabase
      .from('booking_cancellations')
      .insert({
        booking_id: bookingId,
        cancelled_by: req.user.id,
        cancelled_at: new Date().toISOString(),
        reason,
        refund_percentage: finalRefundPercentage,
        refund_amount: refundAmount,
        original_amount: booking.final_price
      })

    if (cancellationError) {
      console.warn('Failed to create cancellation record:', cancellationError.message)
    }

    // TODO: Implement notifications based on flags
    // - Send email/SMS to customer if notifyCustomer is true
    // - Send notification to staff if notifyStaff is true
    // - Send notification to hotel if notifyHotel is true

    // TODO: Trigger refund processing if refundAmount > 0
    // - Integration with payment gateway for actual refund
    // - Create refund tracking record

    res.json({
      success: true,
      data: {
        bookingId,
        status: 'cancelled',
        refundAmount,
        refundPercentage: finalRefundPercentage,
        processedAt: new Date().toISOString()
      },
      message: 'Booking cancelled successfully'
    })

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to cancel booking',
      details: error.message
    })
  }
})

/**
 * POST /api/bookings/:id/reschedule
 * Reschedule a booking to new date/time
 */
router.post('/:id/reschedule', authenticateSupabaseUser, async (req, res) => {
  try {
    const { id: bookingId } = req.params
    const { newDate, newTime, reason } = req.body

    if (!newDate || !newTime) {
      return res.status(400).json({
        success: false,
        error: 'New date and time are required'
      })
    }

    // Validate new date/time format and future date
    const newDateTime = new Date(`${newDate} ${newTime}`)
    const now = new Date()

    if (isNaN(newDateTime.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date/time format'
      })
    }

    if (newDateTime <= now) {
      return res.status(400).json({
        success: false,
        error: 'New date/time must be in the future'
      })
    }

    // Check eligibility
    const { booking, eligibility, canPerformAction } = await checkBookingEligibility(bookingId, 'reschedule')

    if (!canPerformAction) {
      return res.status(400).json({
        success: false,
        error: 'Booking cannot be rescheduled at this time',
        details: `Only ${eligibility.hoursUntilBooking.toFixed(1)} hours remaining before booking`
      })
    }

    // Check reschedule count limit
    const { data: rescheduleCount } = await serviceSupabase
      .from('booking_reschedules')
      .select('id', { count: 'exact' })
      .eq('booking_id', bookingId)

    const { data: policySettings } = await serviceSupabase
      .from('cancellation_policy_settings')
      .select('max_reschedules_per_booking')
      .eq('is_active', true)
      .single()

    const maxReschedules = policySettings?.max_reschedules_per_booking || 2

    if (rescheduleCount && rescheduleCount >= maxReschedules) {
      return res.status(400).json({
        success: false,
        error: `Maximum reschedule limit reached (${maxReschedules} times)`
      })
    }

    // TODO: Check staff availability for new date/time
    // TODO: Check service availability for new date/time

    // Update booking
    const { error: updateError } = await serviceSupabase
      .from('bookings')
      .update({
        booking_date: newDate,
        booking_time: newTime,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)

    if (updateError) {
      throw new Error(`Failed to reschedule booking: ${updateError.message}`)
    }

    // Create reschedule record
    const { error: rescheduleError } = await serviceSupabase
      .from('booking_reschedules')
      .insert({
        booking_id: bookingId,
        rescheduled_by: req.user.id,
        rescheduled_at: new Date().toISOString(),
        old_date: booking.booking_date,
        old_time: booking.booking_time,
        new_date: newDate,
        new_time: newTime,
        reason: reason || 'No reason provided',
        reschedule_fee: eligibility.rescheduleFee
      })

    if (rescheduleError) {
      console.warn('Failed to create reschedule record:', rescheduleError.message)
    }

    // Update related jobs (reset staff assignment if needed)
    const { error: jobsError } = await serviceSupabase
      .from('jobs')
      .update({
        scheduled_date: newDate,
        scheduled_time: newTime,
        updated_at: new Date().toISOString()
      })
      .eq('booking_id', bookingId)

    if (jobsError) {
      console.warn('Failed to update related jobs:', jobsError.message)
    }

    // TODO: Implement notifications
    // - Notify customer about reschedule
    // - Notify staff about new schedule
    // - Update calendar/scheduling systems

    res.json({
      success: true,
      data: {
        bookingId,
        oldDateTime: `${booking.booking_date} ${booking.booking_time}`,
        newDateTime: `${newDate} ${newTime}`,
        rescheduleFee: eligibility.rescheduleFee,
        processedAt: new Date().toISOString()
      },
      message: 'Booking rescheduled successfully'
    })

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to reschedule booking',
      details: error.message
    })
  }
})

export default router