/**
 * Overdue Bill Calculator Utility
 * คำนวณวันเลยกำหนดชำระและสถานะความเร่งด่วน
 *
 * สำหรับระบบแจ้งเตือนบิลค้างชำระของโรงแรม
 */

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
 * กำหนด: วันที่ 15 ของเดือนถัดไป
 * @param month - เดือน (YYYY-MM)
 * @returns วันกำหนดชำระ (YYYY-MM-DD)
 */
export function createDueDate(month: string): string {
  const billMonth = new Date(month + '-01')
  const dueDate = new Date(billMonth)
  dueDate.setMonth(dueDate.getMonth() + 1)
  dueDate.setDate(15) // กำหนดชำระวันที่ 15
  return dueDate.toISOString().split('T')[0] // Return YYYY-MM-DD
}

/**
 * วิเคราะห์สถานะความเร่งด่วนจากจำนวนวันเลยกำหนด
 * @param overdueDays - จำนวนวันเลยกำหนด
 * @returns ข้อมูลสถานะความเร่งด่วน
 */
export function getOverdueStatus(overdueDays: number): OverdueStatus {
  if (overdueDays < -7) {
    // มากกว่า 7 วันก่อนกำหนด
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
    // 1-7 วันก่อนกำหนด
    return {
      level: 'DUE_SOON',
      days: overdueDays,
      color: 'blue',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
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
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      icon: '📋',
      message: 'กำหนดชำระวันนี้',
      actionRequired: true
    }
  } else if (overdueDays <= 7) {
    // เลยกำหนด 1-7 วัน
    return {
      level: 'OVERDUE',
      days: overdueDays,
      color: 'yellow',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      icon: '🟡',
      message: `เลยกำหนด ${overdueDays} วัน`,
      actionRequired: true
    }
  } else if (overdueDays <= 15) {
    // เลยกำหนด 8-15 วัน
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
    // เลยกำหนด 15+ วัน
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
 * @param status - สถานะจาก getOverdueStatus
 * @param amount - ยอดเงิน (optional)
 * @returns ข้อความแจ้งเตือนที่เหมาะสม
 */
export function formatOverdueMessage(status: OverdueStatus, amount?: number): {
  title: string
  description: string
  actionText: string
} {
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
        description: `${amountText} - เตรียมความพร้อมสำหรับการชำระ`,
        actionText: 'ติดตามการชำระ'
      }

    case 'OVERDUE':
      return {
        title: `${status.icon} บิลค้างชำระ`,
        description: `${amountText} - ${status.message} แนะนำให้ติดตาม`,
        actionText: 'ติดตามการชำระ'
      }

    case 'WARNING':
      return {
        title: `${status.icon} เตือน: บิลค้างชำระ`,
        description: `${amountText} - ${status.message} ควรติดตามเร่งด่วน`,
        actionText: 'ติดต่อเร่งด่วน'
      }

    case 'URGENT':
      return {
        title: `${status.icon} ด่วน: บิลค้างชำระนาน`,
        description: `${amountText} - ${status.message} จำเป็นต้องดำเนินการทันที`,
        actionText: 'ติดต่อทันที'
      }

    default:
      return {
        title: `${status.icon} บิลค้างชำระ`,
        description: `${amountText} - ${status.message}`,
        actionText: 'ตรวจสอบ'
      }
  }
}

/**
 * คำนวณสถานะสำหรับบิลรายเดือน
 * @param month - เดือน (YYYY-MM)
 * @param currentDate - วันปัจจุบัน (optional)
 * @returns สถานะความเร่งด่วน
 */
export function getMonthlyBillStatus(month: string, currentDate?: Date): OverdueStatus {
  const dueDate = createDueDate(month)
  const overdueDays = calculateOverdueDays(dueDate, currentDate)
  return getOverdueStatus(overdueDays)
}

/**
 * ตัวอย่างการใช้งาน - สำหรับทดสอบ
 */
export const overdueCalculatorExample = {
  // สำหรับเดือนมกราคม 2026 (กำหนดชำระ 15 ก.พ. 2026)
  january2026: () => {
    const status = getMonthlyBillStatus('2026-01')
    const message = formatOverdueMessage(status, 28750)

    console.log('🔍 ตัวอย่าง: บิลเดือนมกราคม 2026')
    console.log('📅 กำหนดชำระ:', createDueDate('2026-01'))
    console.log('📊 สถานะ:', status.level, `(${status.days} วัน)`)
    console.log('🎨 สี:', status.color, status.bgColor)
    console.log('💬 ข้อความ:', message.title)
    console.log('📝 รายละเอียด:', message.description)
    console.log('🎯 การดำเนินการ:', message.actionText)

    return { status, message }
  }
}