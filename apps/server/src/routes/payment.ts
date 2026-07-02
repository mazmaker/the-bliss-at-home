/**
 * Payment API Routes
 * Handles payment operations via Omise
 */

import { Router, Request, Response } from 'express'
import { getSupabaseClient } from '../lib/supabase.js'
import { omiseService } from '../services/omiseService.js'
import { processBookingConfirmed } from '../services/notificationService.js'
import { sendReceiptEmailForTransaction, sendCreditNoteEmailForRefund } from './receipts.js'
import { paymentAuthGuard } from '../middleware/auth.js'
import { getEnabledPaymentChannels, getPaymentMode, getManualQrConfig, sourceTypeToChannel, DEFAULT_ENABLED_CHANNELS, type PaymentChannel } from '../lib/paymentChannels.js'

const router = Router()

/**
 * Shared helper: apply a confirmed extension payment to the booking.
 * Safe to call from both webhook and polling — idempotent via extension_count check.
 */
export async function applyExtensionAfterPayment(transactionId: string): Promise<void> {
  const supabase = getSupabaseClient()

  const { data: transaction } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single()

  if (!transaction || transaction.metadata?.is_extension !== true) return

  const meta = transaction.metadata || {}

  // Idempotency: if booking.extension_count already exceeds the pre-payment count,
  // the extension was already applied (by webhook or a prior poll). Skip.
  const { data: booking } = await supabase
    .from('bookings')
    .select('extension_count')
    .eq('id', transaction.booking_id)
    .single()

  const alreadyApplied = (booking?.extension_count || 0) > (meta.current_extension_count || 0)
  if (alreadyApplied) {
    console.log(`[applyExtension] Already applied for transaction ${transactionId}, skipping`)
    return
  }

  console.log(`[applyExtension] Applying extension for transaction ${transactionId}`)

  try {
    const { data: extensionService, error: extErr } = await supabase
      .from('booking_services')
      .insert({
        booking_id: transaction.booking_id,
        service_id: meta.service_id,
        duration: meta.extension_duration,
        price: meta.extension_price,
        recipient_index: meta.recipient_index ?? 0,
        recipient_name: meta.recipient_name || null,
        sort_order: meta.sort_order ?? 1,
        is_extension: true,
        extended_at: new Date().toISOString(),
        original_booking_service_id: meta.original_booking_service_id || null
      })
      .select('id')
      .single()

    if (extErr) {
      console.error('[applyExtension] Failed to create extension booking_service:', extErr)
      return
    }

    const newTotalDuration = (meta.current_total_duration || 0) + (meta.extension_duration || 0)
    const newTotalPrice    = (meta.current_total_price || 0) + (meta.extension_price || 0)
    const newExtensionCount = (meta.current_extension_count || 0) + 1

    // Calculate extension staff earnings using same logic as regular bookings
    let extensionStaffEarnings = 0
    // Resolve service_id: use metadata first, fallback to booking_services table
    let resolvedServiceId = meta.service_id || null
    if (!resolvedServiceId) {
      const { data: bs } = await supabase
        .from('booking_services')
        .select('service_id')
        .eq('booking_id', transaction.booking_id)
        .eq('is_extension', false)
        .order('sort_order', { ascending: true })
        .limit(1)
        .single()
      resolvedServiceId = bs?.service_id || null
      if (!resolvedServiceId) {
        // Last fallback: bookings.service_id
        const { data: bk } = await supabase
          .from('bookings')
          .select('service_id')
          .eq('id', transaction.booking_id)
          .single()
        resolvedServiceId = bk?.service_id || null
      }
    }

    if (resolvedServiceId) {
      const { data: svc } = await supabase
        .from('services')
        .select('use_fixed_rate, staff_earning_60, staff_earning_90, staff_earning_120, staff_commission_rate')
        .eq('id', resolvedServiceId)
        .single()

      if (svc) {
        const dur = meta.extension_duration || 0
        if (svc.use_fixed_rate) {
          const fixed = dur === 60 ? svc.staff_earning_60
            : dur === 120 ? svc.staff_earning_120
            : svc.staff_earning_90
          extensionStaffEarnings = Math.round(Number(fixed) || 0)
        } else {
          const rate = Number(svc.staff_commission_rate) || 0
          extensionStaffEarnings = Math.round((meta.extension_price || 0) * rate)
        }
        console.log(`[applyExtension] Service ${resolvedServiceId}: useFixedRate=${svc.use_fixed_rate}, dur=${dur}min, earnings=฿${extensionStaffEarnings}`)
      }
    }

    // Recalculate total_staff_earnings from scratch using ALL extensions
    // (not additive — avoids compounding errors from stale DB values)
    const [{ data: bookingJobs }, { data: allExtensions }] = await Promise.all([
      supabase
        .from('jobs')
        .select('id, staff_earnings, duration_minutes, job_index')
        .eq('booking_id', transaction.booking_id)
        .not('status', 'eq', 'cancelled'),
      supabase
        .from('booking_services')
        .select('duration, price, recipient_index')
        .eq('booking_id', transaction.booking_id)
        .eq('is_extension', true)
    ])

    if (bookingJobs && bookingJobs.length > 0) {
      // Resolve the service config once for the earnings formula
      let svcFull: any = null
      if (resolvedServiceId) {
        const { data } = await supabase
          .from('services')
          .select('use_fixed_rate, staff_earning_60, staff_earning_90, staff_earning_120, staff_commission_rate')
          .eq('id', resolvedServiceId)
          .single()
        svcFull = data
      }
      const extEarningFor = (dur: number, price: number) => {
        if (!svcFull) return 0
        return svcFull.use_fixed_rate
          ? Math.round(Number(dur === 60 ? svcFull.staff_earning_60 : dur === 120 ? svcFull.staff_earning_120 : svcFull.staff_earning_90) || 0)
          : Math.round((price || 0) * (Number(svcFull.staff_commission_rate) || 0))
      }

      // COUPLE bookings have one job PER RECIPIENT; each extension row carries its recipient_index.
      // An extension must ONLY bump the job whose recipient it is (job.job_index-1 === recipient_index)
      // — applying the whole-booking extension total to EVERY job would inflate the un-extended
      // recipient's total_duration_minutes (blocking their complete-gate) and OVERPAY their earnings.
      // Single bookings (1 job) take all extensions.
      const isCouple = bookingJobs.length > 1
      for (const job of bookingJobs) {
        const recipientIndex = (job.job_index ?? 1) - 1
        const jobExts = (allExtensions || []).filter((ext: any) =>
          !isCouple || (ext.recipient_index ?? 0) === recipientIndex)
        let jobExtDuration = 0
        let jobExtEarnings = 0
        for (const ext of jobExts) {
          jobExtDuration += ext.duration || 0
          jobExtEarnings += extEarningFor(ext.duration || 0, ext.price || 0)
        }
        const originalEarnings = Number(job.staff_earnings ?? 0)
        const originalDuration = Number(job.duration_minutes ?? 0)
        await supabase
          .from('jobs')
          .update({
            total_staff_earnings: originalEarnings + jobExtEarnings,
            total_duration_minutes: originalDuration + jobExtDuration,
          })
          .eq('id', job.id)
      }
      console.log(`[applyExtension] Jobs recalculated per-recipient for booking ${transaction.booking_id} (${bookingJobs.length} job(s))`)
    }

    await supabase
      .from('bookings')
      .update({
        final_price: newTotalPrice,
        extension_count: newExtensionCount,
        last_extended_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.booking_id)

    if (meta.promotion_id && meta.discount_amount > 0) {
      await supabase
        .from('booking_promotions')
        .insert({
          booking_id: transaction.booking_id,
          promotion_id: meta.promotion_id,
          discount_amount: meta.discount_amount,
          applied_at: new Date().toISOString(),
          applied_by: 'customer',
          booking_type: 'extension'
        })
    }

    let estimatedEndTimeStr = ''
    if (meta.booking_date && meta.booking_time) {
      const bookingDateTime = new Date(`${meta.booking_date}T${meta.booking_time}`)
      const estimatedEnd = new Date(bookingDateTime.getTime() + (newTotalDuration * 60 * 1000))
      estimatedEndTimeStr = estimatedEnd.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    }

    if (Array.isArray(meta.staff_profiles) && meta.staff_profiles.length > 0) {
      const staffNotifications = meta.staff_profiles.map((staff: { profile_id: string; full_name: string }) => ({
        user_id: staff.profile_id,
        type: 'booking_extended',
        title: 'การจองขยายเวลา',
        message: `ลูกค้า ${meta.customer_name || ''} ขยายเวลาบริการเพิ่ม ${meta.extension_duration} นาที${estimatedEndTimeStr ? ` เวลาสิ้นสุดใหม่: ${estimatedEndTimeStr}` : ''}`,
        data: {
          booking_id: transaction.booking_id,
          additional_duration: meta.extension_duration,
          extension_count: newExtensionCount
        },
        is_read: false
      }))
      await supabase.from('notifications').insert(staffNotifications)
      console.log(`[applyExtension] Staff notifications sent: ${staffNotifications.length}`)
    }

    await supabase.from('notifications').insert({
      user_id: meta.customer_profile_id || transaction.customer_id,
      type: 'extension_payment_completed',
      title: 'ชำระเงินการขยายเวลาสำเร็จ',
      message: `การชำระเงินสำหรับการขยายเวลา ${meta.extension_duration || 0} นาทีเสร็จสมบูรณ์ จำนวนเงิน ฿${transaction.amount.toLocaleString()}`,
      data: {
        booking_id: transaction.booking_id,
        transaction_id: transaction.id,
        extension_duration: meta.extension_duration,
        amount: transaction.amount
      },
      is_read: false
    })

    try {
      await sendReceiptEmailForTransaction(transaction.id)
    } catch (emailErr) {
      console.error('⚠️ Extension receipt email failed (non-blocking):', emailErr)
    }

    console.log(`[applyExtension] Done: +${meta.extension_duration}min, booking_service ${extensionService?.id}`)
  } catch (err) {
    console.error('[applyExtension] Failed:', err)
  }
}

/**
 * GET /api/payments/enabled-channels
 * Returns the admin-controlled allowlist of enabled payment channels (R1) PLUS the
 * payment mode (omise | manual_qr) and, when manual_qr, the admin-uploaded manual-QR
 * config (payment QR + LINE OA QR/ID). Read by the customer booking wizard / pay-later
 * page / extension page to decide whether to render Omise channels or the manual screen.
 */
router.get('/enabled-channels', async (_req: Request, res: Response) => {
  try {
    const [channels, payment_mode] = await Promise.all([
      getEnabledPaymentChannels(),
      getPaymentMode(),
    ])
    const manual_qr = payment_mode === 'manual_qr' ? await getManualQrConfig() : null
    return res.json({ success: true, channels, payment_mode, manual_qr })
  } catch (error: any) {
    console.error('Get enabled channels error:', error)
    // Fail safe → still return a usable channel + default mode so the wizard can render.
    return res.json({ success: true, channels: DEFAULT_ENABLED_CHANNELS, payment_mode: 'omise', manual_qr: null })
  }
})

/**
 * POST /api/payments/create-charge
 * Create a payment charge
 */
router.post('/create-charge', paymentAuthGuard, async (req: Request, res: Response) => {
  try {
    // [manual-QR] gate: in manual_qr mode the customer pays off-platform (QR + LINE slip) → no Omise
    // charge here. Reject to prevent bypass + avoid getOmiseClient throwing on a no-Omise-key deploy.
    if (await getPaymentMode() === 'manual_qr') {
      return res.status(410).json({ success: false, error: 'Payment is in manual-QR mode; Omise charges are disabled', code: 'PAYMENT_MODE_MANUAL_QR' })
    }
    const { booking_id, customer_id, amount, token, omise_card_id, payment_method, card_info } = req.body

    // Validate required fields - need either token (new card) or omise_card_id (saved card)
    if (!booking_id || !customer_id || !amount || (!token && !omise_card_id)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: booking_id, customer_id, amount, and either token or omise_card_id',
      })
    }

    // [R1] Channel allowlist: card charges only when 'credit_card' is enabled.
    const enabledChannels = await getEnabledPaymentChannels()
    if (!enabledChannels.includes('credit_card')) {
      return res.status(410).json({
        success: false,
        error: 'Card payments are not currently enabled',
        code: 'CHANNEL_DISABLED',
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

    // [F-4] Ownership: the booking must belong to the caller (hotel bookings have
    // customer_id = NULL and must never be charged through this customer route)
    if (!booking.customer_id || booking.customer_id !== customer_id) {
      return res.status(403).json({
        success: false,
        error: 'Booking does not belong to this customer',
      })
    }

    // [F-4] Amount integrity: never trust the client amount — use the booking's
    // server-side final_price, and reject a tampered amount.
    const serverAmount = Number(booking.final_price)
    if (!(serverAmount > 0)) {
      return res.status(400).json({
        success: false,
        error: 'Booking has no payable amount',
      })
    }
    if (Math.round(Number(amount) * 100) !== Math.round(serverAmount * 100)) {
      return res.status(400).json({
        success: false,
        error: `Amount mismatch: expected ${serverAmount}, got ${amount}`,
      })
    }

    // [F-5] Idempotency: if this booking already has a successful charge, return it
    // instead of charging again (guards double-submit / client retries).
    const { data: existingTxn } = await getSupabaseClient()
      .from('transactions')
      .select('id, omise_charge_id, amount, status')
      .eq('booking_id', booking_id)
      .eq('status', 'successful')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existingTxn) {
      console.log(`♻️ Idempotent create-charge: booking ${booking_id} already paid (${existingTxn.omise_charge_id})`)
      return res.json({
        success: true,
        charge_id: existingTxn.omise_charge_id,
        transaction_id: existingTxn.id,
        status: 'successful',
        paid: true,
        amount: Number(existingTxn.amount),
        idempotent: true,
      })
    }

    // Create Omise charge (always use the server-trusted amount)
    const chargeParams: any = {
      amount: Math.round(serverAmount * 100), // Convert to satangs (server-trusted)
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

    // [F-8] Decline handling: if Omise did NOT actually capture the payment, do not
    // report success — record the failed attempt and surface the failure so the client
    // cannot show a false "payment success".
    if (!charge.paid) {
      await getSupabaseClient()
        .from('transactions')
        .insert({
          booking_id,
          customer_id,
          amount: serverAmount,
          currency: 'THB',
          payment_method: payment_method || 'credit_card',
          description: `Failed payment for booking ${booking.booking_number}`,
          status: 'failed',
          omise_charge_id: charge.id,
          card_brand: charge.card?.brand,
          card_last_digits: charge.card?.lastDigits,
        })
      await getSupabaseClient()
        .from('bookings')
        .update({ payment_status: 'failed' })
        .eq('id', booking_id)

      return res.status(402).json({
        success: false,
        paid: false,
        charge_id: charge.id,
        status: charge.status,
        failure_code: (charge as any).failureCode || null,
        failure_message: (charge as any).failureMessage || 'Payment was not completed',
        error: 'Payment was declined or not completed',
      })
    }

    // Create transaction record in Supabase (charge succeeded)
    const { data: transaction, error: txnError } = await getSupabaseClient()
      .from('transactions')
      .insert({
        booking_id,
        customer_id,
        amount: serverAmount,
        currency: 'THB',
        payment_method: payment_method || 'credit_card',
        description: `Payment for booking ${booking.booking_number}`,
        status: 'successful',
        omise_charge_id: charge.id,
        card_brand: charge.card?.brand,
        card_last_digits: charge.card?.lastDigits,
      })
      .select()
      .single()

    // [F-6] If money was captured but the transaction row cannot be persisted, COMPENSATE
    // by refunding the Omise charge — never silently keep money with no DB record (which
    // would also make a later refund impossible).
    if (txnError || !transaction) {
      console.error('Failed to create transaction record:', txnError)
      try {
        await omiseService.createRefund(charge.id)
        console.error(`⚠️ Compensating refund issued for charge ${charge.id} after transaction INSERT failure`)
      } catch (refundErr) {
        console.error(`🚨 CRITICAL: charge ${charge.id} captured but transaction INSERT and compensating refund BOTH failed`, refundErr)
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to record transaction; the payment was refunded. Please try again.',
        charge_id: charge.id,
      })
    }

    // Update booking → paid + confirmed
    const { error: updateError } = await getSupabaseClient()
      .from('bookings')
      .update({
        payment_status: 'paid',
        payment_method: payment_method || 'credit_card',
        status: 'confirmed',
      })
      .eq('id', booking_id)

    if (updateError) {
      console.error('Failed to update booking:', updateError)
      return res.status(500).json({
        success: false,
        error: 'Failed to update booking status',
      })
    }

    // Paid: create job + notify
    try {
      const notifResult = await processBookingConfirmed(booking_id)
      console.log(`📋 Charge notification result:`, notifResult)
    } catch (notifError) {
      console.error('⚠️ Notification failed (non-blocking):', notifError)
    }

    // Send receipt email - must await to prevent Vercel serverless from terminating early
    if (transaction?.id) {
      try {
        await sendReceiptEmailForTransaction(transaction.id)
      } catch (emailErr) {
        console.error('⚠️ Receipt email failed (non-blocking):', emailErr)
      }
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
 * Handle Omise webhooks for charge and refund events
 */
router.post('/webhooks/omise', async (req: Request, res: Response) => {
  try {
    // [F-3] Verify webhook signature FIRST — reject forged webhooks (fail-closed).
    const signature = req.headers['x-omise-signature'] as string
    if (!omiseService.verifyWebhookSignature(JSON.stringify(req.body), signature)) {
      return res.status(401).json({ success: false, error: 'Invalid signature' })
    }

    const { key, data } = req.body

    console.log('📥 Received Omise webhook:', key)
    console.log('📦 Webhook data:', JSON.stringify(data, null, 2))

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

      // Check if this is an extension payment
      const isExtensionPayment = transaction.metadata?.is_extension === true

      // Update booking status
      if (charge.paid) {
        if (isExtensionPayment) {
          console.log(`💳 Extension payment completed for booking ${transaction.booking_id}`)
          await applyExtensionAfterPayment(transaction.id)
        } else {
          // Regular booking payment - preserve the payment_method from transaction
          await getSupabaseClient()
            .from('bookings')
            .update({
              payment_status: 'paid',
              status: 'confirmed', // Auto-confirm on successful payment
              payment_method: transaction.payment_method || 'credit_card', // Preserve payment method
            })
            .eq('id', transaction.booking_id)

          // Create job + send notifications (non-blocking, don't fail webhook)
          try {
            const notifResult = await processBookingConfirmed(transaction.booking_id)
            console.log(`📋 Webhook notification result:`, notifResult)
          } catch (notifError) {
            console.error('⚠️ Notification failed (non-blocking):', notifError)
          }

          // Send receipt email - must await to prevent Vercel serverless from terminating early
          try {
            await sendReceiptEmailForTransaction(transaction.id)
          } catch (emailErr) {
            console.error('⚠️ Receipt email failed (non-blocking):', emailErr)
          }
        }
      } else if (charge.failure_code) {
        if (isExtensionPayment) {
          // Extension payment failed - send notification but don't change booking status
          console.log(`❌ Extension payment failed for booking ${transaction.booking_id}:`, charge.failure_code)

          try {
            await getSupabaseClient()
              .from('notifications')
              .insert({
                user_id: transaction.customer_id,
                type: 'extension_payment_failed',
                title: 'การชำระเงินการขยายเวลาล้มเหลว',
                message: `การชำระเงินสำหรับการขยายเวลาล้มเหลว กรุณาลองชำระเงินอีกครั้ง หรือติดต่อฝ่ายสนับสนุน`,
                data: {
                  booking_id: transaction.booking_id,
                  transaction_id: transaction.id,
                  failure_code: charge.failure_code,
                  failure_message: charge.failure_message
                },
                is_read: false
              })

            console.log('📱 Extension payment failure notification sent')
          } catch (notifError) {
            console.error('⚠️ Extension failure notification failed:', notifError)
          }

        } else {
          // Regular booking payment failed
          await getSupabaseClient()
            .from('bookings')
            .update({
              payment_status: 'failed',
            })
            .eq('id', transaction.booking_id)
        }
      }

      console.log(`✅ Updated transaction ${transaction.id} to status: ${newStatus}`)
    }

    // Handle refund.create event - refund initiated
    if (key === 'refund.create') {
      const refund = data
      console.log('💰 Refund created:', refund.id, 'Amount:', refund.amount / 100, 'THB')

      // Find refund transaction by omise_refund_id
      const { data: refundTxn, error: refundError } = await getSupabaseClient()
        .from('refund_transactions')
        .select('*, booking:bookings(*)')
        .eq('omise_refund_id', refund.id)
        .single()

      if (refundError || !refundTxn) {
        // Try to find by charge ID if refund_transactions doesn't have the refund ID yet
        const { data: transaction } = await getSupabaseClient()
          .from('transactions')
          .select('booking_id')
          .eq('omise_charge_id', refund.charge)
          .single()

        if (transaction) {
          // Update booking to show refund is processing
          await getSupabaseClient()
            .from('bookings')
            .update({
              refund_status: 'processing',
            })
            .eq('id', transaction.booking_id)

          console.log(`💳 Refund processing started for booking via charge: ${refund.charge}`)
        } else {
          console.warn('⚠️ No refund_transaction or transaction found for refund:', refund.id)
        }
        return res.json({ received: true })
      }

      // Update refund transaction status to processing
      await getSupabaseClient()
        .from('refund_transactions')
        .update({
          status: 'processing',
        })
        .eq('id', refundTxn.id)

      // Update booking refund status
      await getSupabaseClient()
        .from('bookings')
        .update({
          refund_status: 'processing',
        })
        .eq('id', refundTxn.booking_id)

      console.log(`💳 Refund ${refund.id} is processing for booking ${refundTxn.booking_id}`)
    }

    // Handle refund.complete event - refund completed (success or failure)
    if (key === 'refund.complete') {
      const refund = data
      const isSuccess = refund.status === 'closed' // 'closed' = successful refund in Omise
      const refundStatus = isSuccess ? 'completed' : 'failed'

      console.log(`💰 Refund ${refund.id} completed:`, refundStatus, 'Amount:', refund.amount / 100, 'THB')

      // Find refund transaction by omise_refund_id
      const { data: refundTxn, error: refundError } = await getSupabaseClient()
        .from('refund_transactions')
        .select('*, booking:bookings(*)')
        .eq('omise_refund_id', refund.id)
        .single()

      if (refundError || !refundTxn) {
        // Try to find by charge ID
        const { data: transaction } = await getSupabaseClient()
          .from('transactions')
          .select('id, booking_id')
          .eq('omise_charge_id', refund.charge)
          .single()

        if (transaction) {
          // Find or create refund_transaction record
          const { data: existingRefundTxn } = await getSupabaseClient()
            .from('refund_transactions')
            .select('id')
            .eq('booking_id', transaction.booking_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (existingRefundTxn) {
            // Update existing refund transaction
            await getSupabaseClient()
              .from('refund_transactions')
              .update({
                status: refundStatus,
                omise_refund_id: refund.id,
                completed_at: isSuccess ? new Date().toISOString() : null,
                error_message: !isSuccess ? (refund.failure_code || 'Refund failed') : null,
              })
              .eq('id', existingRefundTxn.id)
          } else {
            // Create new refund transaction record from webhook
            await getSupabaseClient()
              .from('refund_transactions')
              .insert({
                booking_id: transaction.booking_id,
                payment_transaction_id: transaction.id,
                refund_amount: refund.amount / 100,
                status: refundStatus,
                omise_refund_id: refund.id,
                reason: 'Refund processed via Omise',
                initiated_by: 'system',
                completed_at: isSuccess ? new Date().toISOString() : null,
              })
          }

          // Update booking status
          await getSupabaseClient()
            .from('bookings')
            .update({
              payment_status: isSuccess ? 'refunded' : 'paid',
              refund_status: refundStatus,
              refund_amount: isSuccess ? refund.amount / 100 : null,
            })
            .eq('id', transaction.booking_id)

          // Update original transaction
          if (isSuccess) {
            await getSupabaseClient()
              .from('transactions')
              .update({
                status: 'refunded',
                refunded_at: new Date().toISOString(),
              })
              .eq('id', transaction.id)
          }

          // Send credit note email if refund was successful (non-blocking)
          if (isSuccess && existingRefundTxn) {
            sendCreditNoteEmailForRefund(existingRefundTxn.id).catch(emailErr => {
              console.error('⚠️ Credit note email failed (non-blocking):', emailErr)
            })
          }

          console.log(`✅ Refund ${refund.id} ${refundStatus} for booking ${transaction.booking_id}`)
        } else {
          console.warn('⚠️ No transaction found for refund:', refund.id, 'charge:', refund.charge)
        }
        return res.json({ received: true })
      }

      // Update refund transaction record
      await getSupabaseClient()
        .from('refund_transactions')
        .update({
          status: refundStatus,
          completed_at: isSuccess ? new Date().toISOString() : null,
          error_message: !isSuccess ? (refund.failure_code || 'Refund failed') : null,
        })
        .eq('id', refundTxn.id)

      // Update booking payment and refund status
      await getSupabaseClient()
        .from('bookings')
        .update({
          payment_status: isSuccess ? 'refunded' : 'paid',
          refund_status: refundStatus,
        })
        .eq('id', refundTxn.booking_id)

      // Update original transaction status if refund successful
      if (isSuccess && refundTxn.payment_transaction_id) {
        await getSupabaseClient()
          .from('transactions')
          .update({
            status: 'refunded',
            refunded_at: new Date().toISOString(),
          })
          .eq('id', refundTxn.payment_transaction_id)
      }

      // Send notification to customer about refund status (non-blocking)
      try {
        // Get booking with customer details for notification
        const { data: booking } = await getSupabaseClient()
          .from('bookings')
          .select('*, customer:customers(*)')
          .eq('id', refundTxn.booking_id)
          .single()

        if (booking) {
          // Create in-app notification for customer
          await getSupabaseClient()
            .from('notifications')
            .insert({
              user_id: booking.customer?.profile_id,
              type: isSuccess ? 'refund_completed' : 'refund_failed',
              title: isSuccess ? 'คืนเงินสำเร็จ' : 'การคืนเงินล้มเหลว',
              message: isSuccess
                ? `คืนเงินจำนวน ฿${(refund.amount / 100).toLocaleString()} สำหรับการจอง ${booking.booking_number} สำเร็จแล้ว เงินจะเข้าบัญชีภายใน 5-10 วันทำการ`
                : `การคืนเงินสำหรับการจอง ${booking.booking_number} ล้มเหลว กรุณาติดต่อฝ่ายบริการลูกค้า`,
              data: {
                booking_id: booking.id,
                booking_number: booking.booking_number,
                refund_amount: refund.amount / 100,
                refund_status: refundStatus,
              },
            })

          console.log(`📬 Refund notification sent to customer for booking ${booking.booking_number}`)
        }
      } catch (notifError) {
        console.error('⚠️ Refund notification failed (non-blocking):', notifError)
      }

      // Send credit note email if refund was successful (non-blocking)
      if (isSuccess) {
        sendCreditNoteEmailForRefund(refundTxn.id).catch(emailErr => {
          console.error('⚠️ Credit note email failed (non-blocking):', emailErr)
        })
      }

      console.log(`✅ Refund ${refund.id} ${refundStatus} - updated all records`)
    }

    return res.json({ received: true })
  } catch (error: any) {
    console.error('❌ Webhook error:', error)
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
router.post('/refund', paymentAuthGuard, async (req: Request, res: Response) => {
  try {
    const { charge_id, amount, reason } = req.body

    if (!charge_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: charge_id',
      })
    }

    // [F-1] Idempotency guard: look up the charge's transaction FIRST and refuse to
    // refund again if it is already refunded or a refund is already in flight.
    const { data: transaction } = await getSupabaseClient()
      .from('transactions')
      .select('*')
      .eq('omise_charge_id', charge_id)
      .single()

    if (transaction) {
      if (transaction.status === 'refunded') {
        return res.status(409).json({
          success: false,
          error: 'This charge has already been refunded',
        })
      }
      const { data: existingRefund } = await getSupabaseClient()
        .from('refund_transactions')
        .select('id, status')
        .eq('payment_transaction_id', transaction.id)
        .in('status', ['processing', 'completed'])
        .limit(1)
        .maybeSingle()
      if (existingRefund) {
        return res.status(409).json({
          success: false,
          error: `A refund is already ${existingRefund.status} for this charge`,
        })
      }
    }

    // Create refund
    const refund = await omiseService.createRefund(
      charge_id,
      amount ? Math.round(amount * 100) : undefined
    )

    // Update transaction + booking
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
router.post('/create-source', paymentAuthGuard, async (req: Request, res: Response) => {
  try {
    // [manual-QR] gate: in manual_qr mode the customer pays off-platform (QR + LINE slip) → no Omise source here.
    if (await getPaymentMode() === 'manual_qr') {
      return res.status(410).json({ success: false, error: 'Payment is in manual-QR mode; Omise sources are disabled', code: 'PAYMENT_MODE_MANUAL_QR' })
    }
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

    // [R1] Channel allowlist: reject a source_type whose channel is not enabled.
    const channel = sourceTypeToChannel(source_type)
    const enabledChannels = await getEnabledPaymentChannels()
    if (!enabledChannels.includes(channel as PaymentChannel)) {
      console.warn(`🚫 Rejected create-source: channel '${channel}' (source_type '${source_type}') not in`, enabledChannels)
      return res.status(400).json({
        success: false,
        error: `Payment channel '${channel}' is not currently enabled`,
        code: 'CHANNEL_DISABLED',
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

    // [F-6] If the transaction row cannot be persisted, do not proceed. If the source
    // charge was already captured, compensate by refunding; a pending source with no DB
    // record must fail loudly rather than be orphaned (the webhook would never match it).
    if (txnError || !transaction) {
      console.error('Failed to create transaction record:', txnError)
      if (charge.paid) {
        try {
          await omiseService.createRefund(charge.id)
          console.error(`⚠️ Compensating refund issued for source charge ${charge.id} after INSERT failure`)
        } catch (refundErr) {
          console.error(`🚨 CRITICAL: source charge ${charge.id} captured but INSERT and refund BOTH failed`, refundErr)
        }
      }
      return res.status(500).json({
        success: false,
        error: 'Failed to record transaction. Please try again.',
        charge_id: charge.id,
      })
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

      const isExtensionTx = transaction.metadata?.is_extension === true
      await getSupabaseClient()
        .from('bookings')
        .update({
          payment_status: charge.paid ? 'paid' : charge.failureCode ? 'failed' : 'pending',
          // Don't change booking status for extensions — booking stays in_progress
          ...(isExtensionTx ? {} : { status: charge.paid ? 'confirmed' : transaction.status }),
          payment_method: transaction.payment_method || 'credit_card',
        })
        .eq('id', transaction.booking_id)

      // If newly paid, apply extension or confirm booking
      if (charge.paid && transaction.status !== 'successful') {
        if (transaction.metadata?.is_extension === true) {
          // Extension payment: apply via shared helper (idempotent)
          try {
            await applyExtensionAfterPayment(transaction.id)
          } catch (extErr) {
            console.error('⚠️ Extension apply failed (non-blocking):', extErr)
          }
        } else {
          // Regular booking: create job + notify
          try {
            const notifResult = await processBookingConfirmed(transaction.booking_id)
            console.log(`📋 Status poll notification result:`, notifResult)
          } catch (notifError) {
            console.error('⚠️ Notification failed (non-blocking):', notifError)
          }

          try {
            await sendReceiptEmailForTransaction(transaction.id)
          } catch (emailErr) {
            console.error('⚠️ Receipt email failed (non-blocking):', emailErr)
          }
        }
      }
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
    // [manual-QR] gate: manual_qr mode has no Omise vault → block saving a card.
    if (await getPaymentMode() === 'manual_qr') {
      return res.status(410).json({ success: false, error: 'Payment is in manual-QR mode; card vault is disabled', code: 'PAYMENT_MODE_MANUAL_QR' })
    }
    const { customer_id, card_token, is_default } = req.body

    if (!customer_id || !card_token) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customer_id, card_token',
      })
    }

    // [R1] Channel allowlist: only allow saving a card when 'credit_card' is enabled.
    const enabledChannels = await getEnabledPaymentChannels()
    if (!enabledChannels.includes('credit_card')) {
      return res.status(410).json({
        success: false,
        error: 'Card payments are not currently enabled',
        code: 'CHANNEL_DISABLED',
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
