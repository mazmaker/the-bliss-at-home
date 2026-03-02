import { describe, it, expect, vi, beforeEach } from 'vitest'

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
    _mutationFn: options.mutationFn,
  })),
}))

vi.mock('../../services', () => ({
  customerService: {
    getCurrentCustomer: vi.fn(),
    getCustomerById: vi.fn(),
    updateCustomer: vi.fn(),
    getCustomerStats: vi.fn(),
  },
}))

vi.mock('../../auth/AuthProvider', () => ({
  useOptionalAuthContext: vi.fn(() => ({ isAuthenticated: true })),
}))

vi.mock('../../types/database.types', () => ({}))

import {
  useCurrentCustomer,
  useCustomerById,
  useUpdateCustomer,
  useCustomerStats,
} from '../useCustomer'
import { useSupabaseQuery, useSupabaseMutation } from '../useSupabaseQuery'
import { customerService } from '../../services'
import { useOptionalAuthContext } from '../../auth/AuthProvider'

describe('useCustomer hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // useCurrentCustomer
  // ============================================
  describe('useCurrentCustomer', () => {
    it('should be a function', () => {
      expect(typeof useCurrentCustomer).toBe('function')
    })

    it('should call useSupabaseQuery with customer current key', () => {
      useCurrentCustomer()
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['customer', 'current'],
        })
      )
    })

    it('should set enabled based on auth context isAuthenticated', () => {
      vi.mocked(useOptionalAuthContext).mockReturnValue({ isAuthenticated: true } as any)
      useCurrentCustomer()
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
        })
      )
    })

    it('should set enabled to false when not authenticated', () => {
      vi.mocked(useOptionalAuthContext).mockReturnValue({ isAuthenticated: false } as any)
      useCurrentCustomer()
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should set enabled to undefined when auth context is null', () => {
      vi.mocked(useOptionalAuthContext).mockReturnValue(null as any)
      useCurrentCustomer()
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: undefined,
        })
      )
    })

    it('should pass queryFn that calls customerService.getCurrentCustomer', () => {
      useCurrentCustomer()
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(customerService.getCurrentCustomer).toHaveBeenCalledWith(mockClient)
    })
  })

  // ============================================
  // useCustomerById
  // ============================================
  describe('useCustomerById', () => {
    it('should be a function', () => {
      expect(typeof useCustomerById).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useCustomerById('cust-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['customer', 'cust-1'],
          enabled: true,
        })
      )
    })

    it('should disable query when customerId is undefined', () => {
      useCustomerById(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls customerService.getCustomerById', () => {
      useCustomerById('cust-2')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(customerService.getCustomerById).toHaveBeenCalledWith(mockClient, 'cust-2')
    })
  })

  // ============================================
  // useUpdateCustomer
  // ============================================
  describe('useUpdateCustomer', () => {
    it('should be a function', () => {
      expect(typeof useUpdateCustomer).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useUpdateCustomer()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should provide mutationFn that calls customerService.updateCustomer', async () => {
      useUpdateCustomer()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const mockClient = {} as any
      const params = { customerId: 'c1', updates: { full_name: 'Test' } as any }
      await lastCall.mutationFn(mockClient, params)
      expect(customerService.updateCustomer).toHaveBeenCalledWith(mockClient, 'c1', { full_name: 'Test' })
    })

    it('should provide static invalidateKeys for customer current', () => {
      useUpdateCustomer()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      expect(lastCall.invalidateKeys).toEqual([['customer', 'current']])
    })
  })

  // ============================================
  // useCustomerStats
  // ============================================
  describe('useCustomerStats', () => {
    it('should be a function', () => {
      expect(typeof useCustomerStats).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useCustomerStats('cust-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['customer', 'stats', 'cust-1'],
          enabled: true,
        })
      )
    })

    it('should disable query when customerId is undefined', () => {
      useCustomerStats(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls customerService.getCustomerStats', () => {
      useCustomerStats('cust-3')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(customerService.getCustomerStats).toHaveBeenCalledWith(mockClient, 'cust-3')
    })
  })
})
