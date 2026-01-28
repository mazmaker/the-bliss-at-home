import { useSupabaseQuery, useSupabaseMutation } from './useSupabaseQuery';
import { addressService } from '../services';
import { Database } from '../types/database.types';

type AddressInsert = Database['public']['Tables']['addresses']['Insert'];
type AddressUpdate = Database['public']['Tables']['addresses']['Update'];

/**
 * Get all addresses for a customer
 */
export function useAddresses(customerId: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['addresses', 'customer', customerId],
    queryFn: (client) => addressService.getAddresses(client, customerId!),
    enabled: !!customerId,
  });
}

/**
 * Get default address for a customer
 */
export function useDefaultAddress(customerId: string | undefined) {
  return useSupabaseQuery({
    queryKey: ['addresses', 'default', customerId],
    queryFn: (client) => addressService.getDefaultAddress(client, customerId!),
    enabled: !!customerId,
  });
}

/**
 * Create new address
 */
export function useCreateAddress() {
  return useSupabaseMutation({
    mutationFn: async (client, address: AddressInsert) => {
      return addressService.createAddress(client, address);
    },
    invalidateKeys: (_, variables) => [
      ['addresses', 'customer', variables.customer_id],
      ['addresses', 'default', variables.customer_id],
    ],
  });
}

/**
 * Update existing address
 */
export function useUpdateAddress() {
  return useSupabaseMutation({
    mutationFn: async (client, { addressId, updates }: { addressId: string; updates: AddressUpdate }) => {
      return addressService.updateAddress(client, addressId, updates);
    },
    invalidateKeys: (result) => [
      ['addresses', 'customer', result?.customer_id],
      ['addresses', 'default', result?.customer_id],
    ],
  });
}

/**
 * Delete address
 */
export function useDeleteAddress() {
  return useSupabaseMutation({
    mutationFn: async (client, { addressId, customerId }: { addressId: string; customerId: string }) => {
      await addressService.deleteAddress(client, addressId);
      return customerId;
    },
    invalidateKeys: (customerId) => [
      ['addresses', 'customer', customerId],
      ['addresses', 'default', customerId],
    ],
  });
}

/**
 * Set address as default
 */
export function useSetDefaultAddress() {
  return useSupabaseMutation({
    mutationFn: async (client, { addressId, customerId }: { addressId: string; customerId: string }) => {
      return addressService.setDefaultAddress(client, addressId, customerId);
    },
    invalidateKeys: (_, variables) => [
      ['addresses', 'customer', variables.customerId],
      ['addresses', 'default', variables.customerId],
    ],
  });
}
