import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

type Promotion = Database['public']['Tables']['promotions']['Row'];

export interface PromoValidationResult {
  valid: boolean;
  promotion: Promotion | null;
  discountAmount: number;
  errorKey: string | null;
}

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

/**
 * Validate a promotion/voucher code against the current booking context
 */
export async function validatePromoCode(
  client: SupabaseClient<Database>,
  code: string,
  orderAmount: number,
  userId: string,
  serviceIds: string[],
  categories: string[]
): Promise<PromoValidationResult> {
  const fail = (errorKey: string, promo?: Promotion | null): PromoValidationResult => ({
    valid: false,
    promotion: promo || null,
    discountAmount: 0,
    errorKey,
  });

  // Find promotion by code
  const now = new Date().toISOString();
  const { data: promo, error } = await client
    .from('promotions')
    .select('*')
    .eq('code', code.trim().toUpperCase())
    .single();

  if (error || !promo) return fail('voucherInvalid');

  // Check status
  if (promo.status !== 'active') return fail('voucherInvalid', promo);

  // Check date range
  if (now < promo.start_date || now > promo.end_date) return fail('voucherInvalid', promo);

  // Check min order amount
  if (promo.min_order_amount && orderAmount < Number(promo.min_order_amount)) {
    return fail('voucherMinOrder', promo);
  }

  // Check global usage limit
  if (promo.usage_limit && (promo.usage_count ?? 0) >= promo.usage_limit) {
    return fail('voucherUsed', promo);
  }

  // Check per-user usage limit
  if (promo.usage_limit_per_user) {
    const { count } = await client
      .from('promotion_usage')
      .select('*', { count: 'exact', head: true })
      .eq('promotion_id', promo.id)
      .eq('user_id', userId);

    if ((count ?? 0) >= promo.usage_limit_per_user) {
      return fail('voucherUsed', promo);
    }
  }

  // Check applies_to scope
  if (promo.applies_to === 'specific_services' && promo.target_services) {
    const hasMatch = serviceIds.some((id) => promo.target_services!.includes(id));
    if (!hasMatch) return fail('voucherNotApplicable', promo);
  }
  if (promo.applies_to === 'categories' && promo.target_categories) {
    const hasMatch = categories.some((cat) => promo.target_categories!.includes(cat));
    if (!hasMatch) return fail('voucherNotApplicable', promo);
  }

  // Calculate discount
  let discountAmount = 0;
  if (promo.discount_type === 'percentage') {
    discountAmount = orderAmount * (promo.discount_value / 100);
    if (promo.max_discount) {
      discountAmount = Math.min(discountAmount, Number(promo.max_discount));
    }
  } else if (promo.discount_type === 'fixed_amount') {
    discountAmount = promo.discount_value;
  }

  discountAmount = Math.min(discountAmount, orderAmount);
  discountAmount = Math.round(discountAmount * 100) / 100;

  return {
    valid: true,
    promotion: promo,
    discountAmount,
    errorKey: null,
  };
}
