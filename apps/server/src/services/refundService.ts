/**
 * Refund Service
 * Handles refund calculations and processing with Omise
 */

import { getSupabaseClient } from '../lib/supabase.js'
import { omiseService } from './omiseService.js'
import type {
  RefundStatus,
  RefundOption,
  RefundInfo,
} from '../types/cancellation.js'

// ============================================
// Types
// ============================================

export interface RefundCalculation {
  eligible: boolean
  originalAmount: number
  refundAmount: number
  refundPercentage: number
  reason?: string
  hoursUntilBooking?: number
}

export interface ProcessRefundParams {
  bookingId: string
  transactionId?: string
  refundOption: RefundOption
  refundPercentage?: number // For partial refunds
  reason: string
  initiatedBy: string
}

export interface ProcessRefundResult {
  success: boolean
  refundTransactionId?: string
  refundAmount?: number
  omiseRefundId?: string
  error?: string
}

// ============================================
// Cancellation Policy Configuration
// ============================================

/**
 * Cancellation policy rules
 * - More than 24 hours before booking: Full refund (100%)
 * - 12-24 hours before booking: Partial refund (50%)
 * - Less than 12 hours: No refund (0%)
 */
const CANCELLATION_POLICY = {
  FULL_REFUND_HOURS: 24,      // Hours before booking for 100% refund
  PARTIAL_REFUND_HOURS: 12,   // Hours before booking for 50% refund
  PARTIAL_REFUND_PERCENTAGE: 50,
  NO_REFUND_HOURS: 0,
}

// ============================================
// Refund Calculation
// ============================================

/**
 * Calculate refund amount based on cancellation policy
 */
export async function calculateRefund(bookingId: string): Promise<RefundCalculation> {
  const supabase = getSupabaseClient()

  // Get booking details with transaction
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_date,
      booking_time,
      final_price,
      payment_status,
      status
    `)
    .eq('id', bookingId)
    .single()

  if (bookingError || !booking) {
    return {
      eligible: false,
      originalAmount: 0,
      refundAmount: 0,
      refundPercentage: 0,
      reason: 'Booking not found',
    }
  }

  // Check if already cancelled
  if (booking.status === 'cancelled') {
    return {
      eligible: false,
      originalAmount: Number(booking.final_price),
      refundAmount: 0,
      refundPercentage: 0,
      reason: 'Booking is already cancelled',
    }
  }

  // Check if payment was made
  if (booking.payment_status !== 'paid') {
    return {
      eligible: false,
      originalAmount: Number(booking.final_price),
      refundAmount: 0,
      refundPercentage: 0,
      reason: 'No payment to refund (payment status: ' + booking.payment_status + ')',
    }
  }

  // Calculate hours until booking
  const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`)
  const now = new Date()
  const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

  const originalAmount = Number(booking.final_price)

  // Apply cancellation policy
  let refundPercentage: number
  let reason: string

  if (hoursUntilBooking >= CANCELLATION_POLICY.FULL_REFUND_HOURS) {
    refundPercentage = 100
    reason = `Full refund - cancelled more than ${CANCELLATION_POLICY.FULL_REFUND_HOURS} hours before booking`
  } else if (hoursUntilBooking >= CANCELLATION_POLICY.PARTIAL_REFUND_HOURS) {
    refundPercentage = CANCELLATION_POLICY.PARTIAL_REFUND_PERCENTAGE
    reason = `Partial refund (${CANCELLATION_POLICY.PARTIAL_REFUND_PERCENTAGE}%) - cancelled between ${CANCELLATION_POLICY.PARTIAL_REFUND_HOURS}-${CANCELLATION_POLICY.FULL_REFUND_HOURS} hours before booking`
  } else if (hoursUntilBooking > 0) {
    refundPercentage = 0
    reason = `No refund - cancelled less than ${CANCELLATION_POLICY.PARTIAL_REFUND_HOURS} hours before booking`
  } else {
    refundPercentage = 0
    reason = 'No refund - booking time has already passed'
  }

  const refundAmount = Math.round((originalAmount * refundPercentage) / 100 * 100) / 100

  return {
    eligible: refundPercentage > 0,
    originalAmount,
    refundAmount,
    refundPercentage,
    reason,
    hoursUntilBooking: Math.max(0, Math.round(hoursUntilBooking * 10) / 10),
  }
}

// ============================================
// Process Refund
// ============================================

/**
 * Process a refund through Omise
 */
export async function processRefund(params: ProcessRefundParams): Promise<ProcessRefundResult> {
  const { bookingId, refundOption, refundPercentage, reason, initiatedBy } = params
  const supabase = getSupabaseClient()

  try {
    // Get booking and transaction details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, final_price, payment_status, status')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return { success: false, error: 'Booking not found' }
    }

    // Get the transaction with Omise charge ID
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .select('id, omise_charge_id, amount, status')
      .eq('booking_id', bookingId)
      .eq('status', 'successful')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (txnError || !transaction) {
      return { success: false, error: 'No successful payment transaction found for this booking' }
    }

    if (!transaction.omise_charge_id) {
      return { success: false, error: 'No Omise charge ID found - cannot process refund through Omise' }
    }

    // Calculate refund amount based on option
    let refundAmount: number

    if (refundOption === 'none') {
      // No refund - just cancel without refunding
      return { success: true, refundAmount: 0 }
    } else if (refundOption === 'full') {
      refundAmount = Number(transaction.amount)
    } else if (refundOption === 'partial' && refundPercentage) {
      refundAmount = Math.round((Number(transaction.amount) * refundPercentage) / 100 * 100) / 100
    } else {
      // Use automatic calculation based on policy
      const calculation = await calculateRefund(bookingId)
      refundAmount = calculation.refundAmount
    }

    if (refundAmount <= 0) {
      return { success: true, refundAmount: 0 }
    }

    // Create refund transaction record first
    const { data: refundTxn, error: refundTxnError } = await supabase
      .from('refund_transactions')
      .insert({
        booking_id: bookingId,
        payment_transaction_id: transaction.id,
        refund_amount: refundAmount,
        refund_percentage: refundOption === 'full' ? 100 : (refundPercentage || 0),
        status: 'processing' as RefundStatus,
        reason,
        initiated_by: initiatedBy,
      })
      .select()
      .single()

    if (refundTxnError) {
      console.error('Failed to create refund transaction record:', refundTxnError)
      // Continue anyway - we can create the record later
    }

    // Check if this is a mockup/test charge (skip actual Omise API call)
    const isMockupCharge = transaction.omise_charge_id.includes('mockup') ||
      transaction.omise_charge_id.includes('test_fake') ||
      !transaction.omise_charge_id.startsWith('chrg_test_') && !transaction.omise_charge_id.startsWith('chrg_')

    let omiseRefund: any = null

    if (isMockupCharge) {
      // For mockup charges, simulate a successful refund
      console.log(`Mockup charge detected (${transaction.omise_charge_id}). Simulating refund.`)
      omiseRefund = {
        id: `rfnd_mockup_${Date.now()}`,
        amount: Math.round(refundAmount * 100),
        status: 'closed',
      }
    } else {
      // Process actual refund through Omise
      omiseRefund = await omiseService.createRefund(
        transaction.omise_charge_id,
        Math.round(refundAmount * 100) // Convert to satangs
      )
    }

    // Update refund transaction with Omise refund ID
    if (refundTxn) {
      await supabase
        .from('refund_transactions')
        .update({
          status: 'completed' as RefundStatus,
          omise_refund_id: omiseRefund.id,
          completed_at: new Date().toISOString(),
        })
        .eq('id', refundTxn.id)
    }

    // Update original transaction status
    await supabase
      .from('transactions')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
      })
      .eq('id', transaction.id)

    // Update booking payment status
    await supabase
      .from('bookings')
      .update({
        payment_status: 'refunded',
        refund_status: 'completed' as RefundStatus,
        refund_amount: refundAmount,
        refund_percentage: refundOption === 'full' ? 100 : (refundPercentage || 0),
      })
      .eq('id', bookingId)

    return {
      success: true,
      refundTransactionId: refundTxn?.id,
      refundAmount,
      omiseRefundId: omiseRefund.id,
    }
  } catch (error: any) {
    console.error('Refund processing error:', error)

    // Update refund transaction as failed if exists
    if (params.transactionId) {
      await supabase
        .from('refund_transactions')
        .update({
          status: 'failed' as RefundStatus,
          error_message: error.message,
        })
        .eq('id', params.transactionId)
    }

    return {
      success: false,
      error: error.message || 'Failed to process refund',
    }
  }
}

/**
 * Get refund info for display purposes
 */
export function createRefundInfo(
  amount: number,
  percentage: number,
  status: RefundStatus = 'pending'
): RefundInfo {
  return {
    amount,
    percentage,
    status,
    expected_days: 5, // Typical refund processing time for credit cards
  }
}

export const refundService = {
  calculateRefund,
  processRefund,
  createRefundInfo,
  CANCELLATION_POLICY,
}
