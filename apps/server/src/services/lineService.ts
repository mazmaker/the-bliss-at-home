/**
 * LINE Messaging API Service (Server-side)
 * Sends LINE push/multicast messages securely using server-side token
 */

interface LineMessage {
  type: 'text' | 'flex'
  text?: string
  altText?: string
  contents?: any
}

interface JobNotificationData {
  serviceName: string
  scheduledDate: string
  scheduledTime: string
  address: string
  hotelName?: string | null
  roomNumber?: string | null
  staffEarnings: number
  durationMinutes: number
  jobIds?: string[]
  // Couple booking fields
  isCouple?: boolean
  recipientIndex?: number
  recipientName?: string | null
  totalRecipients?: number
  coupleServices?: Array<{
    recipientIndex: number
    recipientName: string | null
    serviceName: string
    durationMinutes: number
    staffEarnings: number
  }>
}

interface BookingNotificationData {
  bookingNumber: string
  customerName: string
  serviceName: string
  scheduledDate: string
  scheduledTime: string
  finalPrice: number
  hotelName?: string | null
  isHotelBooking: boolean
}

// Lazy initialization
let channelAccessToken: string | null = null

function getToken(): string {
  if (!channelAccessToken) {
    channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
    if (!channelAccessToken) {
      console.warn('⚠️ LINE: LINE_CHANNEL_ACCESS_TOKEN not configured')
    }
  }
  return channelAccessToken
}

const API_URL = 'https://api.line.me/v2/bot/message'

/**
 * Push message to a single user by LINE User ID
 */
async function pushMessage(lineUserId: string, messages: LineMessage[]): Promise<boolean> {
  const token = getToken()
  if (!token) return false

  try {
    const res: any = await fetch(`${API_URL}/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ to: lineUserId, messages }),
    })

    if (!res.ok) {
      const error = await res.json()
      console.error('LINE push error:', JSON.stringify(error))
      return false
    }

    return true
  } catch (error) {
    console.error('LINE push failed:', error)
    return false
  }
}

/**
 * Multicast message to multiple users (max 500 per call)
 */
async function multicast(lineUserIds: string[], messages: LineMessage[]): Promise<boolean> {
  const token = getToken()
  if (!token || lineUserIds.length === 0) return false

  try {
    // LINE multicast supports max 500 recipients per call
    const batches: string[][] = []
    for (let i = 0; i < lineUserIds.length; i += 500) {
      batches.push(lineUserIds.slice(i, i + 500))
    }

    let allSuccess = true
    for (const batch of batches) {
      const res: any = await fetch(`${API_URL}/multicast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ to: batch, messages }),
      })

      if (!res.ok) {
        const error = await res.json()
        console.error('LINE multicast error:', JSON.stringify(error))
        allSuccess = false
      }
    }

    return allSuccess
  } catch (error) {
    console.error('LINE multicast failed:', error)
    return false
  }
}

/**
 * Send new job notification to staff via LINE
 */
async function sendNewJobToStaff(lineUserIds: string[], data: JobNotificationData): Promise<boolean> {
  if (lineUserIds.length === 0) return true

  const locationText = data.hotelName
    ? `🏨 โรงแรม: ${data.hotelName}${data.roomNumber ? ` ห้อง ${data.roomNumber}` : ''}`
    : `📍 สถานที่: ${data.address}`

  // Build deep link to staff app
  const staffLiffUrl = process.env.STAFF_LIFF_URL || ''
  let linkText = 'เปิดแอปเพื่อรับงานนี้'
  if (staffLiffUrl && data.jobIds && data.jobIds.length === 1) {
    // Single job: link directly to job detail
    linkText = `👉 ดูรายละเอียดงาน:\n${staffLiffUrl}/staff/jobs/${data.jobIds[0]}`
  } else if (staffLiffUrl) {
    // Multiple jobs or no jobId: link to jobs list
    linkText = `👉 ดูรายละเอียดงาน:\n${staffLiffUrl}/staff/jobs`
  }

  let messageText: string

  if (data.isCouple && data.coupleServices && data.coupleServices.length > 0) {
    // Couple booking: show per-recipient details with individual job links
    const recipientDetails = data.coupleServices
      .map((s, idx) => {
        const name = s.recipientName || `คนที่ ${s.recipientIndex + 1}`
        const jobLink = staffLiffUrl && data.jobIds && data.jobIds[idx]
          ? `\n  👉 ${staffLiffUrl}/staff/jobs/${data.jobIds[idx]}`
          : ''
        return `  👤 ${name}: ${s.serviceName} (${s.durationMinutes} นาที) — ${s.staffEarnings.toLocaleString()} บาท${jobLink}`
      })
      .join('\n')

    messageText =
      `🔔 มีงาน Couple ใหม่! (ต้องการ ${data.totalRecipients} คน)\n\n` +
      `📅 วันที่: ${data.scheduledDate}\n` +
      `⏰ เวลา: ${data.scheduledTime}\n` +
      `${locationText}\n\n` +
      `💆 รายละเอียดงาน:\n${recipientDetails}`
  } else {
    // Single booking
    messageText =
      `🔔 มีงานใหม่!\n\n` +
      `💆 บริการ: ${data.serviceName}\n` +
      `📅 วันที่: ${data.scheduledDate}\n` +
      `⏰ เวลา: ${data.scheduledTime}\n` +
      `⏱️ ระยะเวลา: ${data.durationMinutes} นาที\n` +
      `${locationText}\n` +
      `💰 รายได้: ${data.staffEarnings.toLocaleString()} บาท\n\n` +
      linkText
  }

  const message: LineMessage = { type: 'text', text: messageText }
  return multicast(lineUserIds, [message])
}

/**
 * Send new booking notification to admin via LINE
 */
async function sendNewBookingToAdmin(lineUserIds: string[], data: BookingNotificationData): Promise<boolean> {
  if (lineUserIds.length === 0) return true

  const bookingTypeText = data.isHotelBooking
    ? `🏨 จองผ่านโรงแรม: ${data.hotelName}`
    : `👤 จองโดยลูกค้า`

  const message: LineMessage = {
    type: 'text',
    text:
      `📋 มีการจองใหม่!\n\n` +
      `🔢 เลขที่จอง: ${data.bookingNumber}\n` +
      `👤 ลูกค้า: ${data.customerName}\n` +
      `💆 บริการ: ${data.serviceName}\n` +
      `📅 วันที่: ${data.scheduledDate}\n` +
      `⏰ เวลา: ${data.scheduledTime}\n` +
      `💰 ราคา: ${data.finalPrice.toLocaleString()} บาท\n` +
      `${bookingTypeText}\n\n` +
      `ตรวจสอบรายละเอียดในระบบ Admin`,
  }

  // Send to each admin individually (may have different LINE User IDs)
  let allSuccess = true
  for (const lineUserId of lineUserIds) {
    const success = await pushMessage(lineUserId, [message])
    if (!success) allSuccess = false
  }

  return allSuccess
}

interface JobReAvailableData {
  serviceName: string
  scheduledDate: string
  scheduledTime: string
  address: string
  hotelName?: string | null
  roomNumber?: string | null
  staffEarnings: number
  durationMinutes: number
  newJobId: string
  // Couple context
  isCouple?: boolean
  recipientName?: string | null
  totalRecipients?: number
  activeStaffCount?: number
}

interface JobCancelledAdminData {
  staffName: string
  reason: string
  notes?: string | null
  serviceName: string
  scheduledDate: string
  scheduledTime: string
  customerName: string
  bookingNumber?: string | null
  // Couple context
  isCouple?: boolean
  totalRecipients?: number
  activeStaffCount?: number
}

/**
 * Send re-available job notification to staff via LINE (after cancellation)
 */
async function sendJobReAvailableToStaff(lineUserIds: string[], data: JobReAvailableData): Promise<boolean> {
  if (lineUserIds.length === 0) return true

  const locationText = data.hotelName
    ? `🏨 โรงแรม: ${data.hotelName}${data.roomNumber ? ` ห้อง ${data.roomNumber}` : ''}`
    : `📍 สถานที่: ${data.address}`

  const staffLiffUrl = process.env.STAFF_LIFF_URL || ''
  const linkText = staffLiffUrl
    ? `👉 ดูรายละเอียดงาน:\n${staffLiffUrl}/staff/jobs/${data.newJobId}`
    : 'เปิดแอปเพื่อรับงานนี้'

  let coupleText = ''
  if (data.isCouple) {
    const recipientLabel = data.recipientName || 'ผู้รับบริการ'
    coupleText = `\n👥 Couple booking (${recipientLabel})\n`
  }

  const messageText =
    `🔔 มีงานว่าง! (Staff ยกเลิก)\n\n` +
    `💆 บริการ: ${data.serviceName}\n` +
    `📅 วันที่: ${data.scheduledDate}\n` +
    `⏰ เวลา: ${data.scheduledTime}\n` +
    `⏱️ ระยะเวลา: ${data.durationMinutes} นาที\n` +
    `${locationText}\n` +
    `💰 รายได้: ${data.staffEarnings.toLocaleString()} บาท\n` +
    coupleText + `\n` +
    linkText

  const message: LineMessage = { type: 'text', text: messageText }

  // Use individual push instead of multicast for reliability
  let allSuccess = true
  for (const lineUserId of lineUserIds) {
    const success = await pushMessage(lineUserId, [message])
    if (!success) {
      console.error(`LINE push failed for staff: ${lineUserId}`)
      allSuccess = false
    }
  }
  return allSuccess
}

/**
 * Send job cancellation notification to admin via LINE
 */
async function sendJobCancelledToAdmin(lineUserIds: string[], data: JobCancelledAdminData): Promise<boolean> {
  if (lineUserIds.length === 0) return true

  let coupleInfo = ''
  if (data.isCouple && data.totalRecipients) {
    const active = data.activeStaffCount ?? 0
    coupleInfo = `\n👥 Couple booking: ยังมี Staff รับงานอยู่ ${active}/${data.totalRecipients} ตำแหน่ง`
  }

  const messageText =
    `⚠️ Staff ยกเลิกงาน\n\n` +
    `👤 Staff: ${data.staffName}\n` +
    `📋 เหตุผล: ${data.reason}\n` +
    (data.notes ? `📝 หมายเหตุ: ${data.notes}\n` : '') +
    `\n💆 บริการ: ${data.serviceName}\n` +
    `👤 ลูกค้า: ${data.customerName}\n` +
    `📅 วันที่: ${data.scheduledDate}\n` +
    `⏰ เวลา: ${data.scheduledTime}\n` +
    (data.bookingNumber ? `🔢 เลขที่จอง: ${data.bookingNumber}\n` : '') +
    coupleInfo + `\n\n` +
    `ระบบได้สร้างงานใหม่และแจ้ง Staff อื่นแล้ว`

  const message: LineMessage = { type: 'text', text: messageText }

  let allSuccess = true
  for (const lineUserId of lineUserIds) {
    const success = await pushMessage(lineUserId, [message])
    if (!success) allSuccess = false
  }
  return allSuccess
}

interface BookingCancelledStaffData {
  serviceName: string
  scheduledDate: string
  scheduledTime: string
  address: string
  hotelName?: string | null
  roomNumber?: string | null
  cancellationReason: string
  bookingNumber?: string | null
  refundStatus?: string | null
  refundAmount?: number | null
  cancelledBy?: 'admin' | 'customer'
}

/**
 * Send booking cancellation notification to assigned staff via LINE
 * Called when Admin cancels a booking
 */
async function sendBookingCancelledToStaff(lineUserIds: string[], data: BookingCancelledStaffData): Promise<boolean> {
  if (lineUserIds.length === 0) return true

  const locationText = data.hotelName
    ? `🏨 โรงแรม: ${data.hotelName}`
    : `📍 สถานที่: ${data.address}`

  let refundText = ''
  if (data.refundStatus) {
    const statusMap: Record<string, string> = {
      pending: 'รอดำเนินการ',
      processing: 'กำลังดำเนินการ',
      completed: 'คืนเงินแล้ว',
      failed: 'คืนเงินไม่สำเร็จ',
      not_applicable: 'ไม่มีการคืนเงิน',
    }
    refundText = `\n💰 สถานะคืนเงินลูกค้า: ${statusMap[data.refundStatus] || data.refundStatus}`
    if (data.refundAmount && data.refundAmount > 0) {
      refundText += ` (${data.refundAmount.toLocaleString()} บาท)`
    }
  }

  const cancelledByText = data.cancelledBy === 'customer' ? 'ลูกค้า' : 'แอดมิน'

  const messageText =
    `❌ งานถูกยกเลิกโดย${cancelledByText}\n\n` +
    `💆 บริการ: ${data.serviceName}\n` +
    `📅 วันที่: ${data.scheduledDate}\n` +
    `⏰ เวลา: ${data.scheduledTime}\n` +
    `${locationText}\n` +
    (data.bookingNumber ? `🔢 เลขที่จอง: ${data.bookingNumber}\n` : '') +
    `\n📋 เหตุผล: ${data.cancellationReason}` +
    refundText

  const message: LineMessage = { type: 'text', text: messageText }

  let allSuccess = true
  for (const lineUserId of lineUserIds) {
    const success = await pushMessage(lineUserId, [message])
    if (!success) {
      console.error(`LINE push failed for staff: ${lineUserId}`)
      allSuccess = false
    }
  }
  return allSuccess
}

interface BookingCancelledAdminData {
  bookingNumber: string
  customerName: string
  serviceName: string
  scheduledDate: string
  scheduledTime: string
  cancellationReason: string
  refundAmount?: number | null
  refundPercentage?: number | null
}

/**
 * Send booking cancellation notification to admins via LINE
 * Called when a customer cancels a booking
 */
async function sendBookingCancelledToAdmin(lineUserIds: string[], data: BookingCancelledAdminData): Promise<boolean> {
  if (lineUserIds.length === 0) return true

  let refundText = ''
  if (data.refundAmount && data.refundAmount > 0) {
    refundText = `\n💰 คืนเงิน: ${data.refundAmount.toLocaleString()} บาท`
    if (data.refundPercentage) {
      refundText += ` (${data.refundPercentage}%)`
    }
  }

  const messageText =
    `❌ ลูกค้ายกเลิกการจอง\n\n` +
    `🔢 เลขที่จอง: ${data.bookingNumber}\n` +
    `👤 ลูกค้า: ${data.customerName}\n` +
    `💆 บริการ: ${data.serviceName}\n` +
    `📅 วันที่: ${data.scheduledDate}\n` +
    `⏰ เวลา: ${data.scheduledTime}\n` +
    `\n📋 เหตุผล: ${data.cancellationReason}` +
    refundText

  const message: LineMessage = { type: 'text', text: messageText }

  let allSuccess = true
  for (const lineUserId of lineUserIds) {
    const success = await pushMessage(lineUserId, [message])
    if (!success) {
      console.error(`LINE push failed for admin: ${lineUserId}`)
      allSuccess = false
    }
  }
  return allSuccess
}

interface JobReminderData {
  serviceName: string
  scheduledDate: string
  scheduledTime: string
  address: string
  hotelName?: string | null
  roomNumber?: string | null
  staffEarnings: number
  durationMinutes: number
  customerName: string
  jobId: string
  minutesBefore: number
}

/**
 * Send job reminder notification to a staff member via LINE
 */
async function sendJobReminderToStaff(lineUserId: string, data: JobReminderData): Promise<boolean> {
  const staffLiffUrl = process.env.STAFF_LIFF_URL || ''
  const linkText = staffLiffUrl
    ? `\n👉 ดูรายละเอียด:\n${staffLiffUrl}/staff/jobs/${data.jobId}`
    : ''

  const locationText = data.hotelName
    ? `🏨 โรงแรม: ${data.hotelName}${data.roomNumber ? ` ห้อง ${data.roomNumber}` : ''}`
    : `📍 สถานที่: ${data.address}`

  // Format time label from minutes
  let timeLabel: string
  if (data.minutesBefore < 60) {
    timeLabel = `${data.minutesBefore} นาที`
  } else if (data.minutesBefore < 1440) {
    timeLabel = `${Math.floor(data.minutesBefore / 60)} ชั่วโมง`
  } else {
    timeLabel = `${Math.floor(data.minutesBefore / 1440)} วัน`
  }

  const messageText =
    `⏰ แจ้งเตือน: มีงานใน ${timeLabel}!\n\n` +
    `💆 บริการ: ${data.serviceName}\n` +
    `👤 ลูกค้า: ${data.customerName}\n` +
    `📅 วันที่: ${data.scheduledDate}\n` +
    `🕐 เวลา: ${data.scheduledTime}\n` +
    `⏱️ ระยะเวลา: ${data.durationMinutes} นาที\n` +
    `${locationText}\n` +
    `💰 รายได้: ${data.staffEarnings.toLocaleString()} บาท` +
    linkText

  const message: LineMessage = { type: 'text', text: messageText }
  return pushMessage(lineUserId, [message])
}

interface JobEscalationStaffData {
  serviceName: string
  scheduledDate: string
  scheduledTime: string
  address: string
  hotelName?: string | null
  roomNumber?: string | null
  staffEarnings: number
  durationMinutes: number
  jobId: string
  minutesPending: number
}

/**
 * Send escalation reminder to staff — job still unassigned
 */
async function sendJobEscalationToStaff(lineUserIds: string[], data: JobEscalationStaffData): Promise<boolean> {
  if (lineUserIds.length === 0) return true

  const locationText = data.hotelName
    ? `🏨 โรงแรม: ${data.hotelName}${data.roomNumber ? ` ห้อง ${data.roomNumber}` : ''}`
    : `📍 สถานที่: ${data.address}`

  const staffLiffUrl = process.env.STAFF_LIFF_URL || ''
  const linkText = staffLiffUrl
    ? `👉 กดรับงานเลย:\n${staffLiffUrl}/staff/jobs/${data.jobId}`
    : 'เปิดแอปเพื่อรับงานนี้'

  // Format pending time
  let pendingLabel: string
  if (data.minutesPending < 60) {
    pendingLabel = `${data.minutesPending} นาที`
  } else {
    pendingLabel = `${Math.floor(data.minutesPending / 60)} ชั่วโมง ${data.minutesPending % 60} นาที`
  }

  const messageText =
    `🔔 งานยังไม่มีคนรับ! (รอมาแล้ว ${pendingLabel})\n\n` +
    `💆 บริการ: ${data.serviceName}\n` +
    `📅 วันที่: ${data.scheduledDate}\n` +
    `⏰ เวลา: ${data.scheduledTime}\n` +
    `⏱️ ระยะเวลา: ${data.durationMinutes} นาที\n` +
    `${locationText}\n` +
    `💰 รายได้: ${data.staffEarnings.toLocaleString()} บาท\n\n` +
    linkText

  const message: LineMessage = { type: 'text', text: messageText }
  return multicast(lineUserIds, [message])
}

interface BookingRescheduledStaffData {
  serviceName: string
  oldDate: string
  oldTime: string
  newDate: string
  newTime: string
  address: string
  hotelName?: string | null
  bookingNumber?: string | null
  staffEarnings: number
  durationMinutes: number
  jobId?: string
}

/**
 * Send booking rescheduled notification to assigned staff via LINE
 * Staff needs to re-accept the job after reschedule
 */
async function sendBookingRescheduledToStaff(lineUserIds: string[], data: BookingRescheduledStaffData): Promise<boolean> {
  if (lineUserIds.length === 0) return true

  const locationText = data.hotelName
    ? `🏨 โรงแรม: ${data.hotelName}`
    : `📍 สถานที่: ${data.address}`

  const staffLiffUrl = process.env.STAFF_LIFF_URL || ''
  const linkText = staffLiffUrl && data.jobId
    ? `\n👉 กดรับงานใหม่:\n${staffLiffUrl}/staff/jobs/${data.jobId}`
    : '\n\n⚠️ กรุณาเปิดแอปเพื่อรับงานใหม่อีกครั้ง'

  const messageText =
    `📅 ลูกค้าเลื่อนนัด!\n\n` +
    `💆 บริการ: ${data.serviceName}\n` +
    (data.bookingNumber ? `🔢 เลขที่จอง: ${data.bookingNumber}\n` : '') +
    `\n❌ กำหนดการเดิม:\n` +
    `   📅 ${data.oldDate}\n` +
    `   ⏰ ${data.oldTime}\n` +
    `\n✅ กำหนดการใหม่:\n` +
    `   📅 ${data.newDate}\n` +
    `   ⏰ ${data.newTime}\n` +
    `\n⏱️ ระยะเวลา: ${data.durationMinutes} นาที\n` +
    `${locationText}\n` +
    `💰 รายได้: ${data.staffEarnings.toLocaleString()} บาท\n` +
    `\n⚠️ งานถูกปล่อยให้รับใหม่แล้ว` +
    linkText

  const message: LineMessage = { type: 'text', text: messageText }

  let allSuccess = true
  for (const lineUserId of lineUserIds) {
    const success = await pushMessage(lineUserId, [message])
    if (!success) {
      console.error(`LINE push failed for staff: ${lineUserId}`)
      allSuccess = false
    }
  }
  return allSuccess
}

interface PayoutCompletedData {
  staffName: string
  netAmount: number
  grossEarnings: number
  platformFee: number
  totalJobs: number
  periodStart: string
  periodEnd: string
  transferReference: string
  transferredAt: string
}

/**
 * Send payout completed notification to staff via LINE
 */
async function sendPayoutCompletedToStaff(lineUserId: string, data: PayoutCompletedData): Promise<boolean> {
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  const staffLiffUrl = process.env.STAFF_LIFF_URL || ''
  const linkText = staffLiffUrl
    ? `\n👉 ดูรายละเอียด:\n${staffLiffUrl}/staff/earnings`
    : ''

  const messageText =
    `🎉 แจ้งเตือนการจ่ายเงิน\n\n` +
    `เรียน คุณ${data.staffName}\n\n` +
    `💰 ยอดเงินที่โอนเข้าบัญชี: ฿${data.netAmount.toLocaleString()}\n\n` +
    `📅 รอบการจ่าย: ${formatDate(data.periodStart)} - ${formatDate(data.periodEnd)}\n` +
    `📊 จำนวนงาน: ${data.totalJobs} งาน\n` +
    `💵 รายได้รวม: ฿${data.grossEarnings.toLocaleString()}\n` +
    `🏷️ ค่าธรรมเนียม: -฿${data.platformFee.toLocaleString()}\n` +
    `💰 รายได้สุทธิ: ฿${data.netAmount.toLocaleString()}\n\n` +
    `📝 หมายเลขอ้างอิง: ${data.transferReference}\n` +
    `📆 วันที่โอน: ${formatDate(data.transferredAt)}\n\n` +
    `ขอบคุณสำหรับการให้บริการที่ดีเสมอมา! 🙏` +
    linkText

  const message: LineMessage = { type: 'text', text: messageText }
  return pushMessage(lineUserId, [message])
}

export const lineService = {
  pushMessage,
  multicast,
  sendNewJobToStaff,
  sendNewBookingToAdmin,
  sendJobReAvailableToStaff,
  sendJobCancelledToAdmin,
  sendBookingCancelledToStaff,
  sendBookingCancelledToAdmin,
  sendBookingRescheduledToStaff,
  sendJobReminderToStaff,
  sendJobEscalationToStaff,
  sendPayoutCompletedToStaff,
}

export type { LineMessage, JobNotificationData, BookingNotificationData, JobReAvailableData, JobCancelledAdminData, BookingCancelledStaffData, BookingCancelledAdminData, BookingRescheduledStaffData, JobReminderData, JobEscalationStaffData, PayoutCompletedData }
