import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { paymentMethodService } from '../services';
import { Database } from '../types/database.types';

type PaymentMethodInsert = Database['public']['Tables']['payment_methods']['Insert'];

/**
 * Get all active payment methods for a customer
 */
export function usePaymentMethods(customerId: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['paymentMethods', 'customer', customerId],
    queryFn: (client) => paymentMethodService.getPaymentMethods(client, customerId!),
    enabled: !!customerId,
  });
}

/**
 * Get default payment method for a customer
 */
export function useDefaultPaymentMethod(customerId: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['paymentMethods', 'default', customerId],
    queryFn: (client) => paymentMethodService.getDefaultPaymentMethod(client, customerId!),
    enabled: !!customerId,
  });
}

/**
 * Add new payment method (after Omise tokenization)
 */
export function useAddPaymentMethod() {
  return useSupabaseMutation({
    mutationFn: async (client, paymentMethod: PaymentMethodInsert) => {
      return paymentMethodService.addPaymentMethod(client, paymentMethod);
    },
    invalidateKeys: (result) => [
      ['paymentMethods', 'customer', result?.customer_id],
      ['paymentMethods', 'default', result?.customer_id],
    ],
  });
}

/**
 * Delete payment method (soft delete)
 */
export function useDeletePaymentMethod() {
  return useSupabaseMutation({
    mutationFn: async (client, { paymentMethodId, customerId }: { paymentMethodId: string; customerId: string }) => {
      await paymentMethodService.deletePaymentMethod(client, paymentMethodId);
      return customerId;
    },
    invalidateKeys: (customerId) => [
      ['paymentMethods', 'customer', customerId],
      ['paymentMethods', 'default', customerId],
    ],
  });
}

/**
 * Set payment method as default
 */
export function useSetDefaultPaymentMethod() {
  return useSupabaseMutation({
    mutationFn: async (client, { paymentMethodId, customerId }: { paymentMethodId: string; customerId: string }) => {
      return paymentMethodService.setDefaultPaymentMethod(client, paymentMethodId, customerId);
    },
    invalidateKeys: (result) => [
      ['paymentMethods', 'customer', result?.customer_id],
      ['paymentMethods', 'default', result?.customer_id],
    ],
  });
}
