import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockGetEarningsSummary, mockGetDailyEarnings, mockGetServiceEarnings, mockGetPayoutHistory, mockGetBankAccounts, mockSubscribeToPayouts } = vi.hoisted(() => ({
  mockGetEarningsSummary: vi.fn(),
  mockGetDailyEarnings: vi.fn(),
  mockGetServiceEarnings: vi.fn(),
  mockGetPayoutHistory: vi.fn(),
  mockGetBankAccounts: vi.fn(),
  mockSubscribeToPayouts: vi.fn(() => vi.fn()),
}))

const { mockUseAuth, mockSupabaseFrom } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockSupabaseFrom: vi.fn(),
}))

vi.mock('../../auth/hooks', () => ({
  useAuth: mockUseAuth,
}))

vi.mock('../../auth/supabaseClient', () => ({
  supabase: {
    from: mockSupabaseFrom,
  },
}))

vi.mock('../earningsService', () => ({
  getEarningsSummary: mockGetEarningsSummary,
  getDailyEarnings: mockGetDailyEarnings,
  getServiceEarnings: mockGetServiceEarnings,
  getPayoutHistory: mockGetPayoutHistory,
  getBankAccounts: mockGetBankAccounts,
  addBankAccount: vi.fn(),
  updateBankAccount: vi.fn(),
  setPrimaryBankAccount: vi.fn(),
  deleteBankAccount: vi.fn(),
  subscribeToPayouts: mockSubscribeToPayouts,
}))

import {
  useEarningsSummary,
  useDailyEarnings,
  useServiceEarnings,
  usePayouts,
  useBankAccounts,
} from '../useEarnings'

describe('useEarnings hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: null, isLoading: true })
  })

  describe('useEarningsSummary', () => {
    it('should export useEarningsSummary function', () => {
      expect(typeof useEarningsSummary).toBe('function')
    })

    it('should accept no arguments', () => {
      expect(useEarningsSummary.length).toBe(0)
    })
  })

  describe('useDailyEarnings', () => {
    it('should export useDailyEarnings function', () => {
      expect(typeof useDailyEarnings).toBe('function')
    })

    it('should accept two string arguments', () => {
      expect(useDailyEarnings.length).toBe(2)
    })
  })

  describe('useServiceEarnings', () => {
    it('should export useServiceEarnings function', () => {
      expect(typeof useServiceEarnings).toBe('function')
    })

    it('should accept two string arguments', () => {
      expect(useServiceEarnings.length).toBe(2)
    })
  })

  describe('usePayouts', () => {
    it('should export usePayouts function', () => {
      expect(typeof usePayouts).toBe('function')
    })

    it('should accept optional realtime parameter', () => {
      // Default parameter, length is 0
      expect(usePayouts.length).toBe(0)
    })
  })

  describe('useBankAccounts', () => {
    it('should export useBankAccounts function', () => {
      expect(typeof useBankAccounts).toBe('function')
    })

    it('should accept no arguments', () => {
      expect(useBankAccounts.length).toBe(0)
    })
  })
})
