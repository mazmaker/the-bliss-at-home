import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { customerService } from '../services';
import { Database } from '../types/database.types';
import { useOptionalAuthContext } from '../auth/AuthProvider';

type CustomerUpdate = Database['public']['Tables']['customers']['Update'];

/**
 * Get current customer (logged in user)
 */
export function useCurrentCustomer() {
  const auth = useOptionalAuthContext()
  return useSupabaseQuery({
    queryKey: ['customer', 'current'],
    queryFn: (client) => customerService.getCurrentCustomer(client),
    enabled: auth ? auth.isAuthenticated : undefined,
  });
}

/**
 * Get customer by ID
 */
export function useCustomerById(customerId: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['customer', customerId],
    queryFn: (client) => customerService.getCustomerById(client, customerId!),
    enabled: !!customerId,
  });
}

/**
 * Update customer profile
 */
export function useUpdateCustomer() {
  return useSupabaseMutation({
    mutationFn: async (client, { customerId, updates }: { customerId: string; updates: CustomerUpdate }) => {
      return customerService.updateCustomer(client, customerId, updates);
    },
    invalidateKeys: [['customer', 'current']],
  });
}

/**
 * Get customer statistics
 */
export function useCustomerStats(customerId: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['customer', 'stats', customerId],
    queryFn: (client) => customerService.getCustomerStats(client, customerId!),
    enabled: !!customerId,
  });
}
