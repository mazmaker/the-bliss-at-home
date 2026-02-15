import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

type Promotion = Database['public']['Tables']['promotions']['Row'];

/**
 * Get active promotions that are currently valid (not expired)
 */
export async function getActivePromotions(
  client: SupabaseClient<Database>
): Promise<Promotion[]> {
  const now = new Date().toISOString();

  const { data, error } = await client
    .from('promotions')
    .select('*')
    .eq('status', 'active')
    .lte('start_date', now)
    .gte('end_date', now)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}
