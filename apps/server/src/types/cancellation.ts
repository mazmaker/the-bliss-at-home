/**
 * Cancellation and Refund Types
 * Local copy of types for server package
 */

// ============================================
// Refund Types
// ============================================

export type RefundStatus = 'none' | 'pending' | 'processing' | 'completed' | 'failed'

export interface RefundTransaction {
  id: string
  booking_id: string
  payment_transaction_id?: string
  refund_amount: number
  refund_percentage?: number
  status: RefundStatus
  reason?: string
  initiated_by?: string
  omise_refund_id?: string
  error_message?: string
  created_at: string
  updated_at: string
  completed_at?: string
}

export interface CreateRefundTransactionInput {
  booking_id: string
  payment_transaction_id?: string
  refund_amount: number
  refund_percentage?: number
  reason?: string
  initiated_by?: string
}

export interface UpdateRefundTransactionInput {
  status?: RefundStatus
  omise_refund_id?: string
  error_message?: string
  completed_at?: string
}

// ============================================
// Cancellation Types
// ============================================

export type CancellationRecipientType = 'customer' | 'staff' | 'hotel' | 'admin'
export type NotificationChannel = 'email' | 'in_app' | 'line'
export type NotificationStatus = 'pending' | 'sent' | 'failed'

export interface CancellationNotification {
  id: string
  booking_id: string
  recipient_type: CancellationRecipientType
  recipient_id: string
  channel: NotificationChannel
  status: NotificationStatus
  sent_at?: string
  error_message?: string
  created_at: string
}

export interface CreateCancellationNotificationInput {
  booking_id: string
  recipient_type: CancellationRecipientType
  recipient_id: string
  channel: NotificationChannel
  status?: NotificationStatus
}

// ============================================
// Booking Cancellation Request Types
// ============================================

export type RefundOption = 'full' | 'partial' | 'none'

export interface BookingCancellationRequest {
  booking_id: string
  reason: string
  refund_option: RefundOption
  refund_percentage?: number
  notify_customer?: boolean
  notify_staff?: boolean
  notify_hotel?: boolean
}

export interface BookingCancellationResponse {
  booking_id: string
  cancelled_at: string
  refund_transaction_id?: string
  refund_amount?: number
  notifications_sent: {
    customer: boolean
    staff: boolean
    hotel: boolean
    admin: boolean
  }
}

// ============================================
// Refund Info for Notifications
// ============================================

export interface RefundInfo {
  amount: number
  percentage: number
  status: RefundStatus
  expected_days: number
}

// ============================================
// Extended Booking Type with Cancellation Fields
// ============================================

export interface BookingWithCancellation {
  id: string
  status: string
  payment_status?: string
  payment_transaction_id?: string
  omise_charge_id?: string
  cancellation_reason?: string
  cancelled_by?: string
  cancelled_at?: string
  refund_status?: RefundStatus
  refund_amount?: number
  refund_percentage?: number
  refund_transaction?: RefundTransaction
  cancellation_notifications?: CancellationNotification[]
}
