import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { promotionService } from '../services';

/**
 * Get all active promotions
 */
export function useActivePromotions() {
  return useSupabaseQuery({
    queryKey: ['promotions', 'active'],
    queryFn: (client) => promotionService.getActivePromotions(client),
  });
}

/**
 * Validate a promotion/voucher code
 */
export function useValidatePromoCode() {
  return useSupabaseMutation({
    mutationFn: async (
      client,
      params: {
        code: string;
        orderAmount: number;
        userId: string;
        serviceIds: string[];
        categories: string[];
      }
    ) => {
      return promotionService.validatePromoCode(
        client,
        params.code,
        params.orderAmount,
        params.userId,
        params.serviceIds,
        params.categories
      );
    },
  });
}
