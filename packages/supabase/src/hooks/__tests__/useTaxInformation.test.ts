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
  taxInformationService: {
    getTaxInformation: vi.fn(),
    upsertTaxInformation: vi.fn(),
    deleteTaxInformation: vi.fn(),
  },
}))

vi.mock('../../types/database.types', () => ({}))

import {
  useTaxInformation,
  useUpsertTaxInformation,
  useDeleteTaxInformation,
} from '../useTaxInformation'
import { useSupabaseQuery, useSupabaseMutation } from '../useSupabaseQuery'
import { taxInformationService } from '../../services'

describe('useTaxInformation hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // useTaxInformation
  // ============================================
  describe('useTaxInformation', () => {
    it('should be a function', () => {
      expect(typeof useTaxInformation).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useTaxInformation('cust-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['taxInformation', 'customer', 'cust-1'],
          enabled: true,
        })
      )
    })

    it('should disable query when customerId is undefined', () => {
      useTaxInformation(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls taxInformationService.getTaxInformation', () => {
      useTaxInformation('cust-1')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(taxInformationService.getTaxInformation).toHaveBeenCalledWith(mockClient, 'cust-1')
    })
  })

  // ============================================
  // useUpsertTaxInformation
  // ============================================
  describe('useUpsertTaxInformation', () => {
    it('should be a function', () => {
      expect(typeof useUpsertTaxInformation).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useUpsertTaxInformation()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should provide mutationFn that calls taxInformationService.upsertTaxInformation', async () => {
      useUpsertTaxInformation()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const mockClient = {} as any
      const taxInfo = { customer_id: 'c1', tax_id: '1234567890' } as any
      await lastCall.mutationFn(mockClient, taxInfo)
      expect(taxInformationService.upsertTaxInformation).toHaveBeenCalledWith(mockClient, taxInfo)
    })

    it('should provide invalidateKeys based on result customer_id', () => {
      useUpsertTaxInformation()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const keys = lastCall.invalidateKeys!({ customer_id: 'c1' } as any)
      expect(keys).toEqual([['taxInformation', 'customer', 'c1']])
    })
  })

  // ============================================
  // useDeleteTaxInformation
  // ============================================
  describe('useDeleteTaxInformation', () => {
    it('should be a function', () => {
      expect(typeof useDeleteTaxInformation).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useDeleteTaxInformation()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should provide mutationFn that calls taxInformationService.deleteTaxInformation and returns customerId', async () => {
      vi.mocked(taxInformationService.deleteTaxInformation).mockResolvedValue(undefined as any)
      useDeleteTaxInformation()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const mockClient = {} as any
      const result = await lastCall.mutationFn(mockClient, 'c1')
      expect(taxInformationService.deleteTaxInformation).toHaveBeenCalledWith(mockClient, 'c1')
      expect(result).toBe('c1')
    })

    it('should provide invalidateKeys based on returned customerId', () => {
      useDeleteTaxInformation()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const keys = lastCall.invalidateKeys!('c2')
      expect(keys).toEqual([['taxInformation', 'customer', 'c2']])
    })
  })
})
