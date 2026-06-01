import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

type Customer = Database['public']['Tables']['customers']['Row'];
type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

interface CustomerStats {
  total_bookings: number;
  total_spent: number;
  completed_bookings: number;
}

/**
 * Get current customer by auth user ID
 * Auto-creates customer record if doesn't exist
 */
export async function getCurrentCustomer(
  client: SupabaseClient<Database>
): Promise<Customer | null> {
  const { data: { user } } = await client.auth.getUser();

  if (!user) return null;

  // Try to get existing customer
  const { data, error } = await client
    .from('customers')
    .select('*')
    .eq('profile_id', user.id)
    .maybeSingle(); // Use maybeSingle() instead of single() to avoid error on empty result

  if (error) throw error;

  // If customer exists, return it
  if (data) return data;

  // Customer doesn't exist, create one
  try {
    const { data: newCustomer, error: insertError } = await client
      .from('customers')
      .insert({
        profile_id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        phone: user.phone || user.user_metadata?.phone || '',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create customer:', insertError);
      return null;
    }

    return newCustomer;
  } catch (err) {
    console.error('Error creating customer:', err);
    return null;
  }
}

/**
 * Get customer by ID
 */
export async function getCustomerById(
  client: SupabaseClient<Database>,
  customerId: string
): Promise<Customer | null> {
  const { data, error } = await client
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

/**
 * Update customer profile
 * Also syncs full_name back to profiles table for consistency
 */
export async function updateCustomer(
  client: SupabaseClient<Database>,
  customerId: string,
  updates: CustomerUpdate
): Promise<Customer> {
  const { data, error } = await client
    .from('customers')
    .update(updates)
    .eq('id', customerId)
    .select()
    .single();

  if (error) throw error;

  // Sync full_name to profiles table if it was updated
  if (updates.full_name && data.profile_id) {
    await client
      .from('profiles')
      .update({ full_name: updates.full_name })
      .eq('id', data.profile_id);
  }

  return data;
}

/**
 * Get customer statistics
 */
export async function getCustomerStats(
  client: SupabaseClient<Database>,
  customerId: string
): Promise<CustomerStats> {
  const { data: bookings, error } = await client
    .from('bookings')
    .select('status, final_price')
    .eq('customer_id', customerId);

  if (error) throw error;

  const stats: CustomerStats = {
    total_bookings: bookings?.length || 0,
    total_spent: 0,
    completed_bookings: 0,
  };

  bookings?.forEach((booking) => {
    if (booking.status === 'completed') {
      stats.completed_bookings++;
      stats.total_spent += Number(booking.final_price || 0);
    }
  });

  return stats;
}

// ============================================
// ADMIN QUICK BOOKING EXTENSIONS
// ============================================

/**
 * Search customers for admin booking (by phone, name, email)
 */
export async function searchCustomersForAdmin(
  client: SupabaseClient<Database>,
  query: string,
  limit: number = 10
): Promise<Customer[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchTerm = query.trim();

  // Search by phone, name, and email (using separate queries like admin does)
  const searchQueries = await Promise.all([
    // Search by phone
    client
      .from('customers')
      .select('*')
      .ilike('phone', `%${searchTerm}%`)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(limit),
    // Search by name
    client
      .from('customers')
      .select('*')
      .ilike('full_name', `%${searchTerm}%`)
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(limit)
  ])

  const phoneResults = searchQueries[0]
  const nameResults = searchQueries[1]

  // Combine and deduplicate results
  let allResults = [
    ...(phoneResults.data || []),
    ...(nameResults.data || [])
  ]

  // Search by email in profiles table if search term looks like email
  const emailRegex = /@|\.com|\.th|\.org|\.net/i
  if (emailRegex.test(searchTerm)) {
    console.log('🔍 Searching for email pattern:', searchTerm)

    const { data: profiles, error: emailError } = await client
      .from('profiles')
      .select('id, email')
      .ilike('email', `%${searchTerm}%`)
      .limit(limit)

    if (!emailError && profiles) {
      console.log('📧 Found profiles with email:', profiles.length)

      // Get customers that match these profile IDs
      const profileIds = profiles.map(p => p.id)
      if (profileIds.length > 0) {
        const { data: emailCustomers, error: emailCustomerError } = await client
          .from('customers')
          .select('*')
          .in('profile_id', profileIds)
          .eq('status', 'active')
          .limit(limit)

        if (!emailCustomerError && emailCustomers) {
          console.log('📧 Found customers from email search:', emailCustomers.length)
          allResults = [...allResults, ...emailCustomers]
        }
      }
    }
  }

  // Remove duplicates
  allResults = allResults.filter((item, index, self) =>
    index === self.findIndex(t => t.id === item.id)
  )

  // Fetch emails from profiles table (same as admin approach)
  const profileIds = allResults.map((c) => c.profile_id).filter(Boolean)
  let emailMap: Record<string, string> = {}
  if (profileIds.length > 0) {
    const { data: profiles } = await client
      .from('profiles')
      .select('id, email')
      .in('id', profileIds)
    if (profiles) {
      emailMap = Object.fromEntries(profiles.map((p) => [p.id, p.email || '']))
    }
  }

  // Attach emails to customer objects
  const customersWithEmails = allResults.map(customer => ({
    ...customer,
    email: customer.profile_id ? emailMap[customer.profile_id] || null : null
  }))

  const uniqueResults = customersWithEmails
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, limit)

  const error = phoneResults.error || nameResults.error
  const data = uniqueResults

  // Debug logging
  if (error) {
    console.error('🔍 Search query error:', error)
  }

  console.log('🔍 Search query executed for term:', searchTerm)
  console.log('📊 Raw search results:', data)

  if (error) {
    console.log('🚨 Search failed:', error)
  } else {
    console.log('📞 Phone results:', phoneResults.data?.length || 0)
    console.log('👤 Name results:', nameResults.data?.length || 0)
    console.log('🔀 Combined unique results:', uniqueResults.length)
  }

  if (error) throw error;
  return data || [];
}

/**
 * Create new customer for admin booking
 */
export async function createCustomerForAdmin(
  client: SupabaseClient<Database>,
  customerData: {
    full_name: string;
    phone: string;
    address?: string;
    birth_date?: string;  // Support both birth_date and date_of_birth
    date_of_birth?: string;
    gender?: string;
    preferences?: any;
    admin_notes?: string;
    preferred_contact_method?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  }
): Promise<Customer> {
  // Get current admin user
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error('Admin not authenticated');

  // Validate and clean phone number (Support all Thai phone formats)
  const cleanPhone = customerData.phone.replace(/[^\d]/g, '');
  const phoneRegex = /^((06|08|09)[0-9]{8}|(02)[0-9]{7}|(03|04|05|07)[0-9]{6}|1[0-9]{3,5})$/;
  if (!phoneRegex.test(cleanPhone)) {
    throw new Error('เบอร์โทรศัพท์ไม่ถูกต้อง กรุณากรอกเบอร์ที่ถูกต้อง (เบอร์มือถือ: 06/08/09, เบอร์บ้าน: 02/03/04/05/07, เบอร์พิเศษ: 1xxx)');
  }

  // Check for existing customer with same phone
  const existing = await searchCustomersForAdmin(client, cleanPhone, 1);
  if (existing.length > 0) {
    throw new Error('มีลูกค้าเบอร์นี้ในระบบแล้ว: ' + existing[0].full_name);
  }

  // Validate required fields
  if (!customerData.full_name || customerData.full_name.trim().length < 2) {
    throw new Error('กรุณากรอกชื่อลูกค้า (อย่างน้อย 2 ตัวอักษร)');
  }

  // Create the customer record (only with fields that exist in the table)
  const { data, error } = await client
    .from('customers')
    .insert({
      full_name: customerData.full_name.trim(),
      phone: cleanPhone,
      address: customerData.address?.trim() || null,
      date_of_birth: customerData.birth_date || customerData.date_of_birth || null,
      preferences: {
        ...(customerData.preferences || {}),
        // Store additional fields in preferences JSON
        gender: customerData.gender || null,
        admin_notes: customerData.admin_notes?.trim() || null,
        preferred_contact_method: customerData.preferred_contact_method || 'phone',
        emergency_contact_name: customerData.emergency_contact_name?.trim() || null,
        emergency_contact_phone: customerData.emergency_contact_phone?.replace(/[^\d]/g, '') || null,
        created_by_admin: true
      }
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505' && error.message.includes('phone')) {
      throw new Error('มีลูกค้าเบอร์นี้ในระบบแล้ว');
    }
    throw error;
  }

  return data;
}

/**
 * Get customer booking history for admin view
 */
export async function getCustomerBookingHistory(
  client: SupabaseClient<Database>,
  customerId: string,
  limit: number = 10
): Promise<any[]> {
  const { data, error } = await client
    .from('bookings')
    .select(`
      id,
      booking_number,
      booking_date,
      booking_time,
      status,
      final_price,
      created_at,
      booking_source,
      service:services(
        name_th,
        name_en,
        category
      ),
      staff:staff(
        id,
        profile:profiles(full_name)
      )
    `)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export const customerService = {
  getCurrentCustomer,
  getCustomerById,
  updateCustomer,
  getCustomerStats,
  // Admin extensions
  searchCustomersForAdmin,
  createCustomerForAdmin,
  getCustomerBookingHistory,
};
