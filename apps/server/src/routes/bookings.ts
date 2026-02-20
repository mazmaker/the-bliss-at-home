/**
 * Booking API Routes
 * Handles booking management operations
 */

import { Router, Request, Response } from 'express'
import { getSupabaseClient } from '../lib/supabase.js'
import { refundService } from '../services/refundService.js'
import { sendCancellationNotifications } from '../services/cancellationNotificationService.js'
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
          initiatedBy: body.admin_id || 'system',
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

export default router
