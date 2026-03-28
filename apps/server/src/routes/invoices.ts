/**
 * Invoice Email API Routes
 * Handles sending hotel invoice/billing emails with PDF attachment
 */

import { Router } from 'express'
import { getSupabaseClient } from '../lib/supabase.js'
import { sendEmail, invoiceEmailTemplate } from '../services/emailService.js'

const router = Router()

// Helper: fetch company settings
async function getCompanySettings() {
  const supabase = getSupabaseClient()
  const keys = ['website_name_en', 'company_name_th', 'company_tax_id', 'company_logo_url', 'company_email', 'company_address', 'company_phone']
  const { data } = await supabase.from('settings').select('key, value').in('key', keys)

  const settings: Record<string, string> = {}
  data?.forEach((row: any) => {
    // value column is JSONB with shape {"value": "actual string"}
    const val = row.value
    settings[row.key] = typeof val === 'object' && val !== null && 'value' in val ? val.value : String(val || '')
  })

  return {
    companyName: settings.website_name_en || 'The Bliss Massage at Home',
    companyNameTh: settings.company_name_th || 'เดอะบลิสนวดที่บ้าน',
    companyTaxId: settings.company_tax_id || '',
    companyAddress: settings.company_address || '',
    companyPhone: settings.company_phone || '',
    companyEmail: settings.company_email || 'support@theblissathome.com',
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * POST /api/invoices/:billId/send-email
 * Send invoice email to hotel with PDF attachment
 * Body: { pdfBase64?: string } - optional PDF attachment
 */
router.post('/:billId/send-email', async (req, res) => {
  try {
    const { billId } = req.params
    const { pdfBase64 } = req.body || {}
    const supabase = getSupabaseClient()

    // Fetch bill data
    const { data: bill, error: billError } = await supabase
      .from('monthly_bills')
      .select('*')
      .eq('id', billId)
      .single()

    if (billError || !bill) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลบิล' })
    }

    // Fetch hotel data + email
    const { data: hotel, error: hotelError } = await supabase
      .from('hotels')
      .select('name_th, name_en, email')
      .eq('id', bill.hotel_id)
      .single()

    if (hotelError || !hotel) {
      console.error('Hotel query error:', hotelError)
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลโรงแรม' })
    }

    const hotelEmail = hotel.email

    if (!hotelEmail) {
      return res.status(400).json({ success: false, error: 'ไม่พบอีเมลของโรงแรม' })
    }

    const company = await getCompanySettings()
    const hotelName = hotel.name_th || hotel.name_en || 'โรงแรม'
    const billNumber = bill.bill_number || `BILL-${bill.id.substring(0, 8)}`

    // Generate email HTML
    const html = invoiceEmailTemplate({
      hotelName,
      billNumber,
      periodStart: formatDate(bill.period_start),
      periodEnd: formatDate(bill.period_end),
      periodType: bill.period_type || 'monthly',
      totalBookings: bill.total_bookings || 0,
      totalAmount: Number(bill.total_base_price || bill.total_amount || 0),
      totalDiscount: Number(bill.total_discount || 0),
      netAmount: Number(bill.total_amount || 0),
      status: bill.status,
      dueDate: formatDate(bill.due_date),
      issuedDate: formatDate(bill.created_at),
      paidDate: bill.paid_at ? formatDate(bill.paid_at) : undefined,
      companyName: company.companyName,
      companyAddress: company.companyAddress,
      companyPhone: company.companyPhone,
      companyEmail: company.companyEmail,
      companyTaxId: company.companyTaxId,
    })

    // Build attachments
    const attachments = pdfBase64
      ? [{ filename: `invoice-${billNumber}.pdf`, content: pdfBase64, content_type: 'application/pdf' }]
      : undefined

    // Send email
    const result = await sendEmail({
      to: hotelEmail,
      subject: `ใบแจ้งหนี้ ${billNumber} - ${company.companyName}`,
      html,
      attachments,
    })

    if (result.success) {
      console.log(`✅ Invoice email sent to ${hotelEmail} for bill ${billNumber}`)
      return res.json({ success: true, sentTo: hotelEmail })
    } else {
      console.error(`❌ Invoice email failed:`, result.error)
      return res.status(500).json({ success: false, error: result.error })
    }
  } catch (error: any) {
    console.error('Invoice email error:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
})

export default router
