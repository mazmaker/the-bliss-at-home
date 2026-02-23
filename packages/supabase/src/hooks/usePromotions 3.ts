import { useSupabaseQuery } from './useSupabaseQuery';
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
