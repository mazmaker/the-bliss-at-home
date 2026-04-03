/**
 * Customer App - Extend Service Types
 * Type definitions for booking service extensions
 */

// Extension Request from Customer
export interface ExtendBookingRequest {
  bookingId: string
  additionalDuration: number  // minutes to add
  paymentMethod?: string     // use existing payment method or select new
  notes?: string            // optional reason/notes
  requestedBy: 'customer'
  promotionId?: string      // promotion/voucher code applied
  discountAmount?: number   // discount amount if promo applied
}

// Extension Response
export interface ExtendBookingResponse {
  success: boolean
  newBookingService: BookingServiceExtended
  pricing: {
    extensionPrice: number
    newTotalPrice: number
    originalPrice: number
  }
  timing: {
    newTotalDuration: number
    originalDuration: number
    estimatedEndTime: string
  }
  paymentStatus: {
    requiresPayment: boolean
    paymentUrl?: string
    paymentReference?: string
  }
  metadata: {
    extensionCount: number
    timestamp: Date
  }
}

// Extension Options Available
export interface ExtensionOption {
  duration: number          // minutes to add
  price: number            // additional cost
  totalNewDuration: number // total duration after extension
  totalNewPrice: number    // total price after extension
  isAvailable: boolean     // can be selected
  description?: string     // human readable description
}

// Booking with Extension Information
export interface BookingWithExtensions {
  id: string
  booking_number: string
  customer_id: string
  status: string
  final_price: number
  duration: number
  extension_count: number
  total_extensions_price: number
  last_extended_at?: string
  payment_method: string
  payment_status: string
  service: {
    id: string
    name_th: string
    name_en: string
    slug: string
    category: string
    image_url?: string
  }
  booking_services: BookingServiceExtended[]
}

// Booking Service with Extension Info
export interface BookingServiceExtended {
  id: string
  service_id: string
  duration: number
  price: number
  is_extension: boolean
  extended_at?: string
  recipient_index: number
  recipient_name: string
  created_at: string
  services: {
    name_th: string
    name_en: string
  }
}

// Extension Status for UI
export interface ExtensionStatus {
  canExtend: boolean
  hasExtensions: boolean
  extensionCount: number
  maxExtensionsReached: boolean
  lastExtendedAt?: string
  reasonIfCannot?: string
}

// Extension Validation
export interface ExtensionValidationResult {
  isValid: boolean
  canExtend: boolean
  errors: string[]
  warnings?: string[]
  maxDurationAllowed?: number
  maxExtensionsReached?: boolean
}

// Extension Error Handling
export enum ExtensionErrorCode {
  BOOKING_NOT_FOUND = 'BOOKING_NOT_FOUND',
  INVALID_STATUS = 'INVALID_STATUS',
  MAX_EXTENSIONS_REACHED = 'MAX_EXTENSIONS_REACHED',
  INVALID_DURATION = 'INVALID_DURATION',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED'
}

export class ExtensionError extends Error {
  constructor(
    public code: ExtensionErrorCode,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'ExtensionError'
  }
}

// Business Rules
export const EXTENSION_BUSINESS_RULES = {
  MAX_EXTENSIONS_PER_BOOKING: 3,
  MIN_EXTENSION_DURATION: 15,   // minutes
  MAX_EXTENSION_DURATION: 120,  // minutes
  ALLOWED_DURATIONS: [15, 30, 45, 60, 90, 120], // minutes - fallback if service doesn't have duration_options
  EXTENSION_PRICE_PER_MINUTE: 9.2, // ฿552 for 60min = ฿9.2/min - legacy pricing
  MAX_TOTAL_DURATION: 360,      // 6 hours max total
  EXTENSION_DEADLINE: 15,       // 15 minutes before service ends
  ALLOWED_STATUSES: ['confirmed', 'in_progress']
}

// Error Messages
export const EXTENSION_ERROR_MESSAGES = {
  BOOKING_NOT_FOUND: 'ไม่พบการจองนี้',
  INVALID_STATUS: 'ไม่สามารถเพิ่มเวลาได้ในสถานะปัจจุบัน',
  MAX_EXTENSIONS_REACHED: `เพิ่มเวลาได้สูงสุด ${EXTENSION_BUSINESS_RULES.MAX_EXTENSIONS_PER_BOOKING} ครั้งต่อการจอง`,
  EXTENSION_TOO_LATE: `ไม่สามารถเพิ่มเวลาได้ เนื่องจากเหลือเวลาน้อยกว่า ${EXTENSION_BUSINESS_RULES.EXTENSION_DEADLINE} นาทีก่อนหมดเวลาบริการ`,
  INVALID_DURATION: 'ระยะเวลาที่เลือกไม่ถูกต้อง',
  PAYMENT_REQUIRED: 'จำเป็นต้องชำระเงินสำหรับการเพิ่มเวลา',
  PAYMENT_FAILED: 'การชำระเงินล้มเหลว',
  DATABASE_ERROR: 'เกิดข้อผิดพลาดกับฐานข้อมูล',
  NETWORK_ERROR: 'ปัญหาการเชื่อมต่อ กรุณาลองใหม่',
  UNAUTHORIZED: 'ไม่ได้รับอนุญาต'
}