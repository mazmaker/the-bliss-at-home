import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

type Booking = Database['public']['Tables']['bookings']['Row'];
type BookingInsert = Database['public']['Tables']['bookings']['Insert'];
type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerInsert = Database['public']['Tables']['customers']['Insert'];
type Service = Database['public']['Tables']['services']['Row'];
type Staff = Database['public']['Tables']['staff']['Row'];

// Admin Quick Booking interfaces
export interface AdminBookingInput {
  customer_id: string;
  service_id: string;
  booking_date: string;
  booking_time: string;
  duration?: number;
  staff_id?: string;
  is_hotel_booking?: boolean;
  hotel_id?: string;
  hotel_room_number?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  discount_amount?: number;
  discount_code_applied?: string;
  payment_method_recorded?: string;
  admin_notes?: string;
  admin_override_restrictions?: boolean;
}

export interface CustomerSearchInput {
  phone?: string;
  name?: string;
  email?: string;
}

export interface CustomerCreateInput {
  full_name: string;
  phone: string;
  address?: string;
  date_of_birth?: string;
  preferences?: any;
  admin_notes?: string;
  preferred_contact_method?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
}

export interface PricingCalculation {
  base_price: number;
  discount_amount: number;
  final_price: number;
  customer_discount?: number;
  code_discount?: number;
}

export interface StaffAssignmentResult {
  staff: Staff;
  score: number;
  availability: boolean;
  reasoning: string;
}

/**
 * Search customers by phone, name, or email
 */
export async function searchCustomers(
  client: SupabaseClient<Database>,
  searchInput: CustomerSearchInput,
  limit: number = 10
): Promise<Customer[]> {
  let query = client.from('customers').select(`
    *,
    profile:profiles(full_name, avatar_url)
  `);

  // Build search conditions
  const conditions = [];

  if (searchInput.phone) {
    conditions.push(`phone.ilike.%${searchInput.phone}%`);
  }

  if (searchInput.name) {
    conditions.push(`full_name.ilike.%${searchInput.name}%`);
  }

  if (searchInput.email) {
    // Search in profiles table for email
    query = query.or(`profile.email.ilike.%${searchInput.email}%`);
  }

  if (conditions.length > 0) {
    query = query.or(conditions.join(','));
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

/**
 * Create new customer for admin booking
 */
export async function createCustomer(
  client: SupabaseClient<Database>,
  customerInput: CustomerCreateInput
): Promise<Customer> {
  // Get current admin user
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Admin not authenticated');

  // Validate phone number format (basic Thai phone validation)
  const cleanPhone = customerInput.phone.replace(/[^\d]/g, '');
  if (cleanPhone.length !== 10 || !cleanPhone.startsWith('0')) {
    throw new Error('เบอร์โทรศัพท์ไม่ถูกต้อง กรุณากรอกเบอร์ 10 หลัก');
  }

  // Check if customer already exists
  const existing = await searchCustomers(client, { phone: cleanPhone });
  if (existing.length > 0) {
    throw new Error('ลูกค้ามีอยู่ในระบบแล้ว');
  }

  const { data, error } = await client
    .from('customers')
    .insert({
      ...customerInput,
      phone: cleanPhone,
      created_by_admin: true,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Calculate pricing for admin booking
 */
export async function calculateBookingPricing(
  client: SupabaseClient<Database>,
  serviceId: string,
  customerId: string,
  isHotelBooking: boolean = false,
  discountCode?: string
): Promise<PricingCalculation> {
  // Get service details
  const { data: service, error: serviceError } = await client
    .from('services')
    .select('base_price, hotel_price')
    .eq('id', serviceId)
    .single();

  if (serviceError) throw serviceError;

  // Get customer details for loyalty discounts
  const { data: customer, error: customerError } = await client
    .from('customers')
    .select('total_bookings, total_spent')
    .eq('id', customerId)
    .single();

  if (customerError) throw customerError;

  // Calculate base price
  const base_price = isHotelBooking ? service.hotel_price : service.base_price;

  let discount_amount = 0;
  let customer_discount = 0;
  let code_discount = 0;

  // Calculate customer loyalty discount
  if (customer.total_bookings >= 10) {
    customer_discount = base_price * 0.1; // 10% for loyal customers
  } else if (customer.total_bookings >= 5) {
    customer_discount = base_price * 0.05; // 5% for returning customers
  }

  // Calculate discount code (if provided)
  if (discountCode) {
    const { data: discount, error: discountError } = await client
      .from('discount_codes')
      .select('*')
      .eq('code', discountCode)
      .eq('is_active', true)
      .gte('valid_until', new Date().toISOString())
      .single();

    if (!discountError && discount) {
      if (discount.discount_type === 'percentage') {
        code_discount = base_price * (discount.discount_value / 100);
      } else {
        code_discount = discount.discount_value;
      }
    }
  }

  discount_amount = customer_discount + code_discount;
  const final_price = Math.max(0, base_price - discount_amount);

  return {
    base_price,
    discount_amount,
    final_price,
    customer_discount,
    code_discount
  };
}

/**
 * Auto-assign staff based on availability and skills
 */
export async function autoAssignStaff(
  client: SupabaseClient<Database>,
  serviceId: string,
  bookingDate: string,
  bookingTime: string,
  duration: number
): Promise<StaffAssignmentResult | null> {
  // Get staff with skills for this service
  const { data: staff, error } = await client
    .from('staff')
    .select(`
      *,
      profiles!inner(full_name, avatar_url),
      staff_skills!inner(service_id)
    `)
    .eq('status', 'active')
    .eq('staff_skills.service_id', serviceId);

  if (error || !staff || staff.length === 0) {
    return null;
  }

  // Check availability for each staff member
  const bookingDateTime = new Date(`${bookingDate}T${bookingTime}`);
  const endDateTime = new Date(bookingDateTime.getTime() + duration * 60000);

  const availableStaff = [];

  for (const staffMember of staff) {
    // Check for conflicting bookings
    const { data: conflicts } = await client
      .from('bookings')
      .select('id, booking_date, booking_time, duration')
      .eq('staff_id', staffMember.id)
      .eq('booking_date', bookingDate)
      .in('status', ['confirmed', 'in_progress']);

    let isAvailable = true;

    if (conflicts) {
      for (const conflict of conflicts) {
        const conflictStart = new Date(`${conflict.booking_date}T${conflict.booking_time}`);
        const conflictEnd = new Date(conflictStart.getTime() + conflict.duration * 60000);

        if (
          (bookingDateTime >= conflictStart && bookingDateTime < conflictEnd) ||
          (endDateTime > conflictStart && endDateTime <= conflictEnd) ||
          (bookingDateTime <= conflictStart && endDateTime >= conflictEnd)
        ) {
          isAvailable = false;
          break;
        }
      }
    }

    if (isAvailable) {
      // Calculate score based on various factors
      const score = calculateStaffScore(staffMember, {
        serviceMatch: 1.0, // They have the skill (from inner join)
        workload: await getWorkloadScore(client, staffMember.id, bookingDate),
        rating: staffMember.rating || 0,
        availability: 1.0
      });

      availableStaff.push({
        staff: staffMember,
        score,
        availability: true,
        reasoning: `Available staff with rating ${staffMember.rating}/5`
      });
    }
  }

  // Return highest scored available staff
  if (availableStaff.length === 0) return null;

  availableStaff.sort((a, b) => b.score - a.score);
  return availableStaff[0];
}

/**
 * Calculate staff scoring for assignment
 */
function calculateStaffScore(
  staff: any,
  factors: {
    serviceMatch: number;
    workload: number;
    rating: number;
    availability: number;
  }
): number {
  return (
    factors.serviceMatch * 0.4 +
    factors.availability * 0.3 +
    factors.rating * 0.2 +
    (1 - factors.workload) * 0.1 // Lower workload = higher score
  );
}

/**
 * Get staff workload score (0 = no bookings, 1 = fully booked)
 */
async function getWorkloadScore(
  client: SupabaseClient<Database>,
  staffId: string,
  date: string
): Promise<number> {
  const { data: bookings } = await client
    .from('bookings')
    .select('duration')
    .eq('staff_id', staffId)
    .eq('booking_date', date)
    .in('status', ['confirmed', 'in_progress']);

  if (!bookings || bookings.length === 0) return 0;

  const totalMinutes = bookings.reduce((sum, booking) => sum + booking.duration, 0);
  const maxDailyMinutes = 8 * 60; // 8 hours

  return Math.min(totalMinutes / maxDailyMinutes, 1);
}

/**
 * Create admin booking
 */
export async function createAdminBooking(
  client: SupabaseClient<Database>,
  bookingInput: AdminBookingInput
): Promise<Booking> {
  // Get current admin user
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Admin not authenticated');

  // Calculate pricing
  const pricing = await calculateBookingPricing(
    client,
    bookingInput.service_id,
    bookingInput.customer_id,
    bookingInput.is_hotel_booking,
    bookingInput.discount_code_applied
  );

  // Get service duration if not provided
  let duration = bookingInput.duration;
  if (!duration) {
    const { data: service } = await client
      .from('services')
      .select('duration')
      .eq('id', bookingInput.service_id)
      .single();
    duration = service?.duration || 60;
  }

  // Auto-assign staff if not provided
  let staffId = bookingInput.staff_id;
  if (!staffId) {
    const assignment = await autoAssignStaff(
      client,
      bookingInput.service_id,
      bookingInput.booking_date,
      bookingInput.booking_time,
      duration
    );
    staffId = assignment?.staff.id;
  }

  // Create booking
  const bookingData: BookingInsert = {
    customer_id: bookingInput.customer_id,
    service_id: bookingInput.service_id,
    staff_id: staffId,
    hotel_id: bookingInput.hotel_id,
    booking_date: bookingInput.booking_date,
    booking_time: bookingInput.booking_time,
    duration,
    is_hotel_booking: bookingInput.is_hotel_booking || false,
    hotel_room_number: bookingInput.hotel_room_number,
    address: bookingInput.address,
    latitude: bookingInput.latitude,
    longitude: bookingInput.longitude,
    base_price: pricing.base_price,
    discount_amount: pricing.discount_amount,
    final_price: pricing.final_price,
    status: 'pending', // Staff must accept first
    payment_status: 'pending',
    created_by_admin_id: user.id,
    booking_source: 'admin_app',
    payment_method_recorded: bookingInput.payment_method_recorded,
    admin_override_restrictions: bookingInput.admin_override_restrictions || false,
    discount_code_applied: bookingInput.discount_code_applied,
    admin_notes: bookingInput.admin_notes
  };

  const { data: booking, error } = await client
    .from('bookings')
    .insert(bookingData)
    .select(`
      *,
      customer:customers(*),
      service:services(*),
      staff:staff(*, profiles(*))
    `)
    .single();

  if (error) throw error;

  // Send notification to assigned staff (if any)
  if (staffId) {
    await notifyStaffOfNewBooking(client, booking.id, staffId);
  }

  return booking;
}

/**
 * Send notification to staff about new admin booking
 */
async function notifyStaffOfNewBooking(
  client: SupabaseClient<Database>,
  bookingId: string,
  staffId: string
): Promise<void> {
  try {
    // Insert notification for staff
    await client
      .from('notifications')
      .insert({
        user_id: staffId,
        title: '📋 งานใหม่จาก Admin',
        message: 'มีการจองใหม่ผ่าน Admin ที่ต้องการการยืนยัน กรุณาเข้าดูรายละเอียด',
        type: 'new_booking',
        data: {
          booking_id: bookingId,
          source: 'admin',
          priority: 'high'
        }
      });

    // TODO: Send LINE notification if LINE integration exists
    // TODO: Send push notification if configured

  } catch (error) {
    console.error('Failed to send staff notification:', error);
    // Don't throw - booking should still succeed even if notification fails
  }
}