/**
 * Dynamic Overdue Bill Calculator Utility V2
 * คำนวณวันเลยกำหนดชำระและสถานะความเร่งด่วน
 * ใช้การตั้งค่าจาก database แทนการ hard-code
 *
 * สำหรับระบบแจ้งเตือนบิลค้างชำระของโรงแรม
 */

import { getBillingSettings, type BillingSettings } from '../services/billingSettingsService'

// Interface สำหรับสถานะการเตือน
export interface OverdueStatus {
  level: 'CURRENT' | 'DUE_SOON' | 'OVERDUE' | 'WARNING' | 'URGENT'
  days: number
  color: 'green' | 'blue' | 'yellow' | 'orange' | 'red'
  bgColor: string
  textColor: string
  icon: string
  message: string
  actionRequired: boolean
}

/**
 * คำนวณจำนวนวันที่เลยกำหนดชำระ
 * @param dueDate - วันกำหนดชำระ (YYYY-MM-DD)
 * @param currentDate - วันปัจจุบัน (optional, default = วันนี้)
 * @returns จำนวนวันเลยกำหนด (+ = เลยแล้ว, - = ยังไม่เลย, 0 = วันนี้กำหนด)
 */
export function calculateOverdueDays(dueDate: string, currentDate?: Date): number {
  const due = new Date(dueDate)
  const current = currentDate || new Date()

  // Reset time to midnight to compare dates only
  due.setHours(0, 0, 0, 0)
  current.setHours(0, 0, 0, 0)

  const diffTime = current.getTime() - due.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * สร้างวันกำหนดชำระสำหรับเดือนที่ระบุ
 * ใช้การตั้งค่าจาก database แทนการ hard-code
 * @param month - เดือน (YYYY-MM)
 * @param settings - การตั้งค่า billing (optional, จะดึงจาก database ถ้าไม่ระบุ)
 * @returns Promise<string> วันกำหนดชำระ (YYYY-MM-DD)
 */
export async function createDueDate(month: string, settings?: BillingSettings): Promise<string> {
  if (!settings) {
    settings = await getBillingSettings()
  }

  const billMonth = new Date(month + '-01')
  const dueDate = new Date(billMonth)
  dueDate.setMonth(dueDate.getMonth() + settings.due_months_after)

  switch (settings.due_day_type) {
    case 'fixed_day':
      dueDate.setDate(settings.due_day_value)
      break

    case 'month_end':
      // Set to last day of the month
      dueDate.setMonth(dueDate.getMonth() + 1)
      dueDate.setDate(0)
      break

    case 'business_days_after':
      // Add business days (excludes weekends only, no holidays)
      let businessDays = 0
      const currentDate = new Date(dueDate)
      currentDate.setDate(1)

      while (businessDays < settings.due_day_value) {
        currentDate.setDate(currentDate.getDate() + 1)
        const dayOfWeek = currentDate.getDay()
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
          businessDays++
        }
      }
      dueDate.setDate(currentDate.getDate())
      break

    default:
      // Fallback to fixed day 15
      dueDate.setDate(15)
      break
  }

  return dueDate.toISOString().split('T')[0] // Return YYYY-MM-DD
}

/**
 * วิเคราะห์สถานะความเร่งด่วนจากจำนวนวันเลยกำหนด
 * ใช้การตั้งค่าจาก database สำหรับระดับการแจ้งเตือน
 * @param overdueDays - จำนวนวันเลยกำหนด
 * @param settings - การตั้งค่า billing (optional, จะดึงจาก database ถ้าไม่ระบุ)
 * @returns Promise<OverdueStatus> ข้อมูลสถานะความเร่งด่วน
 */
export async function getOverdueStatus(overdueDays: number, settings?: BillingSettings): Promise<OverdueStatus> {
  if (!settings) {
    settings = await getBillingSettings()
  }

  // Check against configured thresholds
  const dueSoonThreshold = -settings.due_soon_days
  const overdueThreshold = settings.overdue_days
  const warningThreshold = settings.warning_days
  const urgentThreshold = settings.urgent_days

  if (overdueDays < dueSoonThreshold) {
    // มากกว่า due_soon_days วันก่อนกำหนด
    return {
      level: 'CURRENT',
      days: overdueDays,
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      icon: '✅',
      message: 'ปัจจุบัน',
      actionRequired: false
    }
  } else if (overdueDays < 0) {
    // ใกล้กำหนด (ตามที่ตั้งค่าไว้)
    return {
      level: 'DUE_SOON',
      days: overdueDays,
      color: 'blue',
      bgColor: 'bg-bliss-100',
      textColor: 'text-bliss-700',
      icon: '📅',
      message: `ใกล้กำหนด ${Math.abs(overdueDays)} วัน`,
      actionRequired: false
    }
  } else if (overdueDays === 0) {
    // วันนี้กำหนดชำระ
    return {
      level: 'DUE_SOON',
      days: overdueDays,
      color: 'blue',
      bgColor: 'bg-bliss-100',
      textColor: 'text-bliss-700',
      icon: '📋',
      message: 'กำหนดชำระวันนี้',
      actionRequired: true
    }
  } else if (overdueDays <= overdueThreshold) {
    // เลยกำหนด (ตามที่ตั้งค่าไว้)
    return {
      level: 'OVERDUE',
      days: overdueDays,
      color: 'yellow',
      bgColor: 'bg-bliss-100',
      textColor: 'text-bliss-700',
      icon: '🟡',
      message: `เลยกำหนด ${overdueDays} วัน`,
      actionRequired: true
    }
  } else if (overdueDays <= warningThreshold) {
    // เตือน (ตามที่ตั้งค่าไว้)
    return {
      level: 'WARNING',
      days: overdueDays,
      color: 'orange',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      icon: '🟠',
      message: `เลยกำหนด ${overdueDays} วัน`,
      actionRequired: true
    }
  } else {
    // ด่วน (มากกว่าที่ตั้งค่าไว้)
    return {
      level: 'URGENT',
      days: overdueDays,
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      icon: '🔴',
      message: `เลยกำหนด ${overdueDays} วัน`,
      actionRequired: true
    }
  }
}

/**
 * สร้างข้อความแจ้งเตือนแบบละเอียด
 * ใช้ข้อความที่กำหนดใน database หรือข้อความเริ่มต้น
 * @param status - สถานะจาก getOverdueStatus
 * @param amount - ยอดเงิน (optional)
 * @param settings - การตั้งค่า billing (optional, จะดึงจาก database ถ้าไม่ระบุ)
 * @returns Promise<object> ข้อความแจ้งเตือนที่เหมาะสม
 */
export async function formatOverdueMessage(
  status: OverdueStatus,
  amount?: number,
  settings?: BillingSettings
): Promise<{
  title: string
  description: string
  actionText: string
}> {
  if (!settings) {
    settings = await getBillingSettings()
  }

  const amountText = amount ? `฿${amount.toLocaleString()}` : ''

  switch (status.level) {
    case 'CURRENT':
      return {
        title: `${status.icon} รายได้ปัจจุบัน`,
        description: `${amountText} - ระบบทำงานปกติ`,
        actionText: 'ดำเนินงานต่อ'
      }

    case 'DUE_SOON':
      return {
        title: `${status.icon} ${status.message}`,
        description: `${amountText} - ${settings.due_soon_message || 'เตรียมความพร้อมสำหรับการชำระ'}`,
        actionText: 'ดูวิธีการชำระ'
      }

    case 'OVERDUE':
      return {
        title: `${status.icon} บิลค้างชำระ`,
        description: `${amountText} - ${settings.overdue_message || status.message + ' ควรจ่ายเงินโดยเร็ว'}`,
        actionText: 'จ่ายเงินเดี๋ยวนี้'
      }

    case 'WARNING':
      return {
        title: `${status.icon} เตือน: บิลค้างชำระ`,
        description: `${amountText} - ${settings.warning_message || status.message + ' ควรติดต่อแอดมินเพื่อจ่ายเงิน'}`,
        actionText: 'ติดต่อแอดมิน'
      }

    case 'URGENT':
      return {
        title: `${status.icon} ด่วน: บิลค้างชำระนาน`,
        description: `${amountText} - ${settings.urgent_message || status.message + ' จำเป็นต้องจ่ายทันที'}`,
        actionText: 'จ่ายด่วน'
      }

    default:
      return {
        title: `${status.icon} บิลค้างชำระ`,
        description: `${amountText} - ${status.message}`,
        actionText: 'ดูรายละเอียด'
      }
  }
}

/**
 * คำนวณสถานะสำหรับบิลรายเดือน
 * ใช้การตั้งค่าจาก database สำหรับทั้งกำหนดชำระและระดับการแจ้งเตือน
 * @param month - เดือน (YYYY-MM)
 * @param currentDate - วันปัจจุบัน (optional)
 * @returns Promise<OverdueStatus> สถานะความเร่งด่วน
 */
export async function getMonthlyBillStatus(month: string, currentDate?: Date): Promise<OverdueStatus> {
  const settings = await getBillingSettings()
  const dueDate = await createDueDate(month, settings)
  const overdueDays = calculateOverdueDays(dueDate, currentDate)
  return await getOverdueStatus(overdueDays, settings)
}

/**
 * คำนวณค่าปรับล่าช้า (ถ้าเปิดใช้งาน)
 * ใช้ระบบคำนวณใหม่: เปอร์เซ็นต์ต่อวัน หรือ ยอดคงที่ต่อวัน
 * @param originalAmount - ยอดเงินเดิม
 * @param overdueDays - จำนวนวันเลยกำหนด
 * @param settings - การตั้งค่า billing (optional, จะดึงจาก database ถ้าไม่ระบุ)
 * @returns Promise<number> ค่าปรับ
 */
export async function calculateLateFee(
  originalAmount: number,
  overdueDays: number,
  settings?: BillingSettings
): Promise<number> {
  if (!settings) {
    settings = await getBillingSettings()
  }

  // ถ้าไม่เปิดใช้งานค่าปรับ
  if (!settings.enable_late_fee) {
    return 0
  }

  // ถ้ายังไม่เลยกำหนด ไม่มีค่าปรับ
  if (overdueDays <= 0) {
    return 0
  }

  let lateFee = 0

  // คำนวณตามประเภทค่าปรับที่เลือก
  if (settings.late_fee_type === 'percentage_per_day') {
    // คำนวณเปอร์เซ็นต์ต่อวัน
    lateFee = (originalAmount * settings.late_fee_percentage / 100) * overdueDays
  } else if (settings.late_fee_type === 'fixed_per_day') {
    // คำนวณยอดคงที่ต่อวัน
    lateFee = settings.late_fee_fixed_amount * overdueDays
  }

  return Math.round(lateFee * 100) / 100 // Round to 2 decimal places
}

/**
 * ดึงข้อมูลการติดต่อแอดมิน
 * @param settings - การตั้งค่า billing (optional, จะดึงจาก database ถ้าไม่ระบุ)
 * @returns Promise<object> ข้อมูลการติดต่อ
 */
export async function getAdminContactInfo(settings?: BillingSettings): Promise<{
  phone?: string
  email?: string
  lineId?: string
}> {
  if (!settings) {
    settings = await getBillingSettings()
  }

  return {
    phone: settings.admin_contact_phone,
    email: settings.admin_contact_email,
    lineId: settings.admin_contact_line_id
  }
}

/**
 * ตัวอย่างการใช้งาน - สำหรับทดสอบ
 */
export const dynamicOverdueCalculatorExample = {
  // ทดสอบกับเดือนปัจจุบัน
  currentMonth: async () => {
    const now = new Date()
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    const settings = await getBillingSettings()
    const dueDate = await createDueDate(month)
    const status = await getMonthlyBillStatus(month)
    const message = await formatOverdueMessage(status, 28750)
    const lateFee = await calculateLateFee(28750, status.days)
    const contactInfo = await getAdminContactInfo()

    console.log('🔍 ตัวอย่าง: บิลเดือนปัจจุบัน')
    console.log('⚙️ การตั้งค่า:', {
      due_day_type: settings.due_day_type,
      due_day_value: settings.due_day_value,
      due_months_after: settings.due_months_after
    })
    console.log('📅 กำหนดชำระ:', dueDate)
    console.log('📊 สถานะ:', status.level, `(${status.days} วัน)`)
    console.log('🎨 สี:', status.color, status.bgColor)
    console.log('💬 ข้อความ:', message.title)
    console.log('📝 รายละเอียด:', message.description)
    console.log('🎯 การดำเนินการ:', message.actionText)
    console.log('💰 ค่าปรับ:', lateFee > 0 ? `฿${lateFee.toLocaleString()}` : 'ไม่มี')
    console.log('📞 ติดต่อ:', contactInfo)

    return { settings, dueDate, status, message, lateFee, contactInfo }
  }
}

// =========================================
// Legacy Support - Backward Compatibility
// =========================================

/**
 * Legacy createDueDate function (synchronous)
 * ใช้ hard-coded values สำหรับ backward compatibility
 * @deprecated Use async createDueDate instead
 */
export function createDueDateLegacy(month: string): string {
  const billMonth = new Date(month + '-01')
  const dueDate = new Date(billMonth)
  dueDate.setMonth(dueDate.getMonth() + 1)
  dueDate.setDate(15) // กำหนดชำระวันที่ 15
  return dueDate.toISOString().split('T')[0] // Return YYYY-MM-DD
}

/**
 * Legacy getOverdueStatus function (synchronous)
 * ใช้ hard-coded values สำหรับ backward compatibility
 * @deprecated Use async getOverdueStatus instead
 */
export function getOverdueStatusLegacy(overdueDays: number): OverdueStatus {
  if (overdueDays < -7) {
    return {
      level: 'CURRENT',
      days: overdueDays,
      color: 'green',
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      icon: '✅',
      message: 'ปัจจุบัน',
      actionRequired: false
    }
  } else if (overdueDays < 0) {
    return {
      level: 'DUE_SOON',
      days: overdueDays,
      color: 'blue',
      bgColor: 'bg-bliss-100',
      textColor: 'text-bliss-700',
      icon: '📅',
      message: `ใกล้กำหนด ${Math.abs(overdueDays)} วัน`,
      actionRequired: false
    }
  } else if (overdueDays === 0) {
    return {
      level: 'DUE_SOON',
      days: overdueDays,
      color: 'blue',
      bgColor: 'bg-bliss-100',
      textColor: 'text-bliss-700',
      icon: '📋',
      message: 'กำหนดชำระวันนี้',
      actionRequired: true
    }
  } else if (overdueDays <= 7) {
    return {
      level: 'OVERDUE',
      days: overdueDays,
      color: 'yellow',
      bgColor: 'bg-bliss-100',
      textColor: 'text-bliss-700',
      icon: '🟡',
      message: `เลยกำหนด ${overdueDays} วัน`,
      actionRequired: true
    }
  } else if (overdueDays <= 15) {
    return {
      level: 'WARNING',
      days: overdueDays,
      color: 'orange',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      icon: '🟠',
      message: `เลยกำหนด ${overdueDays} วัน`,
      actionRequired: true
    }
  } else {
    return {
      level: 'URGENT',
      days: overdueDays,
      color: 'red',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      icon: '🔴',
      message: `เลยกำหนด ${overdueDays} วัน`,
      actionRequired: true
    }
  }
}

/**
 * Legacy getMonthlyBillStatus function (synchronous)
 * ใช้ hard-coded values สำหรับ backward compatibility
 * @deprecated Use async getMonthlyBillStatus instead
 */
export function getMonthlyBillStatusLegacy(month: string, currentDate?: Date): OverdueStatus {
  const dueDate = createDueDateLegacy(month)
  const overdueDays = calculateOverdueDays(dueDate, currentDate)
  return getOverdueStatusLegacy(overdueDays)
}