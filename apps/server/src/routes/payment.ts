/**
 * Payment API Routes
 * Handles payment operations via Omise
 */

import { Router, Request, Response } from 'express'
import { getSupabaseClient } from '../lib/supabase.js'
import { omiseService } from '../services/omiseService.js'

const router = Router()

/**
 * POST /api/payments/create-charge
 * Create a payment charge
 */
router.post('/create-charge', async (req: Request, res: Response) => {
  try {
    const { booking_id, customer_id, amount, token, payment_method, card_info } = req.body

    // Validate required fields
    if (!booking_id || !customer_id || !amount || !token) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: booking_id, customer_id, amount, token',
      })
    }

    // Get booking details
    const { data: booking, error: bookingError } = await getSupabaseClient()
      .from('bookings')
      .select('*, service:services(*)')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      })
    }

    // Create Omise charge
    const charge = await omiseService.createCharge({
      amount: Math.round(amount * 100), // Convert to satangs
      currency: 'THB',
      token,
      description: `Payment for ${booking.service.name_en || booking.service.name_th} - Booking ${booking.booking_number}`,
      metadata: {
        booking_id,
        customer_id,
        booking_number: booking.booking_number,
      },
      capture: true,
    })

    // Create transaction record in Supabase
    const { data: transaction, error: txnError } = await getSupabaseClient()
      .from('transactions')
      .insert({
        booking_id,
        customer_id,
        amount,
        currency: 'THB',
        payment_method: payment_method || 'credit_card',
        description: `Payment for booking ${booking.booking_number}`,
        status: charge.paid ? 'successful' : 'pending',
        omise_charge_id: charge.id,
        card_brand: charge.card?.brand,
        card_last_digits: charge.card?.lastDigits,
      })
      .select()
      .single()

    if (txnError) {
      console.error('Failed to create transaction record:', txnError)
    }

    // Update booking payment status
    const { error: updateError } = await getSupabaseClient()
      .from('bookings')
      .update({
        payment_status: charge.paid ? 'paid' : 'pending',
      })
      .eq('id', booking_id)

    if (updateError) {
      console.error('Failed to update booking:', updateError)
    }

    return res.json({
      success: true,
      charge_id: charge.id,
      transaction_id: transaction?.id,
      status: charge.status,
      paid: charge.paid,
      amount: charge.amount / 100,
    })
  } catch (error: any) {
    console.error('Create charge error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create charge',
    })
  }
})

/**
 * POST /api/payments/webhooks/omise
 * Handle Omise webhooks
 */
router.post('/webhooks/omise', async (req: Request, res: Response) => {
  try {
    const { key, data } = req.body

    console.log('Received Omise webhook:', key)

    // Verify webhook signature (implement in production)
    // const signature = req.headers['x-omise-signature'] as string
    // if (!omiseService.verifyWebhookSignature(JSON.stringify(req.body), signature)) {
    //   return res.status(401).json({ success: false, error: 'Invalid signature' })
    // }

    // Handle charge.complete event
    if (key === 'charge.complete') {
      const charge = data

      // Get transaction by omise_charge_id
      const { data: transaction, error: txnError } = await getSupabaseClient()
        .from('transactions')
        .select('*')
        .eq('omise_charge_id', charge.id)
        .single()

      if (txnError || !transaction) {
        console.error('Transaction not found for charge:', charge.id)
        return res.json({ received: true })
      }

      // Update transaction status
      const newStatus = charge.paid ? 'successful' : charge.failure_code ? 'failed' : 'pending'

      await getSupabaseClient()
        .from('transactions')
        .update({
          status: newStatus,
          omise_transaction_id: charge.transaction,
        })
        .eq('id', transaction.id)

      // Update booking status
      if (charge.paid) {
        await getSupabaseClient()
          .from('bookings')
          .update({
            payment_status: 'paid',
            status: 'confirmed', // Auto-confirm on successful payment
          })
          .eq('id', transaction.booking_id)
      } else if (charge.failure_code) {
        await getSupabaseClient()
          .from('bookings')
          .update({
            payment_status: 'failed',
          })
          .eq('id', transaction.booking_id)
      }

      console.log(`Updated transaction ${transaction.id} to status: ${newStatus}`)
    }

    return res.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Webhook processing failed',
    })
  }
})

/**
 * GET /api/payments/charge/:id
 * Get charge details
 */
router.get('/charge/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const charge = await omiseService.getCharge(id)

    return res.json({
      success: true,
      charge,
    })
  } catch (error: any) {
    console.error('Get charge error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to retrieve charge',
    })
  }
})

/**
 * POST /api/payments/refund
 * Create a refund
 */
router.post('/refund', async (req: Request, res: Response) => {
  try {
    const { charge_id, amount, reason } = req.body

    if (!charge_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: charge_id',
      })
    }

    // Create refund
    const refund = await omiseService.createRefund(
      charge_id,
      amount ? Math.round(amount * 100) : undefined
    )

    // Update transaction status
    const { data: transaction } = await getSupabaseClient()
      .from('transactions')
      .select('*')
      .eq('omise_charge_id', charge_id)
      .single()

    if (transaction) {
      await getSupabaseClient()
        .from('transactions')
        .update({
          status: 'refunded',
        })
        .eq('id', transaction.id)

      // Update booking
      await getSupabaseClient()
        .from('bookings')
        .update({
          payment_status: 'refunded',
          status: 'cancelled',
        })
        .eq('id', transaction.booking_id)
    }

    return res.json({
      success: true,
      refund,
    })
  } catch (error: any) {
    console.error('Refund error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create refund',
    })
  }
})

export default router
