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

    // 4.5. Calculate fixed staff earnings for extension
    const staffEarnings = await calculateStaffExtensionEarnings(
      booking,
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

    // 6. Update job total_staff_earnings
    await updateJobStaffEarnings(request.bookingId, staffEarnings);

    // 7. Calculate new totals
    const newTotalPrice = booking.final_price + extensionPrice;
    const originalDuration = booking.booking_services
      .reduce((sum, service) => sum + service.duration, 0);
    const newTotalDuration = originalDuration + request.additionalDuration;

    // 8. Calculate estimated end time
    const estimatedEndTime = calculateEstimatedEndTime(booking, request.additionalDuration);

    // 9. Send notifications (non-blocking)
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

  // Get hotel discount information (prefer discount_amount)
  const { data: hotel } = await supabase
    .from('hotels')
    .select('discount_amount, discount_rate')
    .eq('id', booking.hotel_id)
    .single();

  const hotelDiscountAmount = hotel?.discount_amount || 0;
  const hotelDiscountRate = hotel?.discount_rate || 0; // backward compatibility

  const currentTotalDuration = booking.booking_services
    .reduce((sum, bs) => sum + bs.duration, 0);

  // Generate extension options from service duration_options
  const availableDurations = service.duration_options || [60, 90, 120];

  return availableDurations
    .filter(duration => duration > 0) // Only positive durations
    .map(duration => {
      const extensionPrice = calculateServicePriceWithDiscount(service, duration, hotelDiscountAmount, hotelDiscountRate);
      return {
        duration,
        price: extensionPrice,
        totalNewDuration: currentTotalDuration + duration,
        totalNewPrice: booking.final_price + extensionPrice,
        isAvailable: (currentTotalDuration + duration) <= EXTENSION_BUSINESS_RULES.MAX_SESSION_DURATION,
        label: `ขยายเป็น ${currentTotalDuration + duration} นาที (+${duration} นาที)`
      };
    })
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

  // Get hotel discount information (prefer discount_amount)
  const { data: hotel } = await supabase
    .from('hotels')
    .select('discount_amount, discount_rate')
    .eq('id', booking.hotel_id)
    .single();

  const hotelDiscountAmount = hotel?.discount_amount || 0;
  const hotelDiscountRate = hotel?.discount_rate || 0; // backward compatibility

  return calculateServicePriceWithDiscount(service, additionalDuration, hotelDiscountAmount, hotelDiscountRate);
}

/**
 * Calculate service price for given duration (with hotel discount)
 * Updated to use new discount_amount system
 */
function calculateServicePriceWithDiscount(service: any, duration: number, hotelDiscountAmount: number = 0, hotelDiscountRate: number = 0): number {
  // Get original price for this duration using admin-set prices
  let originalPrice: number;

  if (duration === 60 && service.price_60) {
    originalPrice = service.price_60;
  } else if (duration === 90 && service.price_90) {
    originalPrice = service.price_90;
  } else if (duration === 120 && service.price_120) {
    originalPrice = service.price_120;
  } else {
    // Fallback: calculate proportional price
    const baseRate = service.hotel_price / service.duration;
    originalPrice = Math.round(baseRate * duration);
  }

  // Apply discount - prefer discount_amount (fixed baht) over discount_rate (percentage)
  if (hotelDiscountAmount > 0) {
    // New system: fixed baht discount
    const actualDiscount = Math.min(hotelDiscountAmount, originalPrice);
    return Math.round(originalPrice - actualDiscount);
  } else if (hotelDiscountRate > 0) {
    // Legacy system: percentage discount (backward compatibility)
    const percentDiscount = originalPrice * (hotelDiscountRate / 100);
    return Math.round(originalPrice - percentDiscount);
  }

  return originalPrice;
}

/**
 * Calculate staff earnings for extension service (fixed amount system)
 */
async function calculateStaffExtensionEarnings(
  booking: BookingWithExtensions,
  additionalDuration: number
): Promise<number> {
  // Get service to determine fixed staff earnings
  const { data: service } = await supabase
    .from('services')
    .select('price_60, price_90, price_120')
    .eq('id', booking.booking_services[0].service_id)
    .single();

  if (!service) {
    throw new ExtensionError(
      ExtensionErrorCode.DATABASE_ERROR,
      'ไม่พบข้อมูลบริการสำหรับคำนวณรายได้ staff'
    );
  }

  // Calculate staff earnings based on admin-set customer prices (fixed amounts)
  let staffEarnings: number;

  if (additionalDuration === 60 && service.price_60) {
    staffEarnings = service.price_60;
  } else if (additionalDuration === 90 && service.price_90) {
    staffEarnings = service.price_90;
  } else if (additionalDuration === 120 && service.price_120) {
    staffEarnings = service.price_120;
  } else {
    // Fallback: proportional calculation from 60-minute base
    const baseEarnings = service.price_60 || 0;
    staffEarnings = Math.round((baseEarnings / 60) * additionalDuration);
  }

  console.log('💰 Extension Staff Fixed Earnings:', {
    additionalDuration,
    staffEarnings,
    service: `${service.price_60}/${service.price_90}/${service.price_120}`
  });

  return staffEarnings;
}

/**
 * Update job total_staff_earnings with extension earnings (fixed amount system)
 */
async function updateJobStaffEarnings(
  bookingId: string,
  additionalEarnings: number
): Promise<void> {
  // Get the job associated with this booking
  const { data: job } = await supabase
    .from('jobs')
    .select('id, staff_earnings, total_staff_earnings')
    .eq('booking_id', bookingId)
    .single();

  if (!job) {
    throw new ExtensionError(
      ExtensionErrorCode.DATABASE_ERROR,
      'ไม่พบข้อมูล job สำหรับอัปเดต staff earnings'
    );
  }

  // Calculate new total earnings (base + all extensions)
  const baseEarnings = job.staff_earnings || 0;

  // Get all extension services for this booking to calculate total extension earnings
  const { data: allExtensions } = await supabase
    .from('booking_services')
    .select('price')
    .eq('booking_id', bookingId)
    .eq('is_extension', true);

  const totalExtensionEarnings = (allExtensions || []).reduce((sum, ext) => sum + (ext.price || 0), 0);
  const newTotalEarnings = baseEarnings + totalExtensionEarnings + additionalEarnings;

  // Update total_staff_earnings in jobs table
  const { error } = await supabase
    .from('jobs')
    .update({ total_staff_earnings: newTotalEarnings })
    .eq('id', job.id);

  if (error) {
    throw new ExtensionError(
      ExtensionErrorCode.DATABASE_ERROR,
      `ไม่สามารถอัปเดต staff earnings ได้: ${error.message}`
    );
  }

  console.log('💰 Updated Staff Earnings (Fixed Amount):', {
    bookingId,
    jobId: job.id,
    baseEarnings,
    totalExtensionEarnings,
    additionalEarnings,
    newTotalEarnings
  });
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