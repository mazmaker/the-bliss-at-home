/**
 * Payment Types
 * Type definitions for Omise payment integration
 */

export type PaymentMethod = 'credit_card' | 'promptpay' | 'internet_banking' | 'cash'

export type PaymentStatus = 'pending' | 'processing' | 'successful' | 'failed' | 'refunded' | 'cancelled'

export interface CardDetails {
  name: string
  number: string
  expiration_month: string
  expiration_year: string
  security_code: string
}

export interface OmiseToken {
  id: string
  object: string
  livemode: boolean
  location: string
  used: boolean
  card: {
    id: string
    object: string
    brand: string
    last_digits: string
    expiration_month: number
    expiration_year: number
  }
}

export interface OmiseCharge {
  id: string
  object: string
  amount: number
  currency: string
  status: string
  created: string
  transaction?: string
  card?: {
    id: string
    brand: string
    last_digits: string
  }
  source?: {
    id: string
    type: string
  }
}

export interface PaymentRequest {
  amount: number
  currency?: string
  description: string
  metadata?: Record<string, any>
  token?: string // Omise token for card payment
  source?: string // Omise source for PromptPay/Internet Banking
  return_uri?: string // For redirectable payment methods
}

export interface PaymentResponse {
  success: boolean
  charge?: OmiseCharge
  error?: string
  paymentUrl?: string // For PromptPay QR or Internet Banking redirect
}

export interface Transaction {
  id: string
  booking_id: string
  customer_id: string
  amount: number
  currency: string
  payment_method: PaymentMethod
  status: PaymentStatus
  omise_charge_id?: string
  omise_token_id?: string
  card_brand?: string
  card_last_digits?: string
  description: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface RefundRequest {
  charge_id: string
  amount?: number // Partial refund if specified, full refund if not
  reason?: string
}

export interface RefundResponse {
  success: boolean
  refund?: {
    id: string
    amount: number
    status: string
  }
  error?: string
}

export interface Receipt {
  transaction_id: string
  booking_id: string
  customer_name: string
  customer_email: string
  service_name: string
  amount: number
  payment_method: PaymentMethod
  card_last_digits?: string
  transaction_date: string
  receipt_number: string
  tax_amount?: number
  total_amount: number
}
