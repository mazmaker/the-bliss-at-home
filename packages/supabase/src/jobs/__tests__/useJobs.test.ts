import { describe, it, expect, vi, beforeEach } from 'vitest'

const {
  mockGetStaffJobs,
  mockGetPendingJobs,
  mockGetJob,
  mockAcceptJob,
  mockDeclineJob,
  mockUpdateJobStatus,
  mockCancelJob,
  mockGetStaffStats,
  mockSubscribeToJobs,
  mockReportSOS,
} = vi.hoisted(() => ({
  mockGetStaffJobs: vi.fn(),
  mockGetPendingJobs: vi.fn(),
  mockGetJob: vi.fn(),
  mockAcceptJob: vi.fn(),
  mockDeclineJob: vi.fn(),
  mockUpdateJobStatus: vi.fn(),
  mockCancelJob: vi.fn(),
  mockGetStaffStats: vi.fn(),
  mockSubscribeToJobs: vi.fn(() => vi.fn()),
  mockReportSOS: vi.fn(),
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

vi.mock('../../utils/providerPreference', () => ({
  isJobMatchingStaffGender: vi.fn().mockReturnValue(true),
}))

vi.mock('../jobService', () => ({
  getStaffJobs: mockGetStaffJobs,
  getPendingJobs: mockGetPendingJobs,
  getJob: mockGetJob,
  acceptJob: mockAcceptJob,
  declineJob: mockDeclineJob,
  updateJobStatus: mockUpdateJobStatus,
  cancelJob: mockCancelJob,
  getStaffStats: mockGetStaffStats,
  subscribeToJobs: mockSubscribeToJobs,
  reportSOS: mockReportSOS,
}))

import { useJobs, useJob, useStaffStats, useSOS } from '../useJobs'

describe('useJobs hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: null, isLoading: true })
  })

  describe('useJobs', () => {
    it('should export useJobs function', () => {
      expect(typeof useJobs).toBe('function')
    })

    it('should accept optional options parameter', () => {
      // Default parameter means length is 0
      expect(useJobs.length).toBe(0)
    })
  })

  describe('useJob', () => {
    it('should export useJob function', () => {
      expect(typeof useJob).toBe('function')
    })

    it('should accept a jobId parameter', () => {
      expect(useJob.length).toBe(1)
    })
  })

  describe('useStaffStats', () => {
    it('should export useStaffStats function', () => {
      expect(typeof useStaffStats).toBe('function')
    })

    it('should accept no arguments', () => {
      expect(useStaffStats.length).toBe(0)
    })
  })

  describe('useSOS', () => {
    it('should export useSOS function', () => {
      expect(typeof useSOS).toBe('function')
    })

    it('should accept no arguments', () => {
      expect(useSOS.length).toBe(0)
    })
  })
})
