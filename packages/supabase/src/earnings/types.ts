/**
 * Earnings & Payout Types for Staff App
 */

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type PayoutPeriod = 'daily' | 'weekly' | 'biweekly' | 'monthly'

export interface Payout {
  id: string
  staff_id: string

  // Period info
  period_start: string
  period_end: string
  period_type: PayoutPeriod

  // Amount details
  gross_earnings: number
  platform_fee: number
  net_amount: number
  total_jobs: number

  // Payment info
  status: PayoutStatus
  bank_account_id: string | null
  transfer_reference: string | null
  transfer_slip_url: string | null
  transferred_at: string | null

  // Notes
  notes: string | null

  // Timestamps
  created_at: string
  updated_at: string
}

export interface BankAccount {
  id: string
  staff_id: string
  bank_code: string
  bank_name: string
  account_number: string
  account_name: string
  is_primary: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
}

export interface EarningsSummary {
  // Today
  today_earnings: number
  today_jobs: number
  today_hours: number

  // This week
  week_earnings: number
  week_jobs: number
  week_hours: number

  // This month
  month_earnings: number
  month_jobs: number
  month_hours: number

  // Pending payout
  pending_payout: number

  // Average
  average_per_job: number
  average_rating: number
}

export interface DailyEarning {
  date: string
  earnings: number
  jobs: number
  hours: number
}

export interface ServiceEarning {
  service_name: string
  service_name_en: string | null
  total_earnings: number
  total_jobs: number
  percentage: number
}

export interface PayoutNotification {
  id: string
  payout_id: string
  staff_id: string
  type: 'payout_completed' | 'payout_failed' | 'payout_pending'
  title: string
  message: string
  read: boolean
  created_at: string
}

// Thai bank codes
export const THAI_BANKS = [
  { code: 'BBL', name: 'ธนาคารกรุงเทพ', name_en: 'Bangkok Bank' },
  { code: 'KBANK', name: 'ธนาคารกสิกรไทย', name_en: 'Kasikornbank' },
  { code: 'KTB', name: 'ธนาคารกรุงไทย', name_en: 'Krungthai Bank' },
  { code: 'SCB', name: 'ธนาคารไทยพาณิชย์', name_en: 'Siam Commercial Bank' },
  { code: 'BAY', name: 'ธนาคารกรุงศรีอยุธยา', name_en: 'Bank of Ayudhya' },
  { code: 'TMB', name: 'ธนาคารทหารไทยธนชาต', name_en: 'TMBThanachart Bank' },
  { code: 'GSB', name: 'ธนาคารออมสิน', name_en: 'Government Savings Bank' },
  { code: 'BAAC', name: 'ธนาคาร ธ.ก.ส.', name_en: 'Bank for Agriculture' },
  { code: 'TISCO', name: 'ธนาคารทิสโก้', name_en: 'TISCO Bank' },
  { code: 'KKP', name: 'ธนาคารเกียรตินาคินภัทร', name_en: 'Kiatnakin Phatra Bank' },
  { code: 'CIMB', name: 'ธนาคารซีไอเอ็มบี', name_en: 'CIMB Thai Bank' },
  { code: 'UOB', name: 'ธนาคารยูโอบี', name_en: 'United Overseas Bank' },
  { code: 'LH', name: 'ธนาคารแลนด์ แอนด์ เฮ้าส์', name_en: 'Land and Houses Bank' },
] as const

export type BankCode = typeof THAI_BANKS[number]['code']
