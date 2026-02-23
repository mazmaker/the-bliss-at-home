import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

type Address = Database['public']['Tables']['addresses']['Row'];
type AddressInsert = Database['public']['Tables']['addresses']['Insert'];
type AddressUpdate = Database['public']['Tables']['addresses']['Update'];

/**
 * Get all addresses for a customer
 */
export async function getAddresses(
  client: SupabaseClient<Database>,
  customerId: string
): Promise<Address[]> {
  const { data, error } = await client
    .from('addresses')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get default address for a customer
 */
export async function getDefaultAddress(
  client: SupabaseClient<Database>,
  customerId: string
): Promise<Address | null> {
  const { data, error } = await client
    .from('addresses')
    .select('*')
    .eq('customer_id', customerId)
    .eq('is_default', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // No default found
    throw error;
  }

  return data;
}

/**
 * Create new address
 */
export async function createAddress(
  client: SupabaseClient<Database>,
  address: AddressInsert
): Promise<Address> {
  // If this is being set as default, unset other defaults first
  if (address.is_default && address.customer_id) {
    await client
      .from('addresses')
      .update({ is_default: false })
      .eq('customer_id', address.customer_id);
  }

  const { data, error } = await client
    .from('addresses')
    .insert(address)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update existing address
 */
export async function updateAddress(
  client: SupabaseClient<Database>,
  addressId: string,
  updates: AddressUpdate
): Promise<Address> {
  // If setting as default, get customer_id first to unset others
  if (updates.is_default) {
    const { data: address } = await client
      .from('addresses')
      .select('customer_id')
      .eq('id', addressId)
      .single();

    if (address?.customer_id) {
      await client
        .from('addresses')
        .update({ is_default: false })
        .eq('customer_id', address.customer_id)
        .neq('id', addressId);
    }
  }

  const { data, error } = await client
    .from('addresses')
    .update(updates)
    .eq('id', addressId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete address
 */
export async function deleteAddress(
  client: SupabaseClient<Database>,
  addressId: string
): Promise<void> {
  const { error } = await client
    .from('addresses')
    .delete()
    .eq('id', addressId);

  if (error) throw error;
}

/**
 * Set address as default
 */
export async function setDefaultAddress(
  client: SupabaseClient<Database>,
  addressId: string,
  customerId: string
): Promise<Address> {
  // Unset all other defaults
  await client
    .from('addresses')
    .update({ is_default: false })
    .eq('customer_id', customerId)
    .neq('id', addressId);

  // Set this one as default
  const { data, error } = await client
    .from('addresses')
    .update({ is_default: true })
    .eq('id', addressId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export const addressService = {
  getAddresses,
  getDefaultAddress,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
