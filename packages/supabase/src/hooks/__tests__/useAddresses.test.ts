import { describe, it, expect, vi } from 'vitest'

// Mock all dependencies before importing the module under test
vi.mock('../useSupabaseQuery', () => ({
  useSupabaseQuery: vi.fn((options: any) => ({
    data: undefined,
    isLoading: true,
    error: null,
    _queryKey: options.queryKey,
    _enabled: options.enabled,
  })),
  useSupabaseMutation: vi.fn((options: any) => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isLoading: false,
    _hasInvalidateKeys: !!options.invalidateKeys,
    _mutationFn: options.mutationFn,
  })),
}))

vi.mock('../../services', () => ({
  addressService: {
    getAddresses: vi.fn(),
    getDefaultAddress: vi.fn(),
    createAddress: vi.fn(),
    updateAddress: vi.fn(),
    deleteAddress: vi.fn(),
    setDefaultAddress: vi.fn(),
  },
}))

vi.mock('../../types/database.types', () => ({}))

import {
  useAddresses,
  useDefaultAddress,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
} from '../useAddresses'
import { useSupabaseQuery, useSupabaseMutation } from '../useSupabaseQuery'
import { addressService } from '../../services'

describe('useAddresses hooks', () => {
  // ============================================
  // useAddresses
  // ============================================
  describe('useAddresses', () => {
    it('should be a function', () => {
      expect(typeof useAddresses).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useAddresses('customer-123')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['addresses', 'customer', 'customer-123'],
          enabled: true,
        })
      )
    })

    it('should disable query when customerId is undefined', () => {
      useAddresses(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['addresses', 'customer', undefined],
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls addressService.getAddresses', () => {
      useAddresses('cust-1')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(addressService.getAddresses).toHaveBeenCalledWith(mockClient, 'cust-1')
    })
  })

  // ============================================
  // useDefaultAddress
  // ============================================
  describe('useDefaultAddress', () => {
    it('should be a function', () => {
      expect(typeof useDefaultAddress).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useDefaultAddress('customer-456')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['addresses', 'default', 'customer-456'],
          enabled: true,
        })
      )
    })

    it('should disable query when customerId is undefined', () => {
      useDefaultAddress(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls addressService.getDefaultAddress', () => {
      useDefaultAddress('cust-2')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(addressService.getDefaultAddress).toHaveBeenCalledWith(mockClient, 'cust-2')
    })
  })

  // ============================================
  // useCreateAddress
  // ============================================
  describe('useCreateAddress', () => {
    it('should be a function', () => {
      expect(typeof useCreateAddress).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useCreateAddress()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should provide invalidateKeys that returns address-related keys', () => {
      useCreateAddress()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const keys = lastCall.invalidateKeys!({ customer_id: 'c1' } as any)
      expect(keys).toEqual([
        ['addresses', 'customer', 'c1'],
        ['addresses', 'default', 'c1'],
      ])
    })

    it('should provide mutationFn that calls addressService.createAddress', async () => {
      useCreateAddress()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const mockClient = {} as any
      const addressData = { customer_id: 'c1', label: 'Home' } as any
      await lastCall.mutationFn(mockClient, addressData)
      expect(addressService.createAddress).toHaveBeenCalledWith(mockClient, addressData)
    })
  })

  // ============================================
  // useUpdateAddress
  // ============================================
  describe('useUpdateAddress', () => {
    it('should be a function', () => {
      expect(typeof useUpdateAddress).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useUpdateAddress()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should provide mutationFn that calls addressService.updateAddress', async () => {
      useUpdateAddress()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const mockClient = {} as any
      await lastCall.mutationFn(mockClient, { addressId: 'a1', updates: { label: 'New' } as any })
      expect(addressService.updateAddress).toHaveBeenCalledWith(mockClient, 'a1', { label: 'New' })
    })

    it('should provide invalidateKeys that returns address-related keys', () => {
      useUpdateAddress()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const keys = lastCall.invalidateKeys!({ customer_id: 'c2' } as any)
      expect(keys).toEqual([
        ['addresses', 'customer', 'c2'],
        ['addresses', 'default', 'c2'],
      ])
    })
  })

  // ============================================
  // useDeleteAddress
  // ============================================
  describe('useDeleteAddress', () => {
    it('should be a function', () => {
      expect(typeof useDeleteAddress).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useDeleteAddress()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should provide mutationFn that calls addressService.deleteAddress and returns customerId', async () => {
      vi.mocked(addressService.deleteAddress).mockResolvedValue(undefined as any)
      useDeleteAddress()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const mockClient = {} as any
      const result = await lastCall.mutationFn(mockClient, { addressId: 'a1', customerId: 'c1' })
      expect(addressService.deleteAddress).toHaveBeenCalledWith(mockClient, 'a1')
      expect(result).toBe('c1')
    })

    it('should provide invalidateKeys based on the returned customerId', () => {
      useDeleteAddress()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const keys = lastCall.invalidateKeys!('c3')
      expect(keys).toEqual([
        ['addresses', 'customer', 'c3'],
        ['addresses', 'default', 'c3'],
      ])
    })
  })

  // ============================================
  // useSetDefaultAddress
  // ============================================
  describe('useSetDefaultAddress', () => {
    it('should be a function', () => {
      expect(typeof useSetDefaultAddress).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useSetDefaultAddress()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should provide mutationFn that calls addressService.setDefaultAddress', async () => {
      useSetDefaultAddress()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const mockClient = {} as any
      await lastCall.mutationFn(mockClient, { addressId: 'a1', customerId: 'c1' })
      expect(addressService.setDefaultAddress).toHaveBeenCalledWith(mockClient, 'a1', 'c1')
    })

    it('should provide invalidateKeys from result', () => {
      useSetDefaultAddress()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const keys = lastCall.invalidateKeys!({ customer_id: 'c4' } as any)
      expect(keys).toEqual([
        ['addresses', 'customer', 'c4'],
        ['addresses', 'default', 'c4'],
      ])
    })
  })
})
