import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

type Booking = Database['public']['Tables']['bookings']['Row'];
type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
type BookingAddonInsert = Database['public']['Tables']['booking_addons']['Insert'];

interface BookingDetails extends Booking {
  service?: Database['public']['Tables']['services']['Row'];
  staff?: Database['public']['Tables']['staff']['Row'];
  customer?: Database['public']['Tables']['customers']['Row'];
  delivery_address?: Database['public']['Tables']['addresses']['Row'];
  addons?: Array<{
    id: string;
    quantity: number;
    price_per_unit: number;
    total_price: number;
    addon: Database['public']['Tables']['service_addons']['Row'];
  }>;
}

/**
 * Get customer bookings with all related data
 */
export async function getCustomerBookings(
  client: SupabaseClient<Database>,
  customerId: string
): Promise<BookingDetails[]> {
  const { data, error } = await client
    .from('bookings')
    .select(`
      *,
      service:services(*),
      staff(*),
      customer:customers(*)
    `)
    .eq('customer_id', customerId)
    .order('booking_date', { ascending: false });

  if (error) throw error;
  return data as BookingDetails[];
}

/**
 * Get bookings by status
 */
export async function getBookingsByStatus(
  client: SupabaseClient<Database>,
  customerId: string,
  status: Database['public']['Enums']['booking_status']
): Promise<BookingDetails[]> {
  const { data, error } = await client
    .from('bookings')
    .select(`
      *,
      service:services(*),
      staff(*),
      customer:customers(*)
    `)
    .eq('customer_id', customerId)
    .eq('status', status)
    .order('booking_date', { ascending: false });

  if (error) throw error;
  return data as BookingDetails[];
}

/**
 * Get booking by ID with full details
 */
export async function getBookingById(
  client: SupabaseClient<Database>,
  bookingId: string
): Promise<BookingDetails | null> {
  const { data: booking, error: bookingError } = await client
    .from('bookings')
    .select(`
      *,
      service:services(*),
      staff(*),
      customer:customers(*)
    `)
    .eq('id', bookingId)
    .single();

  if (bookingError) {
    if (bookingError.code === 'PGRST116') return null;
    throw bookingError;
  }

  // Get booking addons
  const { data: addons, error: addonsError } = await client
    .from('booking_addons')
    .select(`
      id,
      quantity,
      price_per_unit,
      total_price,
      addon:service_addons(*)
    `)
    .eq('booking_id', bookingId);

  if (addonsError) throw addonsError;

  return {
    ...booking,
    addons: addons as any,
  } as BookingDetails;
}

/**
 * Get booking by booking number
 */
export async function getBookingByNumber(
  client: SupabaseClient<Database>,
  bookingNumber: string
): Promise<BookingDetails | null> {
  const { data: booking, error: bookingError } = await client
    .from('bookings')
    .select(`
      *,
      service:services(*),
      staff(*),
      customer:customers(*)
    `)
    .eq('booking_number', bookingNumber)
    .single();

  if (bookingError) {
    if (bookingError.code === 'PGRST116') return null;
    throw bookingError;
  }

  // Get booking addons
  const { data: addons, error: addonsError } = await client
    .from('booking_addons')
    .select(`
      id,
      quantity,
      price_per_unit,
      total_price,
      addon:service_addons(*)
    `)
    .eq('booking_id', booking.id);

  if (addonsError) throw addonsError;

  return {
    ...booking,
    addons: addons as any,
  } as BookingDetails;
}

/**
 * Create new booking with add-ons
 */
export async function createBooking(
  client: SupabaseClient<Database>,
  booking: BookingInsert,
  addons?: Array<Omit<BookingAddonInsert, 'booking_id'>>
): Promise<Booking> {
  const { data, error } = await client
    .from('bookings')
    .insert(booking)
    .select()
    .single();

  if (error) throw error;

  // Insert add-ons if provided
  if (addons && addons.length > 0) {
    const bookingAddons = addons.map((addon) => ({
      ...addon,
      booking_id: data.id,
    }));

    const { error: addonsError } = await client
      .from('booking_addons')
      .insert(bookingAddons);

    if (addonsError) throw addonsError;
  }

  return data;
}

/**
 * Cancel booking
 */
export async function cancelBooking(
  client: SupabaseClient<Database>,
  bookingId: string
): Promise<Booking> {
  const { data, error } = await client
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get upcoming bookings (confirmed or pending, future dates)
 */
export async function getUpcomingBookings(
  client: SupabaseClient<Database>,
  customerId: string
): Promise<BookingDetails[]> {
  const { data, error } = await client
    .from('bookings')
    .select(`
      *,
      service:services(*),
      staff(*),
      customer:customers(*)
    `)
    .eq('customer_id', customerId)
    .in('status', ['confirmed', 'pending'])
    .gte('booking_date', new Date().toISOString())
    .order('booking_date', { ascending: true });

  if (error) throw error;
  return data as BookingDetails[];
}

export const bookingService = {
  getCustomerBookings,
  getBookingsByStatus,
  getBookingById,
  getBookingByNumber,
  createBooking,
  cancelBooking,
  getUpcomingBookings,
};
