/**
 * Receipt & Credit Note API Routes
 * Handles receipt data retrieval, PDF data, and email sending
 */

import { Router } from 'express'
import { getSupabaseClient } from '../lib/supabase.js'
import { sendEmail, receiptEmailTemplate, creditNoteEmailTemplate } from '../services/emailService.js'

const router = Router()

// Helper: fetch company settings from the settings table
async function getCompanySettings() {
  const supabase = getSupabaseClient()
  const keys = ['website_name_en', 'company_name_th', 'company_tax_id', 'company_logo_url', 'company_email', 'company_address', 'company_phone']

  const { data } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', keys)

  const settings: Record<string, string> = {}
  if (data) {
    for (const row of data) {
      const val = row.value as any
      if (val && typeof val === 'object') {
        settings[row.key] = val.value || val.url || val.key || ''
      } else {
        settings[row.key] = String(val || '')
      }
    }
  }

  return {
    companyName: settings.website_name_en || 'The Bliss at Home',
    companyNameTh: settings.company_name_th || '',
    companyTaxId: settings.company_tax_id || '',
    companyLogoUrl: settings.company_logo_url || '',
    companyEmail: settings.company_email || '',
    companyAddress: settings.company_address || '',
    companyPhone: settings.company_phone || '',
  }
}

// Helper: generate document number via Postgres function
async function generateDocNumber(prefix: string): Promise<string> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.rpc('generate_document_number', { p_prefix: prefix })
  if (error) {
    console.error('Error generating document number:', error)
    // Fallback
    const now = new Date()
    const dateKey = now.toISOString().slice(0, 10).replace(/-/g, '')
    return `${prefix}-${dateKey}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`
  }
  return data as string
}

// Helper: format date to Thai locale string
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return dateStr
  }
}

// Helper: get customer email from profiles table
async function getCustomerEmail(customerId: string): Promise<string | null> {
  const supabase = getSupabaseClient()

  // Get profile_id from customer
  const { data: customer } = await supabase
    .from('customers')
    .select('profile_id')
    .eq('id', customerId)
    .single()

  if (!customer?.profile_id) return null

  // Get email from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', customer.profile_id)
    .single()

  return profile?.email || null
}

/**
 * GET /api/receipts/:transactionId
 * Get receipt data for a transaction
 */
router.get('/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params
    const supabase = getSupabaseClient()

    // Fetch transaction with booking details
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select(`
        id,
        transaction_number,
        receipt_number,
        amount,
        currency,
        payment_method,
        card_brand,
        card_last_digits,
        status,
        created_at,
        bookings!transactions_booking_id_fkey (
          booking_number,
          booking_date,
          booking_time,
          base_price,
          final_price,
          status,
          payment_method,
          services!bookings_service_id_fkey (
            name_th,
            name_en,
            base_price,
            duration
          ),
          booking_addons!booking_addons_booking_id_fkey (
            quantity,
            total_price,
            service_addons!booking_addons_addon_id_fkey (
              name_th,
              name_en,
              price
            )
          ),
          customers!bookings_customer_id_fkey (
            id,
            full_name,
            phone,
            profile_id
          )
        )
      `)
      .eq('id', transactionId)
      .single()

    if (error || !transaction) {
      console.error('Receipt query error:', error)
      return res.status(404).json({ success: false, error: 'Transaction not found' })
    }

    // Auto-generate receipt_number if not yet assigned
    let receiptNumber = transaction.receipt_number
    if (!receiptNumber) {
      receiptNumber = await generateDocNumber('RCP')
      await supabase
        .from('transactions')
        .update({ receipt_number: receiptNumber })
        .eq('id', transactionId)
    }

    // Get company settings
    const company = await getCompanySettings()

    // Get customer email
    const booking = transaction.bookings as any
    let customerEmail: string | null = null
    if (booking?.customers?.profile_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', booking.customers.profile_id)
        .single()
      customerEmail = profile?.email || null
    }

    const addons = (booking?.booking_addons || []).map((ba: any) => ({
      name: ba.service_addons?.name_th || ba.service_addons?.name_en || '',
      price: ba.total_price || 0,
    }))

    return res.json({
      success: true,
      data: {
        transaction_id: transaction.id,
        receipt_number: receiptNumber,
        transaction_number: transaction.transaction_number,
        amount: transaction.amount,
        currency: transaction.currency || 'THB',
        payment_method: transaction.payment_method,
        card_brand: transaction.card_brand,
        card_last_digits: transaction.card_last_digits,
        status: transaction.status,
        transaction_date: transaction.created_at,
        booking_number: booking?.booking_number,
        booking_date: booking?.booking_date,
        booking_time: booking?.booking_time,
        service_name: booking?.services?.name_th || booking?.services?.name_en || '',
        service_name_en: booking?.services?.name_en || '',
        service_price: booking?.services?.base_price || booking?.base_price,
        final_price: booking?.final_price,
        addons,
        customer_name: booking?.customers?.full_name || '',
        customer_phone: booking?.customers?.phone || '',
        customer_email: customerEmail,
        customer_id: booking?.customers?.id,
        company,
      },
    })
  } catch (err: any) {
    console.error('Error fetching receipt:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * GET /api/receipts/credit-note/:refundTransactionId
 * Get credit note data for a refund transaction
 */
router.get('/credit-note/:refundTransactionId', async (req, res) => {
  try {
    const { refundTransactionId } = req.params
    const supabase = getSupabaseClient()

    // Fetch refund transaction
    const { data: refundTxn, error } = await supabase
      .from('refund_transactions')
      .select(`
        *,
        bookings (
          booking_number,
          booking_date,
          booking_time,
          base_price,
          final_price,
          cancellation_reason,
          payment_method,
          services (
            name_th,
            name_en
          ),
          customers (
            id,
            full_name,
            phone,
            profile_id
          )
        )
      `)
      .eq('id', refundTransactionId)
      .single()

    if (error || !refundTxn) {
      console.error('Credit note query error:', error)
      return res.status(404).json({ success: false, error: 'Refund transaction not found' })
    }

    // Auto-generate credit_note_number if not yet assigned
    let creditNoteNumber = refundTxn.credit_note_number
    if (!creditNoteNumber) {
      creditNoteNumber = await generateDocNumber('CN')
      await supabase
        .from('refund_transactions')
        .update({ credit_note_number: creditNoteNumber })
        .eq('id', refundTransactionId)
    }

    // Get original transaction receipt number
    let originalReceiptNumber = ''
    if (refundTxn.payment_transaction_id) {
      const { data: origTxn } = await supabase
        .from('transactions')
        .select('receipt_number, amount, payment_method, card_brand, card_last_digits')
        .eq('id', refundTxn.payment_transaction_id)
        .single()

      if (origTxn) {
        originalReceiptNumber = origTxn.receipt_number || ''
        // Generate receipt number for original if missing
        if (!originalReceiptNumber) {
          originalReceiptNumber = await generateDocNumber('RCP')
          await supabase
            .from('transactions')
            .update({ receipt_number: originalReceiptNumber })
            .eq('id', refundTxn.payment_transaction_id)
        }
      }
    }

    // Get company settings
    const company = await getCompanySettings()

    const booking = refundTxn.bookings as any

    // Get customer email
    let customerEmail: string | null = null
    if (booking?.customers?.profile_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', booking.customers.profile_id)
        .single()
      customerEmail = profile?.email || null
    }

    return res.json({
      success: true,
      data: {
        refund_transaction_id: refundTxn.id,
        credit_note_number: creditNoteNumber,
        original_receipt_number: originalReceiptNumber,
        refund_amount: refundTxn.refund_amount,
        refund_percentage: refundTxn.refund_percentage,
        reason: refundTxn.reason || booking?.cancellation_reason || '',
        status: refundTxn.status,
        refund_date: refundTxn.completed_at || refundTxn.created_at,
        booking_number: booking?.booking_number,
        booking_date: booking?.booking_date,
        booking_time: booking?.booking_time,
        service_name: booking?.services?.name_th || booking?.services?.name_en || '',
        original_amount: booking?.final_price || 0,
        payment_method: booking?.payment_method || '',
        customer_name: booking?.customers?.full_name || '',
        customer_phone: booking?.customers?.phone || '',
        customer_email: customerEmail,
        customer_id: booking?.customers?.id,
        company,
      },
    })
  } catch (err: any) {
    console.error('Error fetching credit note:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/receipts/:transactionId/send-email
 * Send receipt email to customer
 */
router.post('/:transactionId/send-email', async (req, res) => {
  try {
    const { transactionId } = req.params

    // Fetch receipt data (reuse GET logic)
    const supabase = getSupabaseClient()
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .select(`
        *,
        bookings!transactions_booking_id_fkey (
          booking_number,
          booking_date,
          booking_time,
          final_price,
          payment_method,
          services!bookings_service_id_fkey (name_th, name_en),
          booking_addons!booking_addons_booking_id_fkey (
            quantity,
            total_price,
            service_addons!booking_addons_addon_id_fkey (name_th, name_en)
          ),
          customers!bookings_customer_id_fkey (id, full_name, phone, profile_id)
        )
      `)
      .eq('id', transactionId)
      .single()

    if (txnError || !transaction) {
      console.error('Send receipt email - query error:', txnError)
      return res.status(404).json({ success: false, error: 'Transaction not found' })
    }

    const booking = transaction.bookings as any
    const customerEmail = await getCustomerEmail(booking?.customers?.id)

    if (!customerEmail) {
      return res.status(400).json({ success: false, error: 'Customer email not found' })
    }

    // Ensure receipt number exists
    let receiptNumber = transaction.receipt_number
    if (!receiptNumber) {
      receiptNumber = await generateDocNumber('RCP')
      await supabase
        .from('transactions')
        .update({ receipt_number: receiptNumber })
        .eq('id', transactionId)
    }

    const company = await getCompanySettings()
    const addons = (booking?.booking_addons || []).map((ba: any) => ({
      name: ba.service_addons?.name_th || ba.service_addons?.name_en || '',
      price: ba.total_price || 0,
    }))

    const html = receiptEmailTemplate({
      customerName: booking?.customers?.full_name || '',
      receiptNumber,
      bookingNumber: booking?.booking_number || '',
      serviceName: booking?.services?.name_th || booking?.services?.name_en || '',
      bookingDate: formatDate(booking?.booking_date),
      bookingTime: booking?.booking_time || '',
      amount: transaction.amount,
      paymentMethod: transaction.payment_method || '',
      cardLastDigits: transaction.card_last_digits || undefined,
      transactionDate: formatDate(transaction.created_at),
      companyName: company.companyName,
      companyNameTh: company.companyNameTh,
      companyAddress: company.companyAddress,
      companyPhone: company.companyPhone,
      companyEmail: company.companyEmail,
      companyTaxId: company.companyTaxId,
      addons,
    })

    const result = await sendEmail({
      to: customerEmail,
      subject: `ใบเสร็จรับเงิน ${receiptNumber} - ${company.companyName}`,
      html,
    })

    return res.json({ success: result.success, error: result.error })
  } catch (err: any) {
    console.error('Error sending receipt email:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/receipts/credit-note/:refundTransactionId/send-email
 * Send credit note email to customer
 */
router.post('/credit-note/:refundTransactionId/send-email', async (req, res) => {
  try {
    const { refundTransactionId } = req.params
    const supabase = getSupabaseClient()

    const { data: refundTxn } = await supabase
      .from('refund_transactions')
      .select(`
        *,
        bookings (
          booking_number,
          booking_date,
          final_price,
          cancellation_reason,
          payment_method,
          services (name_th, name_en),
          customers (id, full_name, profile_id)
        )
      `)
      .eq('id', refundTransactionId)
      .single()

    if (!refundTxn) {
      return res.status(404).json({ success: false, error: 'Refund transaction not found' })
    }

    const booking = refundTxn.bookings as any
    const customerEmail = await getCustomerEmail(booking?.customers?.id)

    if (!customerEmail) {
      return res.status(400).json({ success: false, error: 'Customer email not found' })
    }

    // Ensure credit note number exists
    let creditNoteNumber = refundTxn.credit_note_number
    if (!creditNoteNumber) {
      creditNoteNumber = await generateDocNumber('CN')
      await supabase
        .from('refund_transactions')
        .update({ credit_note_number: creditNoteNumber })
        .eq('id', refundTransactionId)
    }

    // Get original receipt number
    let originalReceiptNumber = ''
    if (refundTxn.payment_transaction_id) {
      const { data: origTxn } = await supabase
        .from('transactions')
        .select('receipt_number, card_last_digits')
        .eq('id', refundTxn.payment_transaction_id)
        .single()
      originalReceiptNumber = origTxn?.receipt_number || ''
    }

    const company = await getCompanySettings()

    const html = creditNoteEmailTemplate({
      customerName: booking?.customers?.full_name || '',
      creditNoteNumber,
      originalReceiptNumber,
      bookingNumber: booking?.booking_number || '',
      serviceName: booking?.services?.name_th || booking?.services?.name_en || '',
      bookingDate: formatDate(booking?.booking_date),
      originalAmount: booking?.final_price || 0,
      refundAmount: refundTxn.refund_amount,
      refundPercentage: refundTxn.refund_percentage,
      refundReason: refundTxn.reason || booking?.cancellation_reason || '',
      refundDate: formatDate(refundTxn.completed_at || refundTxn.created_at),
      paymentMethod: booking?.payment_method || '',
      companyName: company.companyName,
      companyNameTh: company.companyNameTh,
      companyAddress: company.companyAddress,
      companyPhone: company.companyPhone,
      companyEmail: company.companyEmail,
      companyTaxId: company.companyTaxId,
    })

    const result = await sendEmail({
      to: customerEmail,
      subject: `ใบลดหนี้ ${creditNoteNumber} - ${company.companyName}`,
      html,
    })

    return res.json({ success: result.success, error: result.error })
  } catch (err: any) {
    console.error('Error sending credit note email:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * Helper function to send receipt email (for use in payment flow)
 * Exported for use in payment.ts and bookings.ts
 */
export async function sendReceiptEmailForTransaction(transactionId: string): Promise<void> {
  const supabase = getSupabaseClient()

  const { data: transaction, error: txnError } = await supabase
    .from('transactions')
    .select(`
      *,
      bookings!transactions_booking_id_fkey (
        booking_number,
        booking_date,
        booking_time,
        final_price,
        payment_method,
        services!bookings_service_id_fkey (name_th, name_en),
        booking_addons!booking_addons_booking_id_fkey (
          quantity,
          total_price,
          service_addons!booking_addons_addon_id_fkey (name_th, name_en)
        ),
        customers!bookings_customer_id_fkey (id, full_name, phone, profile_id)
      )
    `)
    .eq('id', transactionId)
    .single()

  if (txnError || !transaction) {
    console.warn('[Receipt] Transaction not found:', transactionId, txnError?.message)
    return
  }

  const booking = transaction.bookings as any
  const customerEmail = await getCustomerEmail(booking?.customers?.id)

  if (!customerEmail) {
    console.warn('[Receipt] Customer email not found for transaction:', transactionId)
    return
  }

  // Ensure receipt number
  let receiptNumber = transaction.receipt_number
  if (!receiptNumber) {
    receiptNumber = await generateDocNumber('RCP')
    await supabase
      .from('transactions')
      .update({ receipt_number: receiptNumber })
      .eq('id', transactionId)
  }

  const company = await getCompanySettings()
  const addons = (booking?.booking_addons || []).map((ba: any) => ({
    name: ba.service_addons?.name_th || ba.service_addons?.name_en || '',
    price: ba.total_price || 0,
  }))

  const html = receiptEmailTemplate({
    customerName: booking?.customers?.full_name || '',
    receiptNumber,
    bookingNumber: booking?.booking_number || '',
    serviceName: booking?.services?.name_th || booking?.services?.name_en || '',
    bookingDate: formatDate(booking?.booking_date),
    bookingTime: booking?.booking_time || '',
    amount: transaction.amount,
    paymentMethod: transaction.payment_method || '',
    cardLastDigits: transaction.card_last_digits || undefined,
    transactionDate: formatDate(transaction.created_at),
    companyName: company.companyName,
    companyNameTh: company.companyNameTh,
    companyAddress: company.companyAddress,
    companyPhone: company.companyPhone,
    companyEmail: company.companyEmail,
    companyTaxId: company.companyTaxId,
    addons,
  })

  const result = await sendEmail({
    to: customerEmail,
    subject: `ใบเสร็จรับเงิน ${receiptNumber} - ${company.companyName}`,
    html,
  })

  if (result.success) {
    console.log(`[Receipt] Email sent to ${customerEmail} for ${receiptNumber}`)
  } else {
    console.error(`[Receipt] Failed to send email: ${result.error}`)
  }
}

/**
 * Helper function to send credit note email (for use in refund flow)
 * Exported for use in bookings.ts
 */
export async function sendCreditNoteEmailForRefund(refundTransactionId: string): Promise<void> {
  const supabase = getSupabaseClient()

  const { data: refundTxn, error: refundError } = await supabase
    .from('refund_transactions')
    .select(`
      *,
      bookings (
        booking_number,
        booking_date,
        final_price,
        cancellation_reason,
        payment_method,
        services!bookings_service_id_fkey (name_th, name_en),
        customers!bookings_customer_id_fkey (id, full_name, profile_id)
      )
    `)
    .eq('id', refundTransactionId)
    .single()

  if (refundError || !refundTxn) {
    console.warn('[CreditNote] Refund transaction not found:', refundTransactionId, refundError?.message)
    return
  }

  const booking = refundTxn.bookings as any
  const customerEmail = await getCustomerEmail(booking?.customers?.id)

  if (!customerEmail) {
    console.warn('[CreditNote] Customer email not found for refund:', refundTransactionId)
    return
  }

  // Ensure credit note number
  let creditNoteNumber = refundTxn.credit_note_number
  if (!creditNoteNumber) {
    creditNoteNumber = await generateDocNumber('CN')
    await supabase
      .from('refund_transactions')
      .update({ credit_note_number: creditNoteNumber })
      .eq('id', refundTransactionId)
  }

  // Get original receipt number
  let originalReceiptNumber = ''
  if (refundTxn.payment_transaction_id) {
    const { data: origTxn } = await supabase
      .from('transactions')
      .select('receipt_number')
      .eq('id', refundTxn.payment_transaction_id)
      .single()
    originalReceiptNumber = origTxn?.receipt_number || ''
  }

  const company = await getCompanySettings()

  const html = creditNoteEmailTemplate({
    customerName: booking?.customers?.full_name || '',
    creditNoteNumber,
    originalReceiptNumber,
    bookingNumber: booking?.booking_number || '',
    serviceName: booking?.services?.name_th || booking?.services?.name_en || '',
    bookingDate: formatDate(booking?.booking_date),
    originalAmount: booking?.final_price || 0,
    refundAmount: refundTxn.refund_amount,
    refundPercentage: refundTxn.refund_percentage,
    refundReason: refundTxn.reason || booking?.cancellation_reason || '',
    refundDate: formatDate(refundTxn.completed_at || refundTxn.created_at),
    paymentMethod: booking?.payment_method || '',
    companyName: company.companyName,
    companyNameTh: company.companyNameTh,
    companyAddress: company.companyAddress,
    companyPhone: company.companyPhone,
    companyEmail: company.companyEmail,
    companyTaxId: company.companyTaxId,
  })

  const result = await sendEmail({
    to: customerEmail,
    subject: `ใบลดหนี้ ${creditNoteNumber} - ${company.companyName}`,
    html,
  })

  if (result.success) {
    console.log(`[CreditNote] Email sent to ${customerEmail} for ${creditNoteNumber}`)
  } else {
    console.error(`[CreditNote] Failed to send email: ${result.error}`)
  }
}

export default router
