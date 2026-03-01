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
  jobs?: Array<{
    id: string;
    status: string;
    staff_id: string | null;
    created_at: string;
    updated_at: string;
    booking_id: string;
  }>;
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
  // Get bookings first
  const { data: bookings, error } = await client
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

  if (!bookings || bookings.length === 0) {
    return [];
  }

  // Get related jobs for all bookings
  const bookingIds = bookings.map(b => b.id);
  const { data: jobs } = await client
    .from('jobs')
    .select('id, status, staff_id, created_at, updated_at, booking_id')
    .in('booking_id', bookingIds);

  // Combine bookings with their jobs
  const result = bookings.map(booking => ({
    ...booking,
    jobs: jobs?.filter(job => job.booking_id === booking.id) || []
  }));

  return result as BookingDetails[];
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

/**
 * Create booking with services (supports single + couple bookings).
 * Uses direct table inserts into the existing bookings schema.
 * The primary service (person 1) is stored in the bookings row.
 */
export async function createBookingWithServices(
  client: SupabaseClient<Database>,
  bookingData: {
    customer_id: string;
    booking_date: string;
    booking_time: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    customer_notes?: string | null;
    service_format: 'single' | 'simultaneous' | 'sequential';
    recipient_count: number;
    discount_amount?: number;
    final_price: number;
    promotion_id?: string | null;
  },
  services: Array<{
    service_id: string;
    duration: number;
    price: number;
    recipient_index: number;
    recipient_name?: string;
    sort_order?: number;
  }>,
  addons?: Array<Omit<BookingAddonInsert, 'booking_id'>>
): Promise<string> {
  // Use the primary service (person 1 / recipient_index 0) for the booking row
  const primaryService = services.find((s) => s.recipient_index === 0) || services[0];

  const bookingInsert: BookingInsert = {
    customer_id: bookingData.customer_id,
    service_id: primaryService.service_id,
    booking_date: bookingData.booking_date,
    booking_time: bookingData.booking_time,
    duration: primaryService.duration,
    base_price: primaryService.price,
    final_price: bookingData.final_price,
    discount_amount: bookingData.discount_amount || 0,
    address: bookingData.address || null,
    latitude: bookingData.latitude || null,
    longitude: bookingData.longitude || null,
    customer_notes: bookingData.customer_notes || null,
    recipient_count: bookingData.recipient_count,
    service_format: bookingData.service_format,
    promotion_id: bookingData.promotion_id || null,
    is_multi_service: services.length > 1,
    status: 'pending',
    payment_status: 'pending',
  } as any;

  const { data, error } = await client
    .from('bookings')
    .insert(bookingInsert)
    .select()
    .single();

  if (error) throw error;

  const bookingId = data.id;

  // Insert into booking_services for all services (person 1 + person 2)
  const bookingServicesData = services.map((svc) => ({
    booking_id: bookingId,
    service_id: svc.service_id,
    duration: svc.duration,
    price: svc.price,
    recipient_index: svc.recipient_index,
    recipient_name: svc.recipient_name || null,
    sort_order: svc.sort_order || 0,
  }));

  const { error: bsError } = await client
    .from('booking_services')
    .insert(bookingServicesData);

  if (bsError) throw bsError;

  // Insert add-ons if provided
  if (addons && addons.length > 0) {
    const bookingAddons = addons.map((addon) => ({
      ...addon,
      booking_id: bookingId,
    }));

    const { error: addonsError } = await client
      .from('booking_addons')
      .insert(bookingAddons);

    if (addonsError) throw addonsError;
  }

  // Record promotion usage (enables limit enforcement)
  if (bookingData.promotion_id && bookingData.discount_amount) {
    const { data: { user } } = await client.auth.getUser();
    if (user) {
      await client.from('promotion_usage').insert({
        promotion_id: bookingData.promotion_id,
        user_id: user.id,
        booking_id: bookingId,
        discount_amount: bookingData.discount_amount,
      });
    }
  }

  return bookingId;
}

export const bookingService = {
  getCustomerBookings,
  getBookingsByStatus,
  getBookingById,
  getBookingByNumber,
  createBooking,
  createBookingWithServices,
  cancelBooking,
  getUpcomingBookings,
};
