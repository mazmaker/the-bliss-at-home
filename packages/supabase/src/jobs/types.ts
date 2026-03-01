/**
 * Job/Booking Types for Staff App
 */

export type JobStatus =
  | 'pending'      // รอมอบหมาย - waiting to be assigned
  | 'assigned'     // มอบหมายแล้ว - assigned to staff
  | 'confirmed'    // ยืนยันแล้ว - staff confirmed
  | 'traveling'    // กำลังเดินทาง - staff is traveling
  | 'arrived'      // ถึงแล้ว - staff arrived
  | 'in_progress'  // กำลังดำเนินการ - service in progress
  | 'completed'    // เสร็จสิ้น - job completed
  | 'cancelled'    // ยกเลิก - cancelled

export type JobPaymentStatus =
  | 'pending'      // รอชำระ
  | 'paid'         // ชำระแล้ว
  | 'refunded'     // คืนเงินแล้ว

export interface Hotel {
  id: string
  name_th: string
  name_en?: string
  phone?: string
  address?: string
  latitude?: number
  longitude?: number
}

export interface Booking {
  hotel_id: string
  provider_preference: 'female-only' | 'male-only' | 'prefer-female' | 'prefer-male' | 'no-preference' | null
  hotels?: Hotel
}

export interface Job {
  id: string
  booking_id: string
  staff_id: string | null
  customer_id: string
  hotel_id: string | null

  // Customer info
  customer_name: string
  customer_phone: string | null
  customer_avatar_url: string | null

  // Location info
  hotel_name: string | null
  room_number: string | null
  address: string
  latitude: number | null
  longitude: number | null
  distance_km: number | null

  // Service info
  service_name: string
  service_name_en: string | null
  duration_minutes: number
  scheduled_date: string
  scheduled_time: string

  // Payment info
  amount: number
  staff_earnings: number
  payment_status: JobPaymentStatus

  // Job status
  status: JobStatus
  accepted_at: string | null
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  cancelled_by: 'STAFF' | 'CUSTOMER' | 'ADMIN' | null

  // Notes
  customer_notes: string | null
  staff_notes: string | null

  // Timestamps
  created_at: string
  updated_at: string

  // Related data from joins
  bookings?: Booking      // Hotel information via booking relationship
}

export interface JobWithCustomer extends Job {
  customer: {
    id: string
    full_name: string
    phone: string | null
    avatar_url: string | null
  } | null
}

export interface StaffStats {
  today_jobs_count: number
  today_earnings: number
  today_completed: number
  total_jobs: number
  total_earnings: number
  average_rating: number
  rating_count: number
}

export interface JobFilter {
  status?: JobStatus | JobStatus[]
  date?: string
  date_from?: string
  date_to?: string
}

export interface JobNotification {
  id: string
  job_id: string
  type: 'new_job' | 'job_cancelled' | 'job_updated' | 'payment_received'
  title: string
  message: string
  read: boolean
  created_at: string
}

export interface CancellationReason {
  code: string
  label_th: string
  label_en: string
}

export const CANCELLATION_REASONS: CancellationReason[] = [
  { code: 'EMERGENCY', label_th: 'เหตุฉุกเฉิน', label_en: 'Emergency' },
  { code: 'SICK', label_th: 'ป่วย/ไม่สบาย', label_en: 'Sick / Unwell' },
  { code: 'TRAFFIC', label_th: 'ปัญหาการเดินทาง/รถติด', label_en: 'Traffic / Transportation Issue' },
  { code: 'CUSTOMER_REQUEST', label_th: 'ลูกค้าขอยกเลิก', label_en: 'Customer Requested' },
  { code: 'WRONG_ADDRESS', label_th: 'ที่อยู่ไม่ถูกต้อง', label_en: 'Wrong Address' },
  { code: 'SAFETY_CONCERN', label_th: 'ความปลอดภัย', label_en: 'Safety Concern' },
  { code: 'OTHER', label_th: 'อื่นๆ', label_en: 'Other' },
]
