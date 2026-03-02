import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      order: vi.fn().mockReturnThis(),
    })),
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: true, error: null })),
}))

import {
  useStaffEarningsSummary,
  useStaffPayouts,
  usePayoutJobs,
} from '../useStaffEarnings'

import type {
  Payout,
  PayoutJob,
  EarningsSummary,
} from '../useStaffEarnings'

describe('useStaffEarnings hooks', () => {
  it('exports useStaffEarningsSummary as a function', () => {
    expect(typeof useStaffEarningsSummary).toBe('function')
  })

  it('exports useStaffPayouts as a function', () => {
    expect(typeof useStaffPayouts).toBe('function')
  })

  it('exports usePayoutJobs as a function', () => {
    expect(typeof usePayoutJobs).toBe('function')
  })
})

describe('Payout type', () => {
  it('can create a valid Payout object', () => {
    const payout: Payout = {
      id: 'payout-1',
      staff_id: 'staff-1',
      period_start: '2026-01-01',
      period_end: '2026-01-31',
      gross_earnings: 10000,
      platform_fee: 1000,
      net_amount: 9000,
      total_jobs: 15,
      status: 'pending',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    expect(payout.status).toBe('pending')
    expect(payout.net_amount).toBe(9000)
  })

  it('supports all payout statuses', () => {
    const statuses: Payout['status'][] = ['pending', 'processing', 'completed', 'failed']
    statuses.forEach(status => {
      const payout: Payout = {
        id: '1',
        staff_id: '1',
        period_start: '2026-01-01',
        period_end: '2026-01-31',
        gross_earnings: 0,
        platform_fee: 0,
        net_amount: 0,
        total_jobs: 0,
        status,
        created_at: '',
        updated_at: '',
      }
      expect(payout.status).toBe(status)
    })
  })
})

describe('EarningsSummary type', () => {
  it('can create a valid EarningsSummary object', () => {
    const summary: EarningsSummary = {
      total_earnings: 50000,
      pending_payout: 10000,
      paid_this_month: 5000,
      total_paid: 40000,
    }
    expect(summary.total_earnings).toBe(50000)
    expect(summary.pending_payout).toBe(10000)
  })
})
