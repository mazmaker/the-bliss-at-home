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
  sosService: {
    getCustomerSOSAlerts: vi.fn(),
    createSOSAlert: vi.fn(),
    cancelSOSAlert: vi.fn(),
  },
}))

import {
  useCustomerSOSAlerts,
  useCreateSOSAlert,
  useCancelSOSAlert,
} from '../useSOSAlerts'
import { useSupabaseQuery, useSupabaseMutation } from '../useSupabaseQuery'
import { sosService } from '../../services'

describe('useSOSAlerts hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // useCustomerSOSAlerts
  // ============================================
  describe('useCustomerSOSAlerts', () => {
    it('should be a function', () => {
      expect(typeof useCustomerSOSAlerts).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useCustomerSOSAlerts('cust-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['sosAlerts', 'customer', 'cust-1'],
          enabled: true,
        })
      )
    })

    it('should disable query when customerId is undefined', () => {
      useCustomerSOSAlerts(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls sosService.getCustomerSOSAlerts', () => {
      useCustomerSOSAlerts('cust-1')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(sosService.getCustomerSOSAlerts).toHaveBeenCalledWith(mockClient, 'cust-1')
    })
  })

  // ============================================
  // useCreateSOSAlert
  // ============================================
  describe('useCreateSOSAlert', () => {
    it('should be a function', () => {
      expect(typeof useCreateSOSAlert).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useCreateSOSAlert()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should provide mutationFn that calls sosService.createSOSAlert', async () => {
      useCreateSOSAlert()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const mockClient = {} as any
      const input = { customer_id: 'c1', message: 'Help!' } as any
      await lastCall.mutationFn(mockClient, input)
      expect(sosService.createSOSAlert).toHaveBeenCalledWith(mockClient, input)
    })

    it('should provide invalidateKeys based on result customer_id', () => {
      useCreateSOSAlert()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const keys = lastCall.invalidateKeys!({ customer_id: 'c1' } as any)
      expect(keys).toEqual([['sosAlerts', 'customer', 'c1']])
    })
  })

  // ============================================
  // useCancelSOSAlert
  // ============================================
  describe('useCancelSOSAlert', () => {
    it('should be a function', () => {
      expect(typeof useCancelSOSAlert).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useCancelSOSAlert()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should provide mutationFn that calls sosService.cancelSOSAlert', async () => {
      useCancelSOSAlert()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const mockClient = {} as any
      await lastCall.mutationFn(mockClient, 'alert-1')
      expect(sosService.cancelSOSAlert).toHaveBeenCalledWith(mockClient, 'alert-1')
    })

    it('should provide invalidateKeys based on result customer_id', () => {
      useCancelSOSAlert()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const keys = lastCall.invalidateKeys!({ customer_id: 'c2' } as any)
      expect(keys).toEqual([['sosAlerts', 'customer', 'c2']])
    })
  })
})
