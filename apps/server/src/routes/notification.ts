/**
 * Notification API Routes
 * Handles booking notifications (job creation + LINE + in-app)
 */

import { Router, Request, Response } from 'express'
import { getSupabaseClient } from '../lib/supabase.js'
import { processBookingConfirmed, processJobCancelled } from '../services/notificationService.js'

const router = Router()

/**
 * POST /api/notifications/booking-confirmed
 * Create job from booking and send notifications to staff + admin
 */
router.post('/booking-confirmed', async (req: Request, res: Response) => {
  try {
    const { booking_id } = req.body

    if (!booking_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: booking_id',
      })
    }

    // Verify booking exists and is confirmed
    const { data: booking, error: bookingError } = await getSupabaseClient()
      .from('bookings')
      .select('id, status, payment_status')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      })
    }

    if (booking.status !== 'confirmed') {
      return res.status(400).json({
        success: false,
        error: `Booking status is '${booking.status}', expected 'confirmed'`,
      })
    }

    // Process: create job + send notifications
    const result = await processBookingConfirmed(booking_id)

    return res.json({
      success: result.success,
      job_ids: result.jobIds,
      jobs_created: result.jobIds.length,
      staff_notified: result.staffNotified,
      admins_notified: result.adminsNotified,
    })
  } catch (error: any) {
    console.error('Notification error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process booking notification',
    })
  }
})

/**
 * POST /api/notifications/job-cancelled
 * Cancel a job, create replacement pending job, and re-notify staff + admin
 */
router.post('/job-cancelled', async (req: Request, res: Response) => {
  try {
    const { job_id, reason, notes } = req.body

    if (!job_id || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: job_id, reason',
      })
    }

    const result = await processJobCancelled(job_id, reason, notes)

    if (!result.success) {
      return res.status(400).json(result)
    }

    return res.json({
      success: true,
      new_job_id: result.newJobId,
      staff_notified: result.staffNotified,
      admins_notified: result.adminsNotified,
    })
  } catch (error: any) {
    console.error('Job cancellation error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process job cancellation',
    })
  }
})

export default router
