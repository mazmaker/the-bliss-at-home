import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create chainable mock helpers
function createChainMock(resolvedValue: any) {
  const chain: any = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  chain.order = vi.fn().mockReturnValue(chain)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  // For queries that resolve without .single()
  chain.then = vi.fn((resolve: any) => resolve(resolvedValue))
  return chain
}

const mockFrom = vi.fn()

vi.mock('../../lib/supabase.js', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: mockFrom,
  })),
}))

import {
  getCancellationPolicy,
  getFullCancellationPolicy,
  checkCancellationEligibility,
  calculateDynamicRefund,
  updatePolicySettings,
  updatePolicyTier,
  createPolicyTier,
  deletePolicyTier,
  cancellationPolicyService,
} from '../cancellationPolicyService'

describe('cancellationPolicyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCancellationPolicy', () => {
    it('should return settings and tiers', async () => {
      const mockSettings = { id: 's1', is_active: true, max_reschedules_per_booking: 2 }
      const mockTiers = [
        { id: 't1', min_hours_before: 48, can_cancel: true, refund_percentage: 100 },
        { id: 't2', min_hours_before: 24, can_cancel: true, refund_percentage: 50 },
      ]

      mockFrom.mockImplementation((table: string) => {
        if (table === 'cancellation_policy_settings') {
          const chain = createChainMock({ data: mockSettings, error: null })
          return chain
        }
        if (table === 'cancellation_policy_tiers') {
          // Tiers query resolves without .single()
          const chain: any = {}
          chain.select = vi.fn().mockReturnValue(chain)
          chain.eq = vi.fn().mockReturnValue(chain)
          chain.order = vi.fn().mockResolvedValue({ data: mockTiers, error: null })
          return chain
        }
        return createChainMock({ data: null, error: null })
      })

      const result = await getCancellationPolicy()

      expect(result).toHaveProperty('settings')
      expect(result).toHaveProperty('tiers')
      expect(result.settings).toEqual(mockSettings)
      expect(result.tiers).toEqual(mockTiers)
    })

    it('should return null settings and empty tiers on error', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'cancellation_policy_settings') {
          return createChainMock({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
        }
        if (table === 'cancellation_policy_tiers') {
          const chain: any = {}
          chain.select = vi.fn().mockReturnValue(chain)
          chain.eq = vi.fn().mockReturnValue(chain)
          chain.order = vi.fn().mockResolvedValue({ data: null, error: { message: 'Error' } })
          return chain
        }
        return createChainMock({ data: null, error: null })
      })

      const result = await getCancellationPolicy()

      expect(result.settings).toBeNull()
      expect(result.tiers).toEqual([])
    })
  })

  describe('getFullCancellationPolicy', () => {
    it('should fetch all settings without active filter', async () => {
      const mockSettings = { id: 's1' }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'cancellation_policy_settings') {
          return createChainMock({ data: mockSettings, error: null })
        }
        if (table === 'cancellation_policy_tiers') {
          const chain: any = {}
          chain.select = vi.fn().mockReturnValue(chain)
          chain.order = vi.fn().mockResolvedValue({ data: [], error: null })
          return chain
        }
        return createChainMock({ data: null, error: null })
      })

      const result = await getFullCancellationPolicy()
      expect(result.settings).toEqual(mockSettings)
      expect(result.tiers).toEqual([])
    })
  })

  describe('checkCancellationEligibility', () => {
    it('should return ineligible when booking not found', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
      )

      const result = await checkCancellationEligibility('nonexistent-id')

      expect(result.canCancel).toBe(false)
      expect(result.canReschedule).toBe(false)
      expect(result.reason).toBeDefined()
    })

    it('should return ineligible when booking is cancelled', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({
          data: { id: 'b1', booking_date: '2026-03-10', booking_time: '14:00', status: 'cancelled', reschedule_count: 0 },
          error: null,
        })
      )

      const result = await checkCancellationEligibility('b1')

      expect(result.canCancel).toBe(false)
      expect(result.canReschedule).toBe(false)
    })

    it('should return ineligible when booking is completed', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({
          data: { id: 'b1', booking_date: '2026-03-10', booking_time: '14:00', status: 'completed', reschedule_count: 0 },
          error: null,
        })
      )

      const result = await checkCancellationEligibility('b1')

      expect(result.canCancel).toBe(false)
      expect(result.canReschedule).toBe(false)
    })
  })

  describe('updatePolicyTier', () => {
    it('should update a tier and return updated data', async () => {
      const updatedTier = { id: 't1', min_hours_before: 72 }

      mockFrom.mockImplementation(() =>
        createChainMock({ data: updatedTier, error: null })
      )

      const result = await updatePolicyTier('t1', { min_hours_before: 72 })
      expect(result).toEqual(updatedTier)
    })

    it('should throw when update fails', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Update failed' } })
      )

      await expect(updatePolicyTier('t1', {})).rejects.toThrow()
    })
  })

  describe('createPolicyTier', () => {
    it('should create a new tier', async () => {
      const newTier = { id: 't-new', min_hours_before: 12 }

      mockFrom.mockImplementation(() =>
        createChainMock({ data: newTier, error: null })
      )

      const result = await createPolicyTier({
        min_hours_before: 12,
        max_hours_before: 24,
        can_cancel: true,
        can_reschedule: true,
        refund_percentage: 80,
        reschedule_fee: 0,
        label_th: null,
        label_en: null,
        sort_order: 3,
        is_active: true,
      })

      expect(result).toEqual(newTier)
    })
  })

  describe('deletePolicyTier', () => {
    it('should return true on successful deletion', async () => {
      mockFrom.mockImplementation(() => ({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }))

      const result = await deletePolicyTier('t1')
      expect(result).toBe(true)
    })

    it('should throw when delete fails', async () => {
      mockFrom.mockImplementation(() => ({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
        }),
      }))

      await expect(deletePolicyTier('t1')).rejects.toThrow()
    })
  })

  describe('cancellationPolicyService export', () => {
    it('should export all service methods', () => {
      expect(cancellationPolicyService.getCancellationPolicy).toBe(getCancellationPolicy)
      expect(cancellationPolicyService.getFullCancellationPolicy).toBe(getFullCancellationPolicy)
      expect(cancellationPolicyService.checkCancellationEligibility).toBe(checkCancellationEligibility)
      expect(cancellationPolicyService.calculateDynamicRefund).toBe(calculateDynamicRefund)
      expect(cancellationPolicyService.updatePolicySettings).toBe(updatePolicySettings)
      expect(cancellationPolicyService.updatePolicyTier).toBe(updatePolicyTier)
      expect(cancellationPolicyService.createPolicyTier).toBe(createPolicyTier)
      expect(cancellationPolicyService.deletePolicyTier).toBe(deletePolicyTier)
    })
  })
})
