import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { taxInformationService } from '../services';
import { Database } from '../types/database.types';

type TaxInformationInsert = Database['public']['Tables']['tax_information']['Insert'];
type TaxInformationUpdate = Database['public']['Tables']['tax_information']['Update'];

/**
 * Get tax information for a customer
 */
export function useTaxInformation(customerId: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['taxInformation', 'customer', customerId],
    queryFn: (client) => taxInformationService.getTaxInformation(client, customerId!),
    enabled: !!customerId,
  });
}

/**
 * Create or update tax information (upsert)
 */
export function useUpsertTaxInformation() {
  return useSupabaseMutation({
    mutationFn: async (
      client,
      taxInfo: TaxInformationInsert | (TaxInformationUpdate & { customer_id: string })
    ) => {
      return taxInformationService.upsertTaxInformation(client, taxInfo);
    },
    invalidateKeys: (result) => [['taxInformation', 'customer', result?.customer_id]],
  });
}

/**
 * Delete tax information for a customer
 */
export function useDeleteTaxInformation() {
  return useSupabaseMutation({
    mutationFn: async (client, customerId: string) => {
      await taxInformationService.deleteTaxInformation(client, customerId);
      return customerId;
    },
    invalidateKeys: (customerId) => [['taxInformation', 'customer', customerId]],
  });
}
