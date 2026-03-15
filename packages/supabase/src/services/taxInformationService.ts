import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

type TaxInformation = Database['public']['Tables']['tax_information']['Row'];
type TaxInformationInsert = Database['public']['Tables']['tax_information']['Insert'];
type TaxInformationUpdate = Database['public']['Tables']['tax_information']['Update'];

/**
 * Get tax information for a customer
 */
export async function getTaxInformation(
  client: SupabaseClient<Database>,
  customerId: string
): Promise<TaxInformation | null> {
  const { data, error } = await client
    .from('tax_information')
    .select('*')
    .eq('customer_id', customerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }

  return data;
}

/**
 * Create or update tax information (upsert)
 */
export async function upsertTaxInformation(
  client: SupabaseClient<Database>,
  taxInfo: TaxInformationInsert
): Promise<TaxInformation> {
  const { data, error } = await client
    .from('tax_information')
    .upsert(taxInfo, {
      onConflict: 'customer_id',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete tax information for a customer
 */
export async function deleteTaxInformation(
  client: SupabaseClient<Database>,
  customerId: string
): Promise<void> {
  const { error } = await client
    .from('tax_information')
    .delete()
    .eq('customer_id', customerId);

  if (error) throw error;
}

export const taxInformationService = {
  getTaxInformation,
  upsertTaxInformation,
  deleteTaxInformation,
};
