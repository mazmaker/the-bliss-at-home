import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

type PaymentMethod = Database['public']['Tables']['payment_methods']['Row'];
type PaymentMethodInsert = Database['public']['Tables']['payment_methods']['Insert'];

/**
 * Get all active payment methods for a customer
 */
export async function getPaymentMethods(
  client: SupabaseClient<Database>,
  customerId: string
): Promise<PaymentMethod[]> {
  const { data, error } = await client
    .from('payment_methods')
    .select('*')
    .eq('customer_id', customerId)
    .eq('is_active', true)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get default payment method for a customer
 */
export async function getDefaultPaymentMethod(
  client: SupabaseClient<Database>,
  customerId: string
): Promise<PaymentMethod | null> {
  const { data, error } = await client
    .from('payment_methods')
    .select('*')
    .eq('customer_id', customerId)
    .eq('is_default', true)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

/**
 * Add new payment method (after Omise tokenization)
 */
export async function addPaymentMethod(
  client: SupabaseClient<Database>,
  paymentMethod: PaymentMethodInsert
): Promise<PaymentMethod> {
  // If this is being set as default, unset other defaults first
  if (paymentMethod.is_default && paymentMethod.customer_id) {
    await client
      .from('payment_methods')
      .update({ is_default: false })
      .eq('customer_id', paymentMethod.customer_id);
  }

  const { data, error } = await client
    .from('payment_methods')
    .insert(paymentMethod)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete payment method (soft delete)
 */
export async function deletePaymentMethod(
  client: SupabaseClient<Database>,
  paymentMethodId: string
): Promise<void> {
  const { error } = await client
    .from('payment_methods')
    .update({ is_active: false })
    .eq('id', paymentMethodId);

  if (error) throw error;
}

/**
 * Set payment method as default
 */
export async function setDefaultPaymentMethod(
  client: SupabaseClient<Database>,
  paymentMethodId: string,
  customerId: string
): Promise<PaymentMethod> {
  // Unset all other defaults
  await client
    .from('payment_methods')
    .update({ is_default: false })
    .eq('customer_id', customerId)
    .neq('id', paymentMethodId);

  // Set this one as default
  const { data, error } = await client
    .from('payment_methods')
    .update({ is_default: true })
    .eq('id', paymentMethodId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export const paymentMethodService = {
  getPaymentMethods,
  getDefaultPaymentMethod,
  addPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
};
