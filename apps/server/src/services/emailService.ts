/**
 * Email Service
 * Handles email sending with template support
 *
 * Currently logs emails for development.
 * To enable actual email sending, set RESEND_API_KEY environment variable.
 */

// ============================================
// Types
// ============================================

export interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
}

export interface EmailTemplateData {
  [key: string]: string | number | boolean | undefined | null | object
}

// ============================================
// Configuration
// ============================================

const DEFAULT_FROM = process.env.EMAIL_FROM || 'The Bliss at Home <noreply@theblissathome.com>'
const RESEND_API_KEY = process.env.RESEND_API_KEY

// ============================================
// Email Sending
// ============================================

/**
 * Send an email
 * Uses Resend API if configured, otherwise logs to console
 */
export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  const { to, subject, html, text, from = DEFAULT_FROM } = params
  const recipients = Array.isArray(to) ? to : [to]

  // Development mode - log email
  if (!RESEND_API_KEY) {
    console.log('\n========== EMAIL (Development Mode) ==========')
    console.log('From:', from)
    console.log('To:', recipients.join(', '))
    console.log('Subject:', subject)
    console.log('HTML Length:', html.length, 'characters')
    if (text) console.log('Text:', text.substring(0, 200) + '...')
    console.log('================================================\n')
    return { success: true }
  }

  // Production mode - send via Resend API
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
        text,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json() as { message?: string }
      console.error('Resend API error:', errorData)
      return { success: false, error: errorData.message || 'Failed to send email' }
    }

    const data = await response.json() as { id: string }
    console.log('[Email] Sent successfully:', data.id)
    return { success: true }
  } catch (error: any) {
    console.error('[Email] Send error:', error)
    return { success: false, error: error.message || 'Failed to send email' }
  }
}

// ============================================
// Email Templates
// ============================================

/**
 * Base email template wrapper
 */
function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Bliss at Home</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #d97706, #f59e0b);
      color: #fff;
      padding: 24px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .header p {
      margin: 8px 0 0;
      opacity: 0.9;
    }
    .content {
      padding: 24px;
    }
    .info-box {
      background: #f8f8f8;
      border-radius: 12px;
      padding: 16px;
      margin: 16px 0;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      color: #666;
    }
    .info-value {
      font-weight: 600;
      color: #333;
    }
    .refund-box {
      background: linear-gradient(135deg, #dcfce7, #bbf7d0);
      border: 1px solid #86efac;
      border-radius: 12px;
      padding: 16px;
      margin: 16px 0;
      text-align: center;
    }
    .refund-amount {
      font-size: 28px;
      font-weight: bold;
      color: #16a34a;
    }
    .warning-box {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 12px;
      padding: 16px;
      margin: 16px 0;
    }
    .footer {
      background: #f8f8f8;
      padding: 24px;
      text-align: center;
      font-size: 14px;
      color: #666;
    }
    .footer a {
      color: #d97706;
      text-decoration: none;
    }
    .btn {
      display: inline-block;
      padding: 12px 24px;
      background: #d97706;
      color: #fff;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 8px 0;
    }
    .btn:hover {
      background: #b45309;
    }
    .status-cancelled {
      display: inline-block;
      background: #fee2e2;
      color: #dc2626;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
</body>
</html>
`
}

/**
 * Booking cancellation email template for customer
 */
export function bookingCancellationTemplate(data: {
  customerName: string
  bookingNumber: string
  serviceName: string
  bookingDate: string
  bookingTime: string
  cancellationReason: string
  refundAmount?: number
  refundPercentage?: number
  supportEmail?: string
  supportPhone?: string
}): string {
  const {
    customerName,
    bookingNumber,
    serviceName,
    bookingDate,
    bookingTime,
    cancellationReason,
    refundAmount,
    refundPercentage,
    supportEmail = 'support@theblissathome.com',
    supportPhone = '02-xxx-xxxx',
  } = data

  const hasRefund = refundAmount && refundAmount > 0

  return baseTemplate(`
    <div class="card">
      <div class="header">
        <h1>The Bliss at Home</h1>
        <p>แจ้งยกเลิกการจอง</p>
      </div>

      <div class="content">
        <p>เรียน คุณ${customerName},</p>

        <p>เราขอแจ้งให้ทราบว่าการจองของคุณได้ถูกยกเลิกแล้ว</p>

        <span class="status-cancelled">ยกเลิกการจอง</span>

        <div class="info-box">
          <h3 style="margin: 0 0 12px;">รายละเอียดการจอง</h3>
          <div class="info-row">
            <span class="info-label">หมายเลขการจอง</span>
            <span class="info-value">${bookingNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">บริการ</span>
            <span class="info-value">${serviceName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">วันที่</span>
            <span class="info-value">${bookingDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">เวลา</span>
            <span class="info-value">${bookingTime}</span>
          </div>
          <div class="info-row">
            <span class="info-label">เหตุผลการยกเลิก</span>
            <span class="info-value">${cancellationReason}</span>
          </div>
        </div>

        ${hasRefund ? `
        <div class="refund-box">
          <p style="margin: 0 0 8px; color: #16a34a;">ยอดเงินคืน (${refundPercentage}%)</p>
          <p class="refund-amount">฿${refundAmount.toLocaleString()}</p>
          <p style="margin: 8px 0 0; font-size: 14px; color: #666;">
            การคืนเงินจะดำเนินการภายใน 5-7 วันทำการ
          </p>
        </div>
        ` : `
        <div class="warning-box">
          <p style="margin: 0; color: #92400e;">
            การจองนี้ไม่มีการคืนเงินตามเงื่อนไขการยกเลิก
          </p>
        </div>
        `}

        <p style="margin-top: 24px;">
          หากคุณมีคำถามหรือต้องการความช่วยเหลือเพิ่มเติม
          กรุณาติดต่อเราได้ที่:
        </p>

        <div class="info-box">
          <div class="info-row">
            <span class="info-label">อีเมล</span>
            <span class="info-value">${supportEmail}</span>
          </div>
          <div class="info-row">
            <span class="info-label">โทรศัพท์</span>
            <span class="info-value">${supportPhone}</span>
          </div>
        </div>

        <p>ขอบคุณที่ใช้บริการ The Bliss at Home</p>
      </div>

      <div class="footer">
        <p>
          The Bliss at Home - บริการนวดและสปาถึงที่<br>
          <a href="https://theblissathome.com">www.theblissathome.com</a>
        </p>
        <p style="font-size: 12px; color: #999;">
          อีเมลนี้ถูกส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ
        </p>
      </div>
    </div>
  `)
}

/**
 * Booking cancellation email template for hotel
 */
export function hotelBookingCancellationTemplate(data: {
  hotelName: string
  bookingNumber: string
  customerName: string
  serviceName: string
  bookingDate: string
  bookingTime: string
  roomNumber?: string
  cancellationReason: string
}): string {
  const {
    hotelName,
    bookingNumber,
    customerName,
    serviceName,
    bookingDate,
    bookingTime,
    roomNumber,
    cancellationReason,
  } = data

  return baseTemplate(`
    <div class="card">
      <div class="header">
        <h1>The Bliss at Home</h1>
        <p>Booking Cancellation Notice</p>
      </div>

      <div class="content">
        <p>Dear ${hotelName},</p>

        <p>We would like to inform you that the following booking has been cancelled.</p>

        <span class="status-cancelled">Cancelled</span>

        <div class="info-box">
          <h3 style="margin: 0 0 12px;">Booking Details</h3>
          <div class="info-row">
            <span class="info-label">Booking Number</span>
            <span class="info-value">${bookingNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Guest Name</span>
            <span class="info-value">${customerName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Service</span>
            <span class="info-value">${serviceName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Date</span>
            <span class="info-value">${bookingDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Time</span>
            <span class="info-value">${bookingTime}</span>
          </div>
          ${roomNumber ? `
          <div class="info-row">
            <span class="info-label">Room Number</span>
            <span class="info-value">${roomNumber}</span>
          </div>
          ` : ''}
          <div class="info-row">
            <span class="info-label">Cancellation Reason</span>
            <span class="info-value">${cancellationReason}</span>
          </div>
        </div>

        <p>Thank you for your partnership with The Bliss at Home.</p>
      </div>

      <div class="footer">
        <p>
          The Bliss at Home - In-room Massage & Spa Services<br>
          <a href="https://theblissathome.com">www.theblissathome.com</a>
        </p>
        <p style="font-size: 12px; color: #999;">
          This email was sent automatically. Please do not reply.
        </p>
      </div>
    </div>
  `)
}

/**
 * Staff job cancellation notification email template
 */
export function staffJobCancellationTemplate(data: {
  staffName: string
  bookingNumber: string
  serviceName: string
  bookingDate: string
  bookingTime: string
  customerName: string
  location: string
  cancellationReason: string
}): string {
  const {
    staffName,
    bookingNumber,
    serviceName,
    bookingDate,
    bookingTime,
    customerName,
    location,
    cancellationReason,
  } = data

  return baseTemplate(`
    <div class="card">
      <div class="header">
        <h1>The Bliss at Home</h1>
        <p>แจ้งยกเลิกงาน</p>
      </div>

      <div class="content">
        <p>เรียน คุณ${staffName},</p>

        <p>ขอแจ้งให้ทราบว่างานต่อไปนี้ได้ถูกยกเลิกแล้ว</p>

        <span class="status-cancelled">งานถูกยกเลิก</span>

        <div class="info-box">
          <h3 style="margin: 0 0 12px;">รายละเอียดงาน</h3>
          <div class="info-row">
            <span class="info-label">หมายเลขการจอง</span>
            <span class="info-value">${bookingNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">บริการ</span>
            <span class="info-value">${serviceName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">วันที่</span>
            <span class="info-value">${bookingDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">เวลา</span>
            <span class="info-value">${bookingTime}</span>
          </div>
          <div class="info-row">
            <span class="info-label">ลูกค้า</span>
            <span class="info-value">${customerName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">สถานที่</span>
            <span class="info-value">${location}</span>
          </div>
          <div class="info-row">
            <span class="info-label">เหตุผล</span>
            <span class="info-value">${cancellationReason}</span>
          </div>
        </div>

        <p>
          ตารางงานของคุณได้รับการอัพเดทแล้ว
          คุณสามารถตรวจสอบงานใหม่ได้ในแอพพลิเคชัน
        </p>
      </div>

      <div class="footer">
        <p>
          The Bliss at Home - ทีมงานพนักงาน<br>
          <a href="https://theblissathome.com">www.theblissathome.com</a>
        </p>
      </div>
    </div>
  `)
}

export const emailService = {
  sendEmail,
  templates: {
    bookingCancellation: bookingCancellationTemplate,
    hotelBookingCancellation: hotelBookingCancellationTemplate,
    staffJobCancellation: staffJobCancellationTemplate,
  },
}
