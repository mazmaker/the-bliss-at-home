import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { bookingService } from '../services';
import { Database } from '../types/database.types';

type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
type BookingAddonInsert = Database['public']['Tables']['booking_addons']['Insert'];

/**
 * Get customer bookings with all related data
 */
export function useCustomerBookings(customerId: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['bookings', 'customer', customerId],
    queryFn: (client) => bookingService.getCustomerBookings(client, customerId!),
    enabled: !!customerId,
  });
}

/**
 * Get bookings by status
 */
export function useBookingsByStatus(customerId: string | undefined, status: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['bookings', 'customer', customerId, 'status', status],
    queryFn: (client) => bookingService.getBookingsByStatus(client, customerId!, status!),
    enabled: !!customerId && !!status,
  });
}

/**
 * Get booking by ID with full details
 */
export function useBookingById(bookingId: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['bookings', 'detail', bookingId],
    queryFn: (client) => bookingService.getBookingById(client, bookingId!),
    enabled: !!bookingId,
  });
}

/**
 * Get booking by booking number
 */
export function useBookingByNumber(bookingNumber: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['bookings', 'number', bookingNumber],
    queryFn: (client) => bookingService.getBookingByNumber(client, bookingNumber!),
    enabled: !!bookingNumber,
  });
}

/**
 * Create new booking with add-ons
 */
export function useCreateBooking() {
  return useSupabaseMutation({
    mutationFn: async (
      client,
      {
        booking,
        addons,
      }: {
        booking: BookingInsert;
        addons?: Array<Omit<BookingAddonInsert, 'booking_id'>>;
      }
    ) => {
      return bookingService.createBooking(client, booking, addons);
    },
    invalidateKeys: (result) => [
      ['bookings', 'customer', result?.customer_id],
      ['bookings', 'upcoming', result?.customer_id],
    ],
  });
}

/**
 * Cancel booking
 */
export function useCancelBooking() {
  return useSupabaseMutation({
    mutationFn: async (client, bookingId: string) => {
      return bookingService.cancelBooking(client, bookingId);
    },
    invalidateKeys: (result) => [
      ['bookings', 'customer', result?.customer_id],
      ['bookings', 'detail', result?.id],
      ['bookings', 'upcoming', result?.customer_id],
    ],
  });
}

/**
 * Get upcoming bookings (confirmed or pending, future dates)
 */
export function useUpcomingBookings(customerId: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['bookings', 'upcoming', customerId],
    queryFn: (client) => bookingService.getUpcomingBookings(client, customerId!),
    enabled: !!customerId,
  });
}
