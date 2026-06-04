/**
 * Staff-related type definitions for Admin app
 * Enhanced with payout schedule management
 */

// Base Staff interface (extends database types)
export interface Staff {
  id: string
  profile_id: string | null
  name_th: string
  name_en: string | null
  phone: string
  email: string | null
  avatar_url: string | null
  bio_th: string | null
  bio_en: string | null
  address: string | null
  id_card: string | null
  bank_name: string | null
  bank_account: string | null
  bank_account_name: string | null
  line_user_id: string | null
  is_active: boolean
  is_available: boolean | null
  is_approved: boolean | null
  approve_date: string | null
  status: StaffStatus
  rating: number | null
  total_jobs: number | null
  total_earnings: number | null
  created_at: string | null
  updated_at: string | null

  // New payout fields
  payout_schedule: PayoutSchedule
  custom_payout_interval?: number
  next_payout_date?: string
  last_payout_processed_at?: string
  payout_start_date?: string
}

// Payout schedule types
export type PayoutSchedule =
  | 'weekly'        // 7 วัน
  | 'bi_weekly'     // 15 วัน
  | 'monthly'       // 30 วัน
  | 'custom_days'   // กำหนดเอง

// Staff status enum
export type StaffStatus =
  | 'pending'      // รอการอนุมัติ
  | 'approved'     // อนุมัติแล้ว
  | 'suspended'    // ระงับชั่วคราว
  | 'inactive'     // ไม่ใช้งาน

// Payout schedule option interface
export interface PayoutScheduleOption {
  value: PayoutSchedule
  label: string
  description: string
  detailedDescription?: string
  examples?: string
  intervalDays?: number
  icon: string
  isDefault?: boolean
}

// Available payout schedule options
export const PAYOUT_SCHEDULE_OPTIONS: PayoutScheduleOption[] = [
  {
    value: 'weekly',
    label: 'ทุกสัปดาห์ (7 วัน)',
    description: 'จ่ายเงินทุกสัปดาห์ - เหมาะสำหรับพนักงานที่ต้องการเงินเร็ว',
    detailedDescription: 'รอบจ่ายเงิน: จันทร์-อาทิตย์ จ่ายในวันจันทร์ของสัปดาห์ถัดไป ความถี่สูง เหมาะกับพนักงานที่ต้องการกระแสเงินสดเร็ว',
    examples: 'งวด 1-7 มิ.ย. → จ่าย 8 มิ.ย. | งวด 8-14 มิ.ย. → จ่าย 15 มิ.ย.',
    intervalDays: 7,
    icon: '7d',
    isDefault: true
  },
  {
    value: 'bi_weekly',
    label: 'ทุก 2 สัปดาห์ (15 วัน)',
    description: 'จ่ายเงินทุก 2 สัปดาห์ - สมดุลระหว่างความถี่และจำนวน',
    detailedDescription: 'จ่ายเงินทุก 15 วันนับจากรอบก่อนหน้า ช่วยสร้างสมดุลระหว่างความถี่ในการจ่ายและจำนวนเงินต่อครั้ง',
    examples: 'เริ่ม 1 มิ.ย. → จ่าย 16 มิ.ย. | รอบถัดไป → จ่าย 1 ก.ค.',
    intervalDays: 15,
    icon: '15d'
  },
  {
    value: 'monthly',
    label: 'รายเดือน (30 วัน)',
    description: 'จ่ายเงินทุกเดือน - สะดวกในการจัดการ',
    detailedDescription: 'จ่ายเงินวันที่ 1 ของทุกเดือน ทุกคนได้รับเงินในวันเดียวกัน ง่ายต่อการจัดการทางการเงินและการวางแผน',
    examples: 'ทุกคนจ่าย: 1 ก.ค., 1 ส.ค., 1 ก.ย. (ไม่ว่าเริ่มงานวันไหน)',
    intervalDays: 30,
    icon: '30d'
  },
  {
    value: 'custom_days',
    label: 'กำหนดเอง',
    description: 'กำหนดจำนวนวันเอง (1-90 วัน)',
    detailedDescription: 'ปรับแต่งรอบการจ่ายตามความต้องการเฉพาะ สามารถกำหนดจำนวนวันได้ตั้งแต่ 1-90 วัน เหมาะสำหรับกรณีพิเศษหรือพนักงาน VIP',
    examples: 'เลือก 20 วัน: เริ่ม 1 มิ.ย. → จ่าย 21 มิ.ย. → จ่าย 11 ก.ค.',
    icon: '⚙'
  }
]

// Payout schedule summary interface
export interface PayoutScheduleSummary {
  staffId: string
  staffName: string
  payoutSchedule: PayoutSchedule
  customPayoutInterval?: number
  nextPayoutDate?: string
  lastPayoutProcessedAt?: string
  payoutStartDate?: string
  scheduleDisplayName: string
  scheduleDescription: string
  daysUntilPayout: number
  isPayoutDue: boolean
}

// Form interfaces for payout schedule management
export interface UpdatePayoutScheduleRequest {
  staffId: string
  payoutSchedule: PayoutSchedule
  customPayoutInterval?: number
  payoutStartDate?: string
}

export interface PayoutScheduleUpdateResponse {
  success: boolean
  message: string
  staff?: Staff
  nextPayoutDate?: string
}

// Helper functions
export const getPayoutScheduleOption = (schedule: PayoutSchedule): PayoutScheduleOption | undefined => {
  return PAYOUT_SCHEDULE_OPTIONS.find(option => option.value === schedule)
}

export const getPayoutScheduleLabel = (schedule: PayoutSchedule, customInterval?: number): string => {
  const option = getPayoutScheduleOption(schedule)
  if (!option) return schedule

  if (schedule === 'custom_days' && customInterval) {
    return `กำหนดเอง (${customInterval} วัน)`
  }

  return option.label
}

export const calculateNextPayoutDate = (
  schedule: PayoutSchedule,
  customInterval?: number,
  lastPayout?: string,
  startDate?: string
): Date => {
  const base = lastPayout ? new Date(lastPayout) : (startDate ? new Date(startDate) : new Date())

  switch (schedule) {
    case 'weekly':
      return new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000)
    case 'bi_weekly':
      return new Date(base.getTime() + 15 * 24 * 60 * 60 * 1000)
    case 'monthly':
      // Return 1st of next month (synchronized for all staff)
      return new Date(base.getFullYear(), base.getMonth() + 1, 1)
    case 'custom_days':
      const days = customInterval || 30
      return new Date(base.getTime() + days * 24 * 60 * 60 * 1000)
    default:
      return new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000) // Default to weekly
  }
}

export const getDaysUntilPayout = (nextPayoutDate?: string): number => {
  if (!nextPayoutDate) return 0

  const now = new Date()
  const payoutDate = new Date(nextPayoutDate)
  const diffTime = payoutDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

export const isPayoutDue = (nextPayoutDate?: string): boolean => {
  if (!nextPayoutDate) return false

  const now = new Date()
  const payoutDate = new Date(nextPayoutDate)

  return payoutDate <= now
}