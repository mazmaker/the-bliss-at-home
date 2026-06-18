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
    // The extension touches the jobs table (staff/admin territory) which the hotel client
    // cannot read/write under RLS. Delegate the whole transaction to the server endpoint
    // (POST /api/bookings/:id/extend, service-role): it validates status/limits/deadline,
    // prices from admin price_60/90/120 (no phantom discount), inserts the extension
    // booking_service, updates booking totals, and notifies staff. Hotel bookings are billed
    // on the monthly credit cycle, so the server skips the per-extension Omise charge.
    const API_BASE_URL = import.meta.env.VITE_API_URL
      || (import.meta.env.PROD ? 'https://the-bliss-at-home-server.vercel.app/api' : 'http://localhost:3000/api');

    let token = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || '';
    } catch { /* endpoint is service-role; token is best-effort */ }

    const response = await fetch(`${API_BASE_URL}/bookings/${request.bookingId}/extend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ additional_duration: request.additionalDuration })
    });

    const data = await response.json();

    if (!response.ok || !data?.success) {
      throw new ExtensionError(
        ExtensionErrorCode.DATABASE_ERROR,
        data?.message || data?.error || `เพิ่มเวลาไม่สำเร็จ (HTTP ${response.status})`
      );
    }

    const ext = data.extension || {};
    const bk = data.booking || {};
    const extensionPrice = ext.final_price ?? ext.extension_price ?? 0;
    const newTotalDuration = bk.new_total_duration ?? request.additionalDuration;
    const newTotalPrice = bk.new_total_price ?? extensionPrice;

    console.log('✅ Extension completed (server-mediated):', { bookingId: request.bookingId, extensionPrice, newTotalDuration });

    return {
      success: true,
      newBookingService: { id: ext.id } as any,
      staffAssignment: {
        assignedStaffId: '',
        isOriginalStaff: true,
        reason: 'Staff เดิมให้บริการต่อ',
        availability: { available: true }
      },
      pricing: {
        extensionPrice,
        newTotalPrice,
        originalPrice: newTotalPrice - extensionPrice
      },
      timing: {
        newTotalDuration,
        originalDuration: newTotalDuration - request.additionalDuration,
        estimatedEndTime: bk.estimated_end_time ? new Date(bk.estimated_end_time) : new Date()
      },
      metadata: {
        extensionCount: bk.extension_count ?? 0,
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

  // Check booking status — extend only while the staff is actively serving (in_progress),
  // not at 'confirmed' (accepted but service not started → no in-service job/earnings yet).
  if (booking.status !== 'in_progress') {
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

  // Apply discount — discount_amount (fixed baht) ONLY.
  // The legacy discount_rate(%) fallback was removed for consistency with catalog/booking
  // pricing (C1): a stale hotels.discount_rate must NOT silently discount extensions
  // (e.g. Hilton discount_rate=20 was knocking 20% off every extension → 799→639).
  if (hotelDiscountAmount > 0) {
    const actualDiscount = Math.min(hotelDiscountAmount, originalPrice);
    return Math.round(originalPrice - actualDiscount);
  }

  return originalPrice;
}

/**
 * Calculate staff earnings for hotel extension (using regular customer price, not hotel discounted price)
 */
async function calculateStaffExtensionEarnings(
  booking: BookingWithExtensions,
  additionalDuration: number
): Promise<number> {
  // Get service with earnings config and regular prices
  const { data: service } = await supabase
    .from('services')
    .select('staff_commission_rate, use_fixed_rate, staff_earning_60, staff_earning_90, staff_earning_120, price_60, price_90, price_120, base_price, duration')
    .eq('id', booking.booking_services[0].service_id)
    .single();

  if (!service) {
    throw new ExtensionError(
      ExtensionErrorCode.DATABASE_ERROR,
      'ไม่พบข้อมูลบริการสำหรับคำนวณรายได้ staff'
    );
  }

  let staffEarnings: number;

  if (service.use_fixed_rate) {
    // Fixed rate: use the fixed amount for this duration
    const fixed = additionalDuration === 60 ? service.staff_earning_60
      : additionalDuration === 120 ? service.staff_earning_120
      : service.staff_earning_90;
    staffEarnings = Math.round(Number(fixed) || 0);
  } else {
    // Commission %: calculate from regular customer price
    let regularPrice: number;
    if (additionalDuration === 60 && service.price_60) {
      regularPrice = service.price_60;
    } else if (additionalDuration === 90 && service.price_90) {
      regularPrice = service.price_90;
    } else if (additionalDuration === 120 && service.price_120) {
      regularPrice = service.price_120;
    } else {
      const baseRate = service.base_price / service.duration;
      regularPrice = Math.round(baseRate * additionalDuration);
    }
    const commissionRate = Number(service.staff_commission_rate) || 0.30;
    const normalizedRate = commissionRate < 1 ? commissionRate * 100 : commissionRate;
    staffEarnings = Math.round(regularPrice * (normalizedRate / 100));
  }

  console.log('💰 Hotel Extension Staff Earnings:', {
    additionalDuration,
    use_fixed_rate: service.use_fixed_rate,
    staffEarnings
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

  // Get all extension services with actual prices paid
  const { data: allExtensions } = await supabase
    .from('booking_services')
    .select('price, duration, service_id, services!inner(staff_commission_rate, use_fixed_rate, staff_earning_60, staff_earning_90, staff_earning_120)')
    .eq('booking_id', bookingId)
    .eq('is_extension', true);

  // Calculate total extension earnings
  const totalExtensionEarnings = (allExtensions || []).reduce((sum, ext) => {
    const svc = ext.services as any;
    let earnings: number;
    if (svc?.use_fixed_rate) {
      const dur = ext.duration || 90;
      const fixed = dur === 60 ? svc.staff_earning_60
        : dur === 120 ? svc.staff_earning_120
        : svc.staff_earning_90;
      earnings = Math.round(Number(fixed) || 0);
    } else {
      const commissionRate = svc?.staff_commission_rate || 0.30;
      const normalizedRate = commissionRate < 1 ? commissionRate * 100 : commissionRate;
      earnings = Math.round((ext.price || 0) * (normalizedRate / 100));
    }
    return sum + earnings;
  }, 0);

  const newTotalEarnings = baseEarnings + totalExtensionEarnings;

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