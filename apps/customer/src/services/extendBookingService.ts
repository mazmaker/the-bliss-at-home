/**
 * Customer App - Extend Booking Service
 * Core business logic for customer booking extensions
 */

import { supabase } from '@bliss/supabase/auth'
import {
  ExtendBookingRequest,
  ExtendBookingResponse,
  ExtensionOption,
  ExtensionValidationResult,
  BookingWithExtensions,
  BookingServiceExtended,
  ExtensionError,
  ExtensionErrorCode,
  EXTENSION_BUSINESS_RULES,
  EXTENSION_ERROR_MESSAGES
} from '../types/extendService'

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app' : 'http://localhost:3000')

/**
 * Main function to extend a customer booking
 */
export async function extendCustomerBooking(
  request: ExtendBookingRequest
): Promise<ExtendBookingResponse> {
  console.log('🔄 Customer: Starting extend booking process:', request)

  // Validate user authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new ExtensionError(
      ExtensionErrorCode.UNAUTHORIZED,
      'กรุณาเข้าสู่ระบบก่อนใช้งาน'
    )
  }

  try {
    // 1. Validate extension request
    const validation = await validateCustomerExtensionRequest(request.bookingId)
    if (!validation.isValid) {
      throw new ExtensionError(
        ExtensionErrorCode.INVALID_STATUS,
        validation.errors.join(', ')
      )
    }

    // 2. Get booking details
    const booking = await getCustomerBookingWithExtensions(request.bookingId)
    if (!booking) {
      throw new ExtensionError(
        ExtensionErrorCode.BOOKING_NOT_FOUND,
        EXTENSION_ERROR_MESSAGES.BOOKING_NOT_FOUND
      )
    }

    // 3. Get service data for pricing calculation.
    // Single admin-QuickBooking bookings intentionally have NO booking_services row (legacy/single
    // path — the server extend route falls back to booking.service_id). Mirror that fallback here so
    // the customer extend flow doesn't crash on booking_services[0] ("Cannot read ... 'service_id'").
    const baseService = booking.booking_services?.find(bs => !bs.is_extension) ?? booking.booking_services?.[0]
    const resolvedServiceId = baseService?.service_id ?? booking.service?.id
    if (!resolvedServiceId) {
      throw new ExtensionError(
        ExtensionErrorCode.DATABASE_ERROR,
        'ไม่พบข้อมูลบริการสำหรับการคำนวณราคา'
      )
    }
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', resolvedServiceId)
      .single()

    if (serviceError || !service) {
      throw new ExtensionError(
        ExtensionErrorCode.DATABASE_ERROR,
        'ไม่พบข้อมูลบริการสำหรับการคำนวณราคา'
      )
    }

    // 4. Calculate extension price using service pricing structure
    const extensionPrice = calculateServiceExtensionPrice(service, request.additionalDuration)

    // 5. Create extension via API
    const response = await fetch(`${API_URL}/api/bookings/${request.bookingId}/extend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
      },
      body: JSON.stringify({
        additional_duration: request.additionalDuration,
        notes: request.notes,
        promotion_id: request.promotionId,
        discount_amount: request.discountAmount,
        requested_by: 'customer',
        payment_method: request.paymentMethod || booking.payment_method
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ExtensionError(
        ExtensionErrorCode.DATABASE_ERROR,
        errorData.error || `HTTP ${response.status}`
      )
    }

    const result = await response.json()

    // 5. Extract response data
    if (!result.success) {
      throw new ExtensionError(
        ExtensionErrorCode.DATABASE_ERROR,
        result.message || 'การขยายเวลาล้มเหลว'
      )
    }

    // 6. Format response to match expected interface
    const extendResponse: ExtendBookingResponse = {
      success: true,
      newBookingService: {
        id: result.extension.id,
        booking_id: request.bookingId,
        service_id: resolvedServiceId,
        duration: request.additionalDuration,
        price: result.extension.final_price,
        recipient_index: baseService?.recipient_index ?? 0,
        recipient_name: baseService?.recipient_name ?? '',
        sort_order: (booking.booking_services?.length ?? 0) + 1,
        is_extension: true,
        extended_at: new Date().toISOString(),
        original_booking_service_id: baseService?.id ?? null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      pricing: {
        extensionPrice: result.extension.extension_price,
        newTotalPrice: result.booking.new_total_price,
        originalPrice: booking.final_price
      },
      timing: {
        newTotalDuration: result.booking.new_total_duration,
        originalDuration: result.booking.new_total_duration - request.additionalDuration,
        estimatedEndTime: result.booking.estimated_end_time
      },
      paymentStatus: {
        requiresPayment: result.payment?.requires_payment || false,
        paymentUrl: result.payment?.payment_url || undefined,
        paymentReference: result.payment?.payment_reference || undefined
      },
      metadata: {
        extensionCount: result.booking.extension_count,
        timestamp: new Date()
      }
    }

    console.log('✅ Customer: Extension completed successfully:', extendResponse)
    return extendResponse

  } catch (error) {
    console.error('❌ Customer: Extension failed:', error)

    if (error instanceof ExtensionError) {
      throw error
    }

    throw new ExtensionError(
      ExtensionErrorCode.DATABASE_ERROR,
      `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Get available extension options for customer
 */
export async function getCustomerExtensionOptions(bookingId: string): Promise<ExtensionOption[]> {
  const booking = await getCustomerBookingWithExtensions(bookingId)
  if (!booking) {
    throw new ExtensionError(
      ExtensionErrorCode.BOOKING_NOT_FOUND,
      EXTENSION_ERROR_MESSAGES.BOOKING_NOT_FOUND
    )
  }

  // Get the original service to determine available durations and pricing.
  // Single admin-QuickBooking bookings have NO booking_services row → fall back to the joined
  // top-level service (booking.service.id) instead of crashing on booking_services[0].service_id.
  const baseService = booking.booking_services?.find(bs => !bs.is_extension) ?? booking.booking_services?.[0]
  const resolvedServiceId = baseService?.service_id ?? booking.service?.id
  if (!resolvedServiceId) {
    throw new ExtensionError(
      ExtensionErrorCode.BOOKING_NOT_FOUND,
      'ไม่พบข้อมูลบริการสำหรับการคำนวณราคา'
    )
  }
  const { data: service, error: serviceError } = await supabase
    .from('services')
    .select('*')
    .eq('id', resolvedServiceId)
    .single()

  if (serviceError || !service) {
    throw new ExtensionError(
      ExtensionErrorCode.BOOKING_NOT_FOUND,
      'ไม่พบข้อมูลบริการสำหรับการคำนวณราคา'
    )
  }

  // Calculate current duration from booking_services if available, otherwise use booking.duration.
  // COUPLE/simultaneous bookings have one booking_services row PER RECIPIENT served IN PARALLEL,
  // so the session length is a SINGLE recipient's duration. Summing across recipients would double
  // it (e.g. 120+120=240), pushing the 15-min extension deadline and the MAX_TOTAL_DURATION cap out
  // by a whole recipient. Scope to one recipient (the base row's recipient_index; falls back to 0
  // for legacy single-booking rows). Extensions are applied to that same recipient server-side.
  const targetRecipient = booking.booking_services?.find(s => !s.is_extension)?.recipient_index ?? 0
  const currentDuration = booking.booking_services && booking.booking_services.length > 0
    ? booking.booking_services
        .filter(service => (service.recipient_index ?? 0) === targetRecipient)
        .reduce((sum, service) => sum + service.duration, 0)
    : booking.duration || 0

  // Use service's duration_options or fallback to default
  const availableDurations = service.duration_options || [60, 90, 120]

  // Check 15-minute deadline before service ends
  const now = new Date()
  // +07:00: booking_date+booking_time is Bangkok wall-clock. Parsing device-local mis-computes the
  // 15-min-before-end deadline on any non-Bangkok device. now is an absolute instant. TH = fixed UTC+7.
  const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}+07:00`)
  const currentEndTime = new Date(bookingDateTime.getTime() + (currentDuration * 60 * 1000))
  const deadlineTime = new Date(currentEndTime.getTime() - (15 * 60 * 1000)) // 15 minutes before end
  const withinDeadline = now <= deadlineTime

  const options: ExtensionOption[] = []

  for (const duration of availableDurations) {
    if (duration <= 0) continue

    const newTotalDuration = currentDuration + duration
    const extensionPrice = calculateServiceExtensionPrice(service, duration)
    const newTotalPrice = booking.final_price + extensionPrice

    // Enhanced availability checks
    const isAvailable = (
      withinDeadline &&
      newTotalDuration <= EXTENSION_BUSINESS_RULES.MAX_TOTAL_DURATION &&
      booking.extension_count < EXTENSION_BUSINESS_RULES.MAX_EXTENSIONS_PER_BOOKING &&
      duration >= EXTENSION_BUSINESS_RULES.MIN_EXTENSION_DURATION
    )

    options.push({
      duration,
      price: extensionPrice,
      totalNewDuration: newTotalDuration,
      totalNewPrice: newTotalPrice,
      isAvailable,
      description: `เพิ่ม ${duration} นาที - ฿${extensionPrice.toLocaleString()}`
    })
  }

  return options.filter(option => option.isAvailable)
}

/** One recipient of a booking, with its own service pricing (couple recipients differ). */
export interface ExtensionRecipientInfo {
  recipientIndex: number
  serviceId: string
  serviceNameTh: string
  serviceNameEn: string
  currentDuration: number          // base + already-applied extensions for THIS recipient
  withinDeadline: boolean          // is THIS recipient still >15min from its own end
  prices: Record<number, number>   // duration(min) -> extension price for THIS recipient's service
}

export interface BookingExtensionInfo {
  isCouple: boolean
  recipients: ExtensionRecipientInfo[]
  availableDurations: number[]
  withinDeadline: boolean          // aggregate (earliest-ending recipient) — prefer the per-recipient flag
  extensionCount: number
}

/**
 * Per-recipient extension info for the modal's recipient selector (คนที่1 / คนที่2 / ทั้งคู่).
 * COUPLE/simultaneous bookings have one booking_services base row PER RECIPIENT — each can be a
 * DIFFERENT service at a DIFFERENT price. The modal renders a selector and sums prices for the chosen
 * recipient(s); the server re-derives the authoritative price per recipient, so this drives UX only.
 */
export async function getBookingExtensionInfo(bookingId: string): Promise<BookingExtensionInfo> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id, final_price, duration, booking_date, booking_time, extension_count,
      service:services ( id, name_th, name_en, price_60, price_90, price_120, base_price, duration, duration_options ),
      booking_services (
        id, service_id, duration, recipient_index, recipient_name, is_extension,
        services ( name_th, name_en, price_60, price_90, price_120, base_price, duration, duration_options )
      )
    `)
    .eq('id', bookingId)
    .single()

  if (error || !data) {
    throw new ExtensionError(ExtensionErrorCode.BOOKING_NOT_FOUND, EXTENSION_ERROR_MESSAGES.BOOKING_NOT_FOUND)
  }

  const booking: any = data
  const allRows: any[] = booking.booking_services || []
  const baseRows: any[] = allRows
    .filter((s: any) => !s.is_extension)
    .sort((a: any, b: any) => (a.recipient_index ?? 0) - (b.recipient_index ?? 0))

  // Distinct recipients (couple ⇒ 2). Fall back to the top-level service for legacy single bookings.
  const indices = baseRows.length > 0
    ? Array.from(new Set(baseRows.map((r: any) => r.recipient_index ?? 0))).sort((a, b) => a - b)
    : [0]

  const durationsFrom = (svc: any): number[] => (svc?.duration_options && svc.duration_options.length > 0)
    ? svc.duration_options
    : [60, 90, 120]

  const now = new Date()
  // +07:00: Bangkok wall-clock (see note above) — device-local parse mis-gates the per-recipient
  // extend deadline on a non-Bangkok device.
  const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}+07:00`)

  const recipients: ExtensionRecipientInfo[] = indices.map((idx) => {
    const row = baseRows.find((r: any) => (r.recipient_index ?? 0) === idx)
    const svc = row?.services || booking.service
    // CURRENT duration = base + already-applied extensions for THIS recipient (sum ALL its rows).
    const currentDuration = allRows.length > 0
      ? allRows.filter((r: any) => (r.recipient_index ?? 0) === idx).reduce((sum: number, r: any) => sum + (r.duration || 0), 0)
      : (booking.duration || 0)
    // This recipient's own 15-min deadline (parallel recipients each end at their own time).
    const withinDeadline = now <= new Date(bookingDateTime.getTime() + (currentDuration * 60 * 1000) - (15 * 60 * 1000))
    const prices: Record<number, number> = {}
    for (const d of durationsFrom(svc)) {
      if (d > 0) prices[d] = calculateServiceExtensionPrice(svc, d)
    }
    return {
      recipientIndex: idx,
      serviceId: row?.service_id ?? booking.service?.id,
      serviceNameTh: svc?.name_th ?? '',
      serviceNameEn: svc?.name_en ?? '',
      currentDuration,
      withinDeadline,
      prices,
    }
  })

  const availableDurations = durationsFrom(baseRows[0]?.services || booking.service)

  return {
    isCouple: recipients.length > 1,
    recipients,
    availableDurations,
    withinDeadline: recipients.every((r) => r.withinDeadline),
    extensionCount: booking.extension_count || 0,
  }
}

/**
 * Validate customer extension request
 */
async function validateCustomerExtensionRequest(bookingId: string): Promise<ExtensionValidationResult> {
  try {
    const booking = await getCustomerBookingWithExtensions(bookingId)

    if (!booking) {
      return {
        isValid: false,
        canExtend: false,
        errors: [EXTENSION_ERROR_MESSAGES.BOOKING_NOT_FOUND]
      }
    }

    const errors: string[] = []
    const warnings: string[] = []

    // Check booking status
    if (!EXTENSION_BUSINESS_RULES.ALLOWED_STATUSES.includes(booking.status)) {
      errors.push(EXTENSION_ERROR_MESSAGES.INVALID_STATUS)
    }

    // Check extension limit
    if (booking.extension_count >= EXTENSION_BUSINESS_RULES.MAX_EXTENSIONS_PER_BOOKING) {
      errors.push(EXTENSION_ERROR_MESSAGES.MAX_EXTENSIONS_REACHED)
    }

    // Check payment status
    if (booking.payment_status !== 'paid') {
      warnings.push('การจองยังไม่ได้ชำระเงิน อาจมีข้อจำกัดในการเพิ่มเวลา')
    }

    return {
      isValid: errors.length === 0,
      canExtend: errors.length === 0,
      errors,
      warnings,
      maxExtensionsReached: booking.extension_count >= EXTENSION_BUSINESS_RULES.MAX_EXTENSIONS_PER_BOOKING
    }

  } catch (error) {
    return {
      isValid: false,
      canExtend: false,
      errors: ['เกิดข้อผิดพลาดในการตรวจสอบ']
    }
  }
}

/**
 * Get booking with extension information for customer
 */
async function getCustomerBookingWithExtensions(bookingId: string): Promise<BookingWithExtensions | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      id,
      booking_number,
      customer_id,
      status,
      final_price,
      duration,
      booking_date,
      booking_time,
      extension_count,
      total_extensions_price,
      last_extended_at,
      payment_method,
      payment_status,
      service:services (
        id,
        name_th,
        name_en,
        slug,
        category,
        image_url
      ),
      booking_services (
        id,
        service_id,
        duration,
        price,
        is_extension,
        extended_at,
        recipient_index,
        recipient_name,
        created_at,
        services (
          name_th,
          name_en
        )
      )
    `)
    .eq('id', bookingId)
    .single()

  if (error || !data) {
    console.error('Error fetching booking:', error)
    return null
  }

  return data as BookingWithExtensions
}

/**
 * Calculate extension price for customer
 */
/**
 * Calculate extension price based on service pricing structure
 */
function calculateServiceExtensionPrice(service: any, duration: number): number {
  let basePrice: number

  // Get price based on duration from service pricing structure
  switch(duration) {
    case 60:
      basePrice = service.price_60 || (service.base_price * 0.5)
      break
    case 90:
      basePrice = service.price_90 || (service.base_price * 0.75)
      break
    case 120:
      basePrice = service.price_120 || service.base_price
      break
    case 150:
      basePrice = service.price_150 || (service.base_price * 1.25)
      break
    case 180:
      basePrice = service.price_180 || (service.base_price * 1.5)
      break
    default:
      // Calculate proportional price for custom durations
      basePrice = (service.base_price / service.duration) * duration
  }

  return Math.round(basePrice)
}

function calculateCustomerExtensionPrice(durationMinutes: number): number {
  // Use same pricing as business rules: ฿552 for 60min = ฿9.2/min
  return Math.round(durationMinutes * EXTENSION_BUSINESS_RULES.EXTENSION_PRICE_PER_MINUTE)
}

/**
 * Calculate estimated end time after extension
 */
function calculateEstimatedEndTime(booking: BookingWithExtensions, additionalDuration: number): string {
  // Get original booking start time
  const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`)

  // Add current total duration + extension
  const currentDuration = booking.booking_services && booking.booking_services.length > 0
    ? booking.booking_services.reduce((sum, service) => sum + service.duration, 0)
    : booking.duration || 0
  const newTotalDuration = currentDuration + additionalDuration

  // Calculate end time
  const estimatedEnd = new Date(bookingDateTime.getTime() + (newTotalDuration * 60 * 1000))

  return estimatedEnd.toISOString()
}

/**
 * Get extension status for UI display
 */
export function getCustomerExtensionStatus(booking: BookingWithExtensions): ExtensionStatus {
  const canExtend = (
    EXTENSION_BUSINESS_RULES.ALLOWED_STATUSES.includes(booking.status) &&
    booking.extension_count < EXTENSION_BUSINESS_RULES.MAX_EXTENSIONS_PER_BOOKING
  )

  let reasonIfCannot: string | undefined
  if (!canExtend) {
    if (!EXTENSION_BUSINESS_RULES.ALLOWED_STATUSES.includes(booking.status)) {
      reasonIfCannot = 'การจองไม่อยู่ในสถานะที่สามารถเพิ่มเวลาได้'
    } else if (booking.extension_count >= EXTENSION_BUSINESS_RULES.MAX_EXTENSIONS_PER_BOOKING) {
      reasonIfCannot = EXTENSION_ERROR_MESSAGES.MAX_EXTENSIONS_REACHED
    }
  }

  return {
    canExtend,
    hasExtensions: booking.extension_count > 0,
    extensionCount: booking.extension_count,
    maxExtensionsReached: booking.extension_count >= EXTENSION_BUSINESS_RULES.MAX_EXTENSIONS_PER_BOOKING,
    lastExtendedAt: booking.last_extended_at,
    reasonIfCannot
  }
}