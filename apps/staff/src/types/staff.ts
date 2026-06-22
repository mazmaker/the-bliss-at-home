/**
 * Staff-facing type definitions for payout schedule management
 * Simplified types for the staff app interface
 */

export type PayoutSchedule =
  | 'weekly'
  | 'bi_monthly'
  | 'monthly'
  | 'custom_days'

export interface StaffPayoutInfo {
  payout_schedule: PayoutSchedule
  custom_payout_interval?: number
  next_payout_date?: string
  last_payout_processed_at?: string
  payout_start_date?: string
}

export interface PayoutScheduleDisplay {
  icon: string
  title: string
  description: string
  frequency: string
  color: string
}

export const PAYOUT_SCHEDULE_DISPLAY: Record<PayoutSchedule, PayoutScheduleDisplay> = {
  weekly: {
    icon: '🗓️',
    title: 'ทุกสัปดาห์',
    description: 'รับเงินทุก 7 วัน',
    frequency: '7 วัน',
    color: 'bg-green-100 text-green-800'
  },
  monthly: {
    icon: '🗓️',
    title: 'รายเดือน',
    description: 'รับเงินทุก 30 วัน',
    frequency: '30 วัน',
    color: 'bg-purple-100 text-purple-800'
  },
  bi_monthly: {
    icon: '📋',
    title: 'กลาง+สิ้นเดือน',
    description: 'รับเงิน 2 ครั้งต่อเดือน',
    frequency: 'วันที่ 15 และ 1',
    color: 'bg-amber-100 text-amber-800'
  },
  custom_days: {
    icon: '⚙️',
    title: 'กำหนดเอง',
    description: 'รับเงินตามที่กำหนด',
    frequency: 'ตามที่กำหนด',
    color: 'bg-gray-100 text-gray-800'
  }
}

export function getPayoutDisplayInfo(schedule: PayoutSchedule, customInterval?: number): PayoutScheduleDisplay {
  const display = PAYOUT_SCHEDULE_DISPLAY[schedule]

  if (schedule === 'custom_days' && customInterval) {
    return {
      ...display,
      description: `รับเงินทุก ${customInterval} วัน`,
      frequency: `${customInterval} วัน`
    }
  }

  return display
}

export function getDaysUntilPayout(nextPayoutDate?: string): number {
  if (!nextPayoutDate) return 0

  const now = new Date()
  const payoutDate = new Date(nextPayoutDate)
  const diffTime = payoutDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return Math.max(0, diffDays)
}

export function isPayoutDue(nextPayoutDate?: string): boolean {
  if (!nextPayoutDate) return false

  const now = new Date()
  const payoutDate = new Date(nextPayoutDate)

  return payoutDate <= now
}

export function formatPayoutDate(dateString?: string, short = false): string {
  if (!dateString) return '-'

  const date = new Date(dateString)

  if (short) {
    return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(date)
  }

  return new Intl.DateTimeFormat('th-TH-u-ca-gregory', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(date)
}

export interface PayoutCountdownInfo {
  days: number
  hours: number
  minutes: number
  seconds: number
  isDue: boolean
  isToday: boolean
  isTomorrow: boolean
}

export function getPayoutCountdown(nextPayoutDate?: string): PayoutCountdownInfo {
  if (!nextPayoutDate) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isDue: false,
      isToday: false,
      isTomorrow: false
    }
  }

  const now = new Date()
  const payoutDate = new Date(nextPayoutDate)
  const diffTime = payoutDate.getTime() - now.getTime()

  if (diffTime <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isDue: true,
      isToday: false,
      isTomorrow: false
    }
  }

  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diffTime % (1000 * 60)) / 1000)

  const isToday = days === 0
  const isTomorrow = days === 1

  return {
    days,
    hours,
    minutes,
    seconds,
    isDue: false,
    isToday,
    isTomorrow
  }
}