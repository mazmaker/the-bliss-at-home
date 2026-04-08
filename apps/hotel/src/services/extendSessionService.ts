/**
 * Hotel App - Extend Session Service
 * Core business logic for booking extensions
 */

import { supabase } from '@bliss/supabase/auth';
import {
  ExtendSessionRequest,
  ExtendSessionResponse,
  ExtensionOption,
  ExtensionValidationResult,
  StaffAssignmentResult,
  ExtensionError,
  ExtensionErrorCode,
  EXTENSION_BUSINESS_RULES,
  EXTENSION_ERROR_MESSAGES,
  BookingWithExtensions,
  BookingServiceExtended
} from '../types/extendSession';

/**
 * Main function to extend a booking session
 */
export async function extendBookingSession(
  request: ExtendSessionRequest
): Promise<ExtendSessionResponse> {

  console.log('🔄 Starting extend session process:', request);

  // Validate user authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new ExtensionError(
      ExtensionErrorCode.DATABASE_ERROR,
      'ไม่ได้ล็อกอิน'
    );
  }

  try {
    // 1. Validate extension request
    const validation = await validateExtensionRequest(request.bookingId);
    if (!validation.isValid) {
      throw new ExtensionError(
        ExtensionErrorCode.INVALID_STATUS,
        validation.errors.join(', ')
      );
    }

    // 2. Get booking with current services
    const booking = await getBookingWithExtensions(request.bookingId);
    if (!booking) {
      throw new ExtensionError(
        ExtensionErrorCode.BOOKING_NOT_FOUND,
        EXTENSION_ERROR_MESSAGES.BOOKING_NOT_FOUND
      );
    }

    // 3. Calculate extension price
    const extensionPrice = await calculateExtensionPrice(
      booking,
      request.additionalDuration
    );

    // 4. Assign staff for extension
    const staffAssignment = await assignStaffForExtension(
      request.bookingId,
      request.additionalDuration
    );

    // 5. Create extension service record
    const newBookingService = await createExtensionService({
      bookingId: request.bookingId,
      serviceId: booking.booking_services[0].service_id, // Use original service
      duration: request.additionalDuration,
      price: extensionPrice,
      recipientIndex: booking.booking_services[0].recipient_index,
      recipientName: booking.booking_services[0].recipient_name,
      originalBookingServiceId: booking.booking_services[0].id
    });

    // 6. Calculate new totals
    const newTotalPrice = booking.final_price + extensionPrice;
    const originalDuration = booking.booking_services
      .reduce((sum, service) => sum + service.duration, 0);
    const newTotalDuration = originalDuration + request.additionalDuration;

    // 7. Calculate estimated end time
    const estimatedEndTime = calculateEstimatedEndTime(booking, request.additionalDuration);

    // 8. Send notifications (non-blocking)
    notifyStaffAboutExtension(
      staffAssignment.assignedStaffId,
      request.bookingId,
      request.additionalDuration
    ).catch(error => {
      console.warn('Failed to send staff notification:', error);
    });

    console.log('✅ Extension completed successfully:', {
      bookingId: request.bookingId,
      extensionPrice,
      newTotalDuration,
      staffAssigned: staffAssignment.assignedStaffId
    });

    return {
      success: true,
      newBookingService,
      staffAssignment,
      pricing: {
        extensionPrice,
        newTotalPrice,
        originalPrice: booking.final_price
      },
      timing: {
        newTotalDuration,
        originalDuration,
        estimatedEndTime
      },
      metadata: {
        extensionCount: booking.extension_count + 1,
        timestamp: new Date()
      }
    };

  } catch (error) {
    console.error('❌ Extension failed:', error);

    if (error instanceof ExtensionError) {
      throw error;
    }

    throw new ExtensionError(
      ExtensionErrorCode.DATABASE_ERROR,
      `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get available extension options for a booking
 */
export async function getExtensionOptions(bookingId: string): Promise<ExtensionOption[]> {
  const booking = await getBookingWithExtensions(bookingId);
  if (!booking) {
    throw new ExtensionError(
      ExtensionErrorCode.BOOKING_NOT_FOUND,
      EXTENSION_ERROR_MESSAGES.BOOKING_NOT_FOUND
    );
  }

  // Get the original service to determine available durations
  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', booking.booking_services[0].service_id)
    .single();

  if (!service) {
    throw new ExtensionError(
      ExtensionErrorCode.DATABASE_ERROR,
      'ไม่พบข้อมูลบริการ'
    );
  }

  // Get hotel discount rate
  const { data: hotel } = await supabase
    .from('hotels')
    .select('discount_rate')
    .eq('id', booking.hotel_id)
    .single();

  const hotelDiscountRate = hotel?.discount_rate || 0;

  const currentTotalDuration = booking.booking_services
    .reduce((sum, bs) => sum + bs.duration, 0);

  // Generate extension options from service duration_options
  const availableDurations = service.duration_options || [60, 90, 120];

  return availableDurations
    .filter(duration => duration > 0) // Only positive durations
    .map(duration => ({
      duration,
      price: calculateServicePrice(service, duration, hotelDiscountRate),
      totalNewDuration: currentTotalDuration + duration,
      totalNewPrice: booking.final_price + calculateServicePrice(service, duration, hotelDiscountRate),
      isAvailable: (currentTotalDuration + duration) <= EXTENSION_BUSINESS_RULES.MAX_SESSION_DURATION,
      label: `ขยายเป็น ${currentTotalDuration + duration} นาที (+${duration} นาที)`
    }))
    .filter(option => option.isAvailable);
}

/**
 * Validate if extension is possible
 */
async function validateExtensionRequest(bookingId: string): Promise<ExtensionValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (!booking) {
    errors.push(EXTENSION_ERROR_MESSAGES.BOOKING_NOT_FOUND);
    return {
      isValid: false,
      errors,
      warnings,
      canExtend: false,
      maxExtensionsReached: false,
      timeConstraints: {
        minutesUntilEnd: 0,
        canExtendUntil: new Date(),
        isWithinDeadline: false
      }
    };
  }

  // Check booking status
  if (!['confirmed', 'in_progress'].includes(booking.status)) {
    errors.push(EXTENSION_ERROR_MESSAGES.INVALID_STATUS);
  }

  // Check extension count limit
  const maxExtensionsReached = (booking.extension_count || 0) >= EXTENSION_BUSINESS_RULES.MAX_EXTENSIONS;
  if (maxExtensionsReached) {
    errors.push(EXTENSION_ERROR_MESSAGES.MAX_EXTENSIONS_REACHED);
  }

  // Time constraints (simplified for now)
  const now = new Date();
  const scheduledTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
  const minutesUntilEnd = Math.max(0, Math.floor((scheduledTime.getTime() - now.getTime()) / (1000 * 60)));
  const isWithinDeadline = minutesUntilEnd >= EXTENSION_BUSINESS_RULES.EXTENSION_DEADLINE;

  if (!isWithinDeadline && minutesUntilEnd > 0) {
    errors.push(EXTENSION_ERROR_MESSAGES.EXTENSION_TOO_LATE);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    canExtend: errors.length === 0,
    maxExtensionsReached,
    timeConstraints: {
      minutesUntilEnd,
      canExtendUntil: new Date(now.getTime() + (EXTENSION_BUSINESS_RULES.EXTENSION_DEADLINE * 60000)),
      isWithinDeadline
    }
  };
}

/**
 * Calculate price for extension
 */
async function calculateExtensionPrice(
  booking: BookingWithExtensions,
  additionalDuration: number
): Promise<number> {

  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', booking.booking_services[0].service_id)
    .single();

  if (!service) {
    throw new ExtensionError(
      ExtensionErrorCode.DATABASE_ERROR,
      'ไม่พบข้อมูลบริการสำหรับการคำนวณราคา'
    );
  }

  // Get hotel discount rate
  const { data: hotel } = await supabase
    .from('hotels')
    .select('discount_rate')
    .eq('id', booking.hotel_id)
    .single();

  const hotelDiscountRate = hotel?.discount_rate || 0;

  return calculateServicePrice(service, additionalDuration, hotelDiscountRate);
}

/**
 * Calculate service price for given duration (with hotel discount)
 */
function calculateServicePrice(service: any, duration: number, hotelDiscountRate: number = 0): number {
  let basePrice: number;

  // Get price based on duration
  switch(duration) {
    case 60:
      basePrice = service.price_60 || (service.base_price * 0.5);
      break;
    case 90:
      basePrice = service.price_90 || (service.base_price * 0.75);
      break;
    case 120:
      basePrice = service.price_120 || service.base_price;
      break;
    default:
      // Calculate proportional price
      basePrice = (service.base_price / service.duration) * duration;
  }

  // Apply hotel discount (using actual hotel discount rate, fallback to 0%)
  const discountMultiplier = 1 - (hotelDiscountRate / 100);
  const hotelRate = Math.floor(basePrice * discountMultiplier);

  return hotelRate;
}

/**
 * Assign staff for extension (simplified version)
 */
async function assignStaffForExtension(
  bookingId: string,
  additionalDuration: number
): Promise<StaffAssignmentResult> {

  // For now, assume original staff is available
  // TODO: Implement proper staff availability checking

  const { data: booking } = await supabase
    .from('bookings')
    .select('staff_id')
    .eq('id', bookingId)
    .single();

  if (!booking?.staff_id) {
    throw new ExtensionError(
      ExtensionErrorCode.STAFF_NOT_AVAILABLE,
      'ไม่พบข้อมูล Staff ที่รับผิดชอบการจอง'
    );
  }

  return {
    assignedStaffId: booking.staff_id,
    isOriginalStaff: true,
    reason: 'Staff เดิมพร้อมให้บริการต่อ',
    availability: {
      available: true
    }
  };
}

/**
 * Create extension service record in database
 */
async function createExtensionService(params: {
  bookingId: string;
  serviceId: string;
  duration: number;
  price: number;
  recipientIndex: number;
  recipientName: string | null;
  originalBookingServiceId: string;
}): Promise<BookingServiceExtended> {

  // Get next sort order
  const { data: existingServices } = await supabase
    .from('booking_services')
    .select('sort_order')
    .eq('booking_id', params.bookingId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = (existingServices?.[0]?.sort_order || 0) + 1;

  // Insert new booking service
  const { data, error } = await supabase
    .from('booking_services')
    .insert({
      booking_id: params.bookingId,
      service_id: params.serviceId,
      duration: params.duration,
      price: params.price,
      recipient_index: params.recipientIndex,
      recipient_name: params.recipientName,
      sort_order: nextSortOrder,
      is_extension: true,
      extended_at: new Date().toISOString(),
      original_booking_service_id: params.originalBookingServiceId
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create extension service:', error);
    throw new ExtensionError(
      ExtensionErrorCode.DATABASE_ERROR,
      'ไม่สามารถบันทึกข้อมูลการขยายเวลาได้'
    );
  }

  return data;
}

/**
 * Get booking with all extensions
 */
async function getBookingWithExtensions(bookingId: string): Promise<BookingWithExtensions | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      booking_services (*)
    `)
    .eq('id', bookingId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Calculate estimated end time after extension
 */
function calculateEstimatedEndTime(
  booking: BookingWithExtensions,
  additionalDuration: number
): Date {
  const baseEndTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
  const currentTotalDuration = booking.booking_services
    .reduce((sum, service) => sum + service.duration, 0);

  baseEndTime.setMinutes(baseEndTime.getMinutes() + currentTotalDuration + additionalDuration);

  return baseEndTime;
}

/**
 * Send notification to staff about extension
 */
async function notifyStaffAboutExtension(
  staffId: string,
  bookingId: string,
  additionalDuration: number
): Promise<void> {

  console.log('📨 Sending extension notification to staff:', {
    staffId,
    bookingId,
    additionalDuration
  });

  // TODO: Implement actual notification system
  // This could be LINE notification, in-app notification, etc.

  try {
    // Placeholder for notification implementation
    const notification = {
      staffId,
      type: 'booking_extension',
      title: '🔔 เพิ่มเวลาบริการ',
      message: `การจองมีการเพิ่มเวลา ${additionalDuration} นาที`,
      data: {
        bookingId,
        additionalDuration,
        timestamp: new Date().toISOString()
      }
    };

    console.log('Notification would be sent:', notification);

    // When notification system is ready:
    // await lineNotificationService.sendToStaff(notification);
    // await inAppNotificationService.create(notification);

  } catch (error) {
    console.warn('Failed to send staff notification:', error);
    // Don't throw error - notification failure shouldn't block extension
  }
}