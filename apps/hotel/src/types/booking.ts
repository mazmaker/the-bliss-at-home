// Enhanced booking types for multi-service support
// Based on the database schema defined in migrations

export interface Service {
  id: string
  name_th: string
  name_en: string
  description_th?: string | null
  description_en?: string | null
  category: 'massage' | 'nail' | 'spa' | 'facial'
  duration: number
  duration_options?: number[] | null
  base_price: number
  hotel_price: number
  image_url?: string | null
  is_active: boolean | null
  sort_order?: number | null
  created_at: string | null
  updated_at: string | null
}

export interface ServiceSelection {
  id: string // unique identifier for this selection
  service: Service
  duration: number // selected duration for this service
  recipientIndex: number // 0 = person 1, 1 = person 2, etc.
  recipientName?: string // optional name for recipient
  price: number // calculated price for this selection
  sortOrder: number // order in the booking
}

export type BookingMode = 'single' | 'couple'
export type CoupleFormat = 'simultaneous' | 'sequential'
export type ServiceFormat = 'single' | 'simultaneous' | 'sequential'

export interface BookingConfiguration {
  mode: BookingMode
  coupleFormat?: CoupleFormat
  selections: ServiceSelection[]
  totalDuration: number
  totalPrice: number
  recipientCount: number
}

// Enhanced booking data that extends the original
export interface BookingData {
  guestName: string
  roomNumber: string
  phoneNumber: string
  numberOfGuests: number
  date: string
  time: string
  notes: string

  // Legacy fields (for backward compatibility)
  selectedDuration: number // will be calculated from serviceConfiguration

  // New multi-service configuration
  serviceConfiguration: BookingConfiguration
}

// Database types for the new tables (will be replaced by generated types)
export interface BookingServiceRecord {
  id: string
  booking_id: string
  service_id: string
  duration: number
  price: number
  recipient_index: number
  recipient_name?: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface EnhancedBookingRecord {
  // All existing booking fields plus:
  is_multi_service: boolean
  service_format: ServiceFormat
  recipient_count: number
  total_calculated_duration?: number | null
  services_total_price?: number | null
}

// Validation types
export interface BookingValidation {
  isValid: boolean
  errors: {
    guestInfo?: string[]
    serviceSelection?: string[]
    dateTime?: string[]
    general?: string[]
  }
}

// Step management
export interface BookingStep {
  step: number
  title: string
  description: string
  isValid: boolean
  canProceed: boolean
}

export interface BookingWizardState {
  currentStep: number
  steps: BookingStep[]
  bookingData: BookingData
  validation: BookingValidation
  isLoading: boolean
  error?: string | null
}

// Helper types for components
export interface ServiceOptionProps {
  service: Service
  isSelected: boolean
  selectedDuration?: number
  onSelect: (service: Service, duration: number) => void
  showPrice: boolean
  recipientIndex: number
}

export interface DurationOption {
  value: number
  label: string
  isAvailable: boolean
}

// Business logic interfaces
export interface PriceCalculator {
  calculateServicePrice: (service: Service, duration: number, mode: BookingMode) => number
  calculateTotalPrice: (selections: ServiceSelection[]) => number
  calculateTotalDuration: (selections: ServiceSelection[], format: ServiceFormat) => number
}

export interface BookingValidator {
  validateServiceSelection: (config: BookingConfiguration) => string[]
  validateGuestInfo: (data: Partial<BookingData>) => string[]
  validateDateTime: (date: string, time: string, duration: number) => string[]
  validateComplete: (data: BookingData) => BookingValidation
}

// Error types
export class BookingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message)
    this.name = 'BookingError'
  }
}

export class ValidationError extends BookingError {
  constructor(message: string, public field: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details)
  }
}