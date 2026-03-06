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
  paymentMethodService: {
    getPaymentMethods: vi.fn(),
    getDefaultPaymentMethod: vi.fn(),
    addPaymentMethod: vi.fn(),
    deletePaymentMethod: vi.fn(),
    setDefaultPaymentMethod: vi.fn(),
  },
}))

vi.mock('../../types/database.types', () => ({}))

import {
  usePaymentMethods,
  useDefaultPaymentMethod,
  useAddPaymentMethod,
  useDeletePaymentMethod,
  useSetDefaultPaymentMethod,
} from '../usePaymentMethods'
import { useSupabaseQuery, useSupabaseMutation } from '../useSupabaseQuery'
import { paymentMethodService } from '../../services'

describe('usePaymentMethods hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // usePaymentMethods
  // ============================================
  describe('usePaymentMethods', () => {
    it('should be a function', () => {
      expect(typeof usePaymentMethods).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      usePaymentMethods('cust-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['paymentMethods', 'customer', 'cust-1'],
          enabled: true,
        })
      )
    })

    it('should disable query when customerId is undefined', () => {
      usePaymentMethods(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls paymentMethodService.getPaymentMethods', () => {
      usePaymentMethods('cust-1')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(paymentMethodService.getPaymentMethods).toHaveBeenCalledWith(mockClient, 'cust-1')
    })
  })

  // ============================================
  // useDefaultPaymentMethod
  // ============================================
  describe('useDefaultPaymentMethod', () => {
    it('should be a function', () => {
      expect(typeof useDefaultPaymentMethod).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useDefaultPaymentMethod('cust-2')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['paymentMethods', 'default', 'cust-2'],
          enabled: true,
        })
      )
    })

    it('should disable query when customerId is undefined', () => {
      useDefaultPaymentMethod(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls paymentMethodService.getDefaultPaymentMethod', () => {
      useDefaultPaymentMethod('cust-3')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(paymentMethodService.getDefaultPaymentMethod).toHaveBeenCalledWith(mockClient, 'cust-3')
    })
  })

  // ============================================
  // useAddPaymentMethod
  // ============================================
  describe('useAddPaymentMethod', () => {
    it('should be a function', () => {
      expect(typeof useAddPaymentMethod).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useAddPaymentMethod()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should provide mutationFn that calls paymentMethodService.addPaymentMethod', async () => {
      useAddPaymentMethod()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const mockClient = {} as any
      const paymentMethod = { customer_id: 'c1', type: 'credit_card' } as any
      await lastCall.mutationFn(mockClient, paymentMethod)
      expect(paymentMethodService.addPaymentMethod).toHaveBeenCalledWith(mockClient, paymentMethod)
    })

    it('should provide invalidateKeys based on result', () => {
      useAddPaymentMethod()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const keys = lastCall.invalidateKeys!({ customer_id: 'c1' } as any)
      expect(keys).toEqual([
        ['paymentMethods', 'customer', 'c1'],
        ['paymentMethods', 'default', 'c1'],
      ])
    })
  })

  // ============================================
  // useDeletePaymentMethod
  // ============================================
  describe('useDeletePaymentMethod', () => {
    it('should be a function', () => {
      expect(typeof useDeletePaymentMethod).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useDeletePaymentMethod()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should provide mutationFn that calls paymentMethodService.deletePaymentMethod and returns customerId', async () => {
      vi.mocked(paymentMethodService.deletePaymentMethod).mockResolvedValue(undefined as any)
      useDeletePaymentMethod()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const mockClient = {} as any
      const result = await lastCall.mutationFn(mockClient, { paymentMethodId: 'pm1', customerId: 'c1' })
      expect(paymentMethodService.deletePaymentMethod).toHaveBeenCalledWith(mockClient, 'pm1')
      expect(result).toBe('c1')
    })

    it('should provide invalidateKeys based on returned customerId', () => {
      useDeletePaymentMethod()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const keys = lastCall.invalidateKeys!('c2')
      expect(keys).toEqual([
        ['paymentMethods', 'customer', 'c2'],
        ['paymentMethods', 'default', 'c2'],
      ])
    })
  })

  // ============================================
  // useSetDefaultPaymentMethod
  // ============================================
  describe('useSetDefaultPaymentMethod', () => {
    it('should be a function', () => {
      expect(typeof useSetDefaultPaymentMethod).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useSetDefaultPaymentMethod()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should provide mutationFn that calls paymentMethodService.setDefaultPaymentMethod', async () => {
      useSetDefaultPaymentMethod()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const mockClient = {} as any
      await lastCall.mutationFn(mockClient, { paymentMethodId: 'pm1', customerId: 'c1' })
      expect(paymentMethodService.setDefaultPaymentMethod).toHaveBeenCalledWith(mockClient, 'pm1', 'c1')
    })

    it('should provide invalidateKeys based on result', () => {
      useSetDefaultPaymentMethod()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const keys = lastCall.invalidateKeys!({ customer_id: 'c3' } as any)
      expect(keys).toEqual([
        ['paymentMethods', 'customer', 'c3'],
        ['paymentMethods', 'default', 'c3'],
      ])
    })
  })
})
