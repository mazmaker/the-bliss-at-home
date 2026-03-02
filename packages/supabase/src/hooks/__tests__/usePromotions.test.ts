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
  promotionService: {
    getActivePromotions: vi.fn(),
    validatePromoCode: vi.fn(),
  },
}))

import {
  useActivePromotions,
  useValidatePromoCode,
} from '../usePromotions'
import { useSupabaseQuery, useSupabaseMutation } from '../useSupabaseQuery'
import { promotionService } from '../../services'

describe('usePromotions hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // useActivePromotions
  // ============================================
  describe('useActivePromotions', () => {
    it('should be a function', () => {
      expect(typeof useActivePromotions).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useActivePromotions()
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['promotions', 'active'],
        })
      )
    })

    it('should not have enabled condition (always enabled)', () => {
      useActivePromotions()
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      // No enabled property means it defaults to true
      expect(lastCall.enabled).toBeUndefined()
    })

    it('should pass queryFn that calls promotionService.getActivePromotions', () => {
      useActivePromotions()
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(promotionService.getActivePromotions).toHaveBeenCalledWith(mockClient)
    })
  })

  // ============================================
  // useValidatePromoCode
  // ============================================
  describe('useValidatePromoCode', () => {
    it('should be a function', () => {
      expect(typeof useValidatePromoCode).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useValidatePromoCode()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should provide mutationFn that calls promotionService.validatePromoCode with all params', async () => {
      useValidatePromoCode()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const mockClient = {} as any
      const params = {
        code: 'SAVE10',
        orderAmount: 1000,
        userId: 'user-1',
        serviceIds: ['s1', 's2'],
        categories: ['massage'],
      }
      await lastCall.mutationFn(mockClient, params)
      expect(promotionService.validatePromoCode).toHaveBeenCalledWith(
        mockClient,
        'SAVE10',
        1000,
        'user-1',
        ['s1', 's2'],
        ['massage']
      )
    })
  })
})
