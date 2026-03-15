import { describe, it, expect, vi } from 'vitest'
import { createRefundInfo, refundService } from '../refundService'

// Mock external dependencies to avoid real DB/API calls
vi.mock('../../lib/supabase.js', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
    })),
  })),
}))

vi.mock('../omiseService.js', () => ({
  omiseService: {
    createRefund: vi.fn(),
  },
}))

vi.mock('../cancellationPolicyService.js', () => ({
  cancellationPolicyService: {
    calculateDynamicRefund: vi.fn(),
    getCancellationPolicy: vi.fn(),
  },
}))

// ============================================
// createRefundInfo (pure function, no DB)
// ============================================
describe('createRefundInfo', () => {
  it('creates refund info with default status', () => {
    const info = createRefundInfo(1500, 50)
    expect(info).toEqual({
      amount: 1500,
      percentage: 50,
      status: 'pending',
      expected_days: 5,
    })
  })

  it('creates refund info with specified status', () => {
    const info = createRefundInfo(3000, 100, 'completed')
    expect(info).toEqual({
      amount: 3000,
      percentage: 100,
      status: 'completed',
      expected_days: 5,
    })
  })

  it('creates refund info with 0 amount', () => {
    const info = createRefundInfo(0, 0, 'none')
    expect(info.amount).toBe(0)
    expect(info.percentage).toBe(0)
  })

  it('always returns expected_days as 5', () => {
    const info = createRefundInfo(999, 75, 'processing')
    expect(info.expected_days).toBe(5)
  })
})

// ============================================
// CANCELLATION_POLICY constants
// ============================================
describe('CANCELLATION_POLICY constants', () => {
  it('exports legacy cancellation policy', () => {
    expect(refundService.CANCELLATION_POLICY).toBeDefined()
    expect(refundService.CANCELLATION_POLICY.FULL_REFUND_HOURS).toBe(24)
    expect(refundService.CANCELLATION_POLICY.PARTIAL_REFUND_HOURS).toBe(12)
    expect(refundService.CANCELLATION_POLICY.PARTIAL_REFUND_PERCENTAGE).toBe(50)
    expect(refundService.CANCELLATION_POLICY.NO_REFUND_HOURS).toBe(0)
  })

  it('has sensible policy values', () => {
    const policy = refundService.CANCELLATION_POLICY
    expect(policy.FULL_REFUND_HOURS).toBeGreaterThan(policy.PARTIAL_REFUND_HOURS)
    expect(policy.PARTIAL_REFUND_HOURS).toBeGreaterThan(policy.NO_REFUND_HOURS)
    expect(policy.PARTIAL_REFUND_PERCENTAGE).toBeGreaterThan(0)
    expect(policy.PARTIAL_REFUND_PERCENTAGE).toBeLessThan(100)
  })
})

// ============================================
// refundService export structure
// ============================================
describe('refundService exports', () => {
  it('exports all expected methods', () => {
    expect(typeof refundService.calculateRefund).toBe('function')
    expect(typeof refundService.processRefund).toBe('function')
    expect(typeof refundService.createRefundInfo).toBe('function')
    expect(typeof refundService.getDynamicCancellationPolicy).toBe('function')
  })
})
