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

/**
 * GET /api/notifications/reminder-settings
 * Get staff reminder preferences
 */
router.get('/reminder-settings', async (req: Request, res: Response) => {
  try {
    const { profile_id } = req.query

    if (!profile_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query: profile_id',
      })
    }

    const { data: staff, error } = await getSupabaseClient()
      .from('staff')
      .select('reminders_enabled, reminder_minutes')
      .eq('profile_id', profile_id as string)
      .single()

    if (error || !staff) {
      // Return defaults if staff record not found
      return res.json({
        enabled: true,
        minutes: [60, 120],
      })
    }

    return res.json({
      enabled: staff.reminders_enabled ?? true,
      minutes: staff.reminder_minutes ?? [60, 120],
    })
  } catch (error: any) {
    console.error('Get reminder settings error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get reminder settings',
    })
  }
})

/**
 * POST /api/notifications/reminder-settings
 * Save staff reminder preferences
 */
router.post('/reminder-settings', async (req: Request, res: Response) => {
  try {
    const { profile_id, enabled, minutes } = req.body

    if (!profile_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: profile_id',
      })
    }

    // Validate minutes array
    const validMinutes = [30, 60, 120, 1440]
    if (minutes !== undefined) {
      if (!Array.isArray(minutes) || !minutes.every((m: number) => validMinutes.includes(m))) {
        return res.status(400).json({
          success: false,
          error: `Invalid minutes values. Allowed: ${validMinutes.join(', ')}`,
        })
      }
    }

    const { error } = await getSupabaseClient()
      .from('staff')
      .update({
        reminders_enabled: enabled ?? true,
        reminder_minutes: minutes ?? [60, 120],
      })
      .eq('profile_id', profile_id)

    if (error) {
      console.error('Update reminder settings error:', error)
      return res.status(500).json({
        success: false,
        error: 'Failed to update reminder settings',
      })
    }

    return res.json({ success: true })
  } catch (error: any) {
    console.error('Save reminder settings error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to save reminder settings',
    })
  }
})

export default router
