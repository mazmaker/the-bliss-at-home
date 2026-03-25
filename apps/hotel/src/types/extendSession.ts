/**
 * Hotel App - Extend Session Types
 * TypeScript type definitions for booking extension feature
 */

export interface ExtendSessionRequest {
  bookingId: string;
  additionalDuration: number; // 60, 90, 120 minutes
  notes?: string;
  requestedBy?: 'hotel_staff' | 'customer';
}

export interface ExtensionOption {
  duration: number;        // Extension duration (60, 90, 120)
  price: number;          // Hotel rate price for this duration
  totalNewDuration: number; // Current duration + extension duration
  totalNewPrice: number;   // Current price + extension price
  isAvailable: boolean;   // Whether this option is available
  label: string;          // Display label (e.g., "ขยายเป็น 90 นาที (+30 นาที)")
}

export interface StaffAssignmentResult {
  assignedStaffId: string;
  isOriginalStaff: boolean;
  reason: string;
  alternativeOptions?: Staff[];
  availability?: {
    available: boolean;
    nextAvailableTime?: Date;
    conflictReason?: string;
  };
}

export interface ExtendSessionResponse {
  success: boolean;
  newBookingService: BookingServiceExtended;
  staffAssignment: StaffAssignmentResult;
  pricing: {
    extensionPrice: number;
    newTotalPrice: number;
    originalPrice: number;
  };
  timing: {
    newTotalDuration: number;
    originalDuration: number;
    estimatedEndTime: Date;
  };
  metadata: {
    extensionCount: number;
    timestamp: Date;
  };
}

export interface BookingServiceExtended {
  id: string;
  booking_id: string;
  service_id: string;
  duration: number;
  price: number;
  recipient_index: number;
  recipient_name: string | null;
  sort_order: number;
  is_extension: boolean;
  extended_at: string | null;
  original_booking_service_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingWithExtensions {
  id: string;
  booking_number: string;
  status: string;
  payment_status: string;
  final_price: number;
  extension_count: number;
  last_extended_at: string | null;
  total_extensions_price: number;
  booking_services: BookingServiceExtended[];
  // ... other booking fields
}

export interface ExtensionValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  canExtend: boolean;
  maxExtensionsReached: boolean;
  timeConstraints: {
    minutesUntilEnd: number;
    canExtendUntil: Date;
    isWithinDeadline: boolean;
  };
}

export interface ExtensionBusinessRules {
  MAX_EXTENSIONS: number;           // 3
  MAX_SESSION_DURATION: number;     // 300 minutes (5 hours)
  MIN_EXTENSION_DURATION: number;   // 30 minutes
  EXTENSION_DEADLINE: number;       // 15 minutes before service ends
  MAX_DAILY_STAFF_HOURS: number;    // 8 hours
  REQUIRED_BREAK_MINUTES: number;   // 15 minutes
}

export interface ExtensionAnalytics {
  bookingId: string;
  hotelId: string;
  serviceId: string;
  originalDuration: number;
  extensionDuration: number;
  extensionPrice: number;
  staffId: string;
  isOriginalStaff: boolean;
  requestSource: 'hotel_staff' | 'customer';
  timestamp: Date;
}

// Error types
export enum ExtensionErrorCode {
  BOOKING_NOT_FOUND = 'BOOKING_NOT_FOUND',
  INVALID_STATUS = 'INVALID_STATUS',
  MAX_EXTENSIONS_REACHED = 'MAX_EXTENSIONS_REACHED',
  STAFF_NOT_AVAILABLE = 'STAFF_NOT_AVAILABLE',
  INVALID_DURATION = 'INVALID_DURATION',
  EXTENSION_TOO_LATE = 'EXTENSION_TOO_LATE',
  SESSION_TOO_LONG = 'SESSION_TOO_LONG',
  PAYMENT_ERROR = 'PAYMENT_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR'
}

export class ExtensionError extends Error {
  constructor(
    public code: ExtensionErrorCode,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ExtensionError';
  }
}

// Constants
export const EXTENSION_BUSINESS_RULES: ExtensionBusinessRules = {
  MAX_EXTENSIONS: 3,
  MAX_SESSION_DURATION: 300,  // 5 hours
  MIN_EXTENSION_DURATION: 30,
  EXTENSION_DEADLINE: 15,     // 15 minutes before service ends
  MAX_DAILY_STAFF_HOURS: 8,
  REQUIRED_BREAK_MINUTES: 15
};

export const EXTENSION_ERROR_MESSAGES: Record<ExtensionErrorCode, string> = {
  BOOKING_NOT_FOUND: 'ไม่พบข้อมูลการจองที่ระบุ',
  INVALID_STATUS: 'สถานะการจองไม่อนุญาตให้เพิ่มเวลา',
  MAX_EXTENSIONS_REACHED: 'เพิ่มเวลาได้สูงสุด 3 ครั้งต่อการจอง',
  STAFF_NOT_AVAILABLE: 'ไม่มี Staff ที่ว่างในช่วงเวลาที่ต้องการ',
  INVALID_DURATION: 'ระยะเวลาที่เลือกไม่ถูกต้อง',
  EXTENSION_TOO_LATE: 'ไม่สามารถเพิ่มเวลาได้ เนื่องจากใกล้หมดเวลาบริการแล้ว',
  SESSION_TOO_LONG: 'เวลาบริการรวมไม่สามารถเกิน 5 ชั่วโมง',
  PAYMENT_ERROR: 'เกิดข้อผิดพลาดในการประมวลผลการชำระเงิน',
  DATABASE_ERROR: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง'
};

// Utility type guards
export function isExtensionError(error: any): error is ExtensionError {
  return error instanceof ExtensionError;
}

export function isValidExtensionDuration(duration: number): boolean {
  return [60, 90, 120].includes(duration);
}

export function isExtensionBookingService(
  bookingService: any
): bookingService is BookingServiceExtended {
  return (
    bookingService &&
    typeof bookingService.is_extension === 'boolean' &&
    bookingService.is_extension === true
  );
}