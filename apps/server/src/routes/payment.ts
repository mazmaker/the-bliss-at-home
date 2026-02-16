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
    const { booking_id, customer_id, amount, token, omise_card_id, payment_method, card_info } = req.body

    // Validate required fields - need either token (new card) or omise_card_id (saved card)
    if (!booking_id || !customer_id || !amount || (!token && !omise_card_id)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: booking_id, customer_id, amount, and either token or omise_card_id',
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
    const chargeParams: any = {
      amount: Math.round(amount * 100), // Convert to satangs
      currency: 'THB',
      description: `Payment for ${booking.service.name_en || booking.service.name_th} - Booking ${booking.booking_number}`,
      metadata: {
        booking_id,
        customer_id,
        booking_number: booking.booking_number,
      },
      capture: true,
    }

    // Use either token (new card) or customer ID (saved card)
    if (token) {
      chargeParams.token = token
    } else if (omise_card_id) {
      // Get payment method to retrieve omise_customer_id
      const { data: paymentMethod, error: pmError } = await getSupabaseClient()
        .from('payment_methods')
        .select('*')
        .eq('customer_id', customer_id)
        .eq('omise_card_id', omise_card_id)
        .single()

      if (pmError || !paymentMethod) {
        return res.status(404).json({
          success: false,
          error: 'Payment method not found',
        })
      }

      // Use customer ID if available, otherwise fall back to card ID
      if (paymentMethod.omise_customer_id) {
        chargeParams.customerId = paymentMethod.omise_customer_id
        // Optionally specify which card to use
        chargeParams.card = omise_card_id
      } else {
        // Fallback for old payment methods without customer ID
        chargeParams.card = omise_card_id
      }
    }

    const charge = await omiseService.createCharge(chargeParams)

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

    // Update booking payment status and method
    const { error: updateError } = await getSupabaseClient()
      .from('bookings')
      .update({
        payment_status: charge.paid ? 'paid' : 'pending',
        payment_method: payment_method || 'credit_card',
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

/**
 * POST /api/payments/create-source
 * Create a payment source (PromptPay, Internet Banking, Mobile Banking)
 */
router.post('/create-source', async (req: Request, res: Response) => {
  try {
    console.log('📥 Create source request:', { body: req.body })
    const { booking_id, customer_id, amount, source_type, payment_method } = req.body

    // Validate required fields
    if (!booking_id || !customer_id || !amount || !source_type) {
      console.error('❌ Missing required fields')
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: booking_id, customer_id, amount, source_type',
      })
    }

    console.log('✅ Fields validated, fetching booking...')
    // Get booking details
    const { data: booking, error: bookingError } = await getSupabaseClient()
      .from('bookings')
      .select('*, service:services(*)')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      console.error('❌ Booking not found:', bookingError)
      return res.status(404).json({
        success: false,
        error: 'Booking not found',
      })
    }

    console.log('✅ Booking found:', booking.booking_number)
    console.log('💳 Creating payment source:', { source_type, amount: Math.round(amount * 100) })

    // Create payment source
    const source = await omiseService.createSource(
      source_type,
      Math.round(amount * 100), // Convert to satangs
      'THB'
    )

    console.log('✅ Source created:', source.id)
    console.log('💰 Creating charge with source...')

    // Create charge with source
    const charge = await omiseService.createChargeWithSource({
      amount: Math.round(amount * 100),
      currency: 'THB',
      source: source.id,
      description: `Payment for ${booking.service.name_en || booking.service.name_th} - Booking ${booking.booking_number}`,
      metadata: {
        booking_id,
        customer_id,
        booking_number: booking.booking_number,
      },
      returnUri: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/bookings?success=true`,
    })

    console.log('✅ Charge created:', { id: charge.id, status: charge.status, paid: charge.paid })

    // Retrieve source again to get QR code (for PromptPay)
    if (source_type === 'promptpay') {
      console.log('🔄 Retrieving source again to get QR code...')
      const updatedSource = await omiseService.getSource(source.id)
      console.log('📦 Updated source object:', JSON.stringify(updatedSource, null, 2))
      // Update source with QR code
      source.scannable_code = updatedSource.scannable_code
    }

    // Create transaction record
    const { data: transaction, error: txnError } = await getSupabaseClient()
      .from('transactions')
      .insert({
        booking_id,
        customer_id,
        amount,
        currency: 'THB',
        payment_method: payment_method || source_type,
        description: `Payment for booking ${booking.booking_number}`,
        status: charge.paid ? 'successful' : 'pending',
        omise_charge_id: charge.id,
      })
      .select()
      .single()

    if (txnError) {
      console.error('Failed to create transaction record:', txnError)
    }

    // Update booking payment status and method
    await getSupabaseClient()
      .from('bookings')
      .update({
        payment_status: charge.paid ? 'paid' : 'pending',
        payment_method: payment_method || source_type,
      })
      .eq('id', booking_id)

    // Return response based on source type
    const response: any = {
      success: true,
      charge_id: charge.id,
      transaction_id: transaction?.id,
      status: charge.status,
      paid: charge.paid,
    }

    console.log('🔍 Checking for QR code...')
    console.log('  source_type:', source_type)
    console.log('  source.scannable_code:', source.scannable_code ? 'EXISTS' : 'MISSING')

    // Add QR code for PromptPay
    if (source_type === 'promptpay' && source.scannable_code) {
      response.qr_code_url = source.scannable_code.image.download_uri
      console.log('✅ QR code added to response:', response.qr_code_url)
    } else {
      console.log('❌ No QR code in source object!')
    }

    // Add redirect URL for banking
    if (source.authorize_uri) {
      response.authorize_uri = source.authorize_uri
    }

    console.log('📤 Sending response:', JSON.stringify(response, null, 2))
    return res.json(response)
  } catch (error: any) {
    console.error('Create source error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create payment source',
    })
  }
})

/**
 * GET /api/payments/status/:chargeId
 * Get payment status
 */
router.get('/status/:chargeId', async (req: Request, res: Response) => {
  try {
    const { chargeId } = req.params

    // Get charge from Omise
    const charge = await omiseService.getCharge(chargeId)

    // Get transaction from database
    const { data: transaction } = await getSupabaseClient()
      .from('transactions')
      .select('*')
      .eq('omise_charge_id', chargeId)
      .single()

    // Determine status
    let status = 'pending'
    if (charge.paid) {
      status = 'successful'
    } else if (charge.failureCode) {
      status = 'failed'
    }

    // Update transaction and booking if status changed
    if (transaction && transaction.status !== status) {
      await getSupabaseClient()
        .from('transactions')
        .update({ status })
        .eq('id', transaction.id)

      await getSupabaseClient()
        .from('bookings')
        .update({
          payment_status: charge.paid ? 'paid' : charge.failureCode ? 'failed' : 'pending',
          status: charge.paid ? 'confirmed' : transaction.status,
        })
        .eq('id', transaction.booking_id)
    }

    return res.json({
      success: true,
      status,
      charge_id: charge.id,
      paid: charge.paid,
      failure_code: charge.failureCode,
      failure_message: charge.failureMessage,
    })
  } catch (error: any) {
    console.error('Get payment status error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get payment status',
    })
  }
})

/**
 * POST /api/payments/add-payment-method
 * Add a new payment method by creating Omise Customer
 */
router.post('/add-payment-method', async (req: Request, res: Response) => {
  try {
    const { customer_id, card_token, is_default } = req.body

    if (!customer_id || !card_token) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customer_id, card_token',
      })
    }

    // Get customer details for Omise Customer creation
    const { data: customer, error: customerError } = await getSupabaseClient()
      .from('customers')
      .select('*')
      .eq('id', customer_id)
      .single()

    if (customerError || !customer) {
      return res.status(404).json({
        success: false,
        error: 'Customer not found',
      })
    }

    // Create Omise Customer with the card token
    const omiseCustomer = await omiseService.createCustomer({
      email: customer.email,
      description: `Customer: ${customer.first_name} ${customer.last_name}`,
      card: card_token,
      metadata: {
        customer_id: customer.id,
      },
    })

    console.log('✅ Omise Customer created:', omiseCustomer.id)

    // Get the card details from the customer object
    const defaultCard = omiseCustomer.cards[0]

    if (!defaultCard) {
      return res.status(400).json({
        success: false,
        error: 'No card found in Omise Customer',
      })
    }

    // If this should be default, unset other defaults first
    if (is_default) {
      await getSupabaseClient()
        .from('payment_methods')
        .update({ is_default: false })
        .eq('customer_id', customer_id)
    }

    // Save payment method to database
    const { data: paymentMethod, error: pmError } = await getSupabaseClient()
      .from('payment_methods')
      .insert({
        customer_id,
        omise_customer_id: omiseCustomer.id,
        omise_card_id: defaultCard.id,
        card_brand: defaultCard.brand,
        card_last_digits: defaultCard.last_digits,
        card_expiry_month: defaultCard.expiration_month,
        card_expiry_year: defaultCard.expiration_year,
        cardholder_name: defaultCard.name,
        is_default: is_default || false,
        is_active: true,
      })
      .select()
      .single()

    if (pmError) {
      console.error('Failed to save payment method:', pmError)
      return res.status(500).json({
        success: false,
        error: 'Failed to save payment method',
      })
    }

    return res.json({
      success: true,
      payment_method: paymentMethod,
    })
  } catch (error: any) {
    console.error('Add payment method error:', error)
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to add payment method',
    })
  }
})

export default router
