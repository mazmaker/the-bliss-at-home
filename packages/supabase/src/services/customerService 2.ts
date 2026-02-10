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
    .select('status, total_price')
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
      stats.total_spent += Number(booking.total_price || 0);
    }
  });

  return stats;
}

export const customerService = {
  getCurrentCustomer,
  getCustomerById,
  updateCustomer,
  getCustomerStats,
};
