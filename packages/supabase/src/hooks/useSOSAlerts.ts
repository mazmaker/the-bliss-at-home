import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { sosService, CreateSOSAlertInput } from '../services';

/**
 * Get all SOS alerts for a customer
 */
export function useCustomerSOSAlerts(customerId: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['sosAlerts', 'customer', customerId],
    queryFn: (client) => sosService.getCustomerSOSAlerts(client, customerId!),
    enabled: !!customerId,
  });
}

/**
 * Create a new SOS alert
 */
export function useCreateSOSAlert() {
  return useSupabaseMutation({
    mutationFn: async (client, input: CreateSOSAlertInput) => {
      return sosService.createSOSAlert(client, input);
    },
    invalidateKeys: (result) => [
      ['sosAlerts', 'customer', result?.customer_id],
    ],
  });
}

/**
 * Cancel an SOS alert
 */
export function useCancelSOSAlert() {
  return useSupabaseMutation({
    mutationFn: async (client, alertId: string) => {
      return sosService.cancelSOSAlert(client, alertId);
    },
    invalidateKeys: (result) => [
      ['sosAlerts', 'customer', result?.customer_id],
    ],
  });
}
