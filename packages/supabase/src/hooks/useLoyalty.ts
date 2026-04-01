import { useSupabaseQuery } from './useSupabaseQuery';
import { getCustomerPoints, getLoyaltySettings, getPointTransactions, getNearestExpiry } from '../services/loyaltyService';
import type { CustomerPoints, LoyaltySettings, PointTransaction } from '../services/loyaltyService';

export type { CustomerPoints, LoyaltySettings, PointTransaction };

/**
 * Get loyalty settings
 */
export function useLoyaltySettings() {
  return useSupabaseQuery<LoyaltySettings>({
    queryKey: ['loyalty', 'settings'],
    queryFn: (client) => getLoyaltySettings(client),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get customer points balance
 */
export function useCustomerPoints(customerId: string | undefined) {
  return useSupabaseQuery<CustomerPoints | null>({
    queryKey: ['loyalty', 'points', customerId],
    queryFn: (client) => getCustomerPoints(client, customerId!),
    enabled: !!customerId,
  });
}

/**
 * Get point transactions history
 */
export function usePointTransactions(
  customerId: string | undefined,
  options?: { type?: string; limit?: number; offset?: number }
) {
  return useSupabaseQuery<{ transactions: PointTransaction[]; total: number }>({
    queryKey: ['loyalty', 'transactions', customerId, options?.type, options?.limit, options?.offset],
    queryFn: (client) => getPointTransactions(client, customerId!, options),
    enabled: !!customerId,
  });
}

/**
 * Get nearest expiring points
 */
export function useNearestExpiry(customerId: string | undefined) {
  return useSupabaseQuery<{ points: number; expires_at: string } | null>({
    queryKey: ['loyalty', 'nearest-expiry', customerId],
    queryFn: (client) => getNearestExpiry(client, customerId!),
    enabled: !!customerId,
  });
}
