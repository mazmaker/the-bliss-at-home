import { describe, it, expect, vi, beforeEach } from 'vitest'

// Setup mocks with vi.hoisted
const {
  mockFrom,
  mockSelect,
  mockEq,
  mockOrder,
  mockSingle,
  mockUpdate,
  mockGte,
  mockRpc,
} = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockOrder = vi.fn()
  const mockSelect = vi.fn()
  const mockUpdate = vi.fn()
  const mockGte = vi.fn()

  const chain = () => ({
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
    update: mockUpdate,
    gte: mockGte,
  })

  mockSelect.mockImplementation(() => chain())
  mockEq.mockImplementation(() => chain())
  mockOrder.mockImplementation(() => chain())
  mockSingle.mockImplementation(() => chain())
  mockUpdate.mockImplementation(() => chain())
  mockGte.mockImplementation(() => chain())

  const mockFrom = vi.fn(() => chain())
  const mockRpc = vi.fn()

  return { mockFrom, mockSelect, mockEq, mockOrder, mockSingle, mockUpdate, mockGte, mockRpc }
})

vi.mock('../supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
  },
}))

vi.mock('../mockAuth', () => ({
  USE_MOCK_AUTH: false,
}))

import {
  getPendingStaffApplications,
  getStaffApplications,
  getStaffApplication,
  approveStaffApplication,
  rejectStaffApplication,
  getStaffProfiles,
  getStaffStats,
  toggleStaffStatus,
  checkStaffStatus,
  canApplyAsStaff,
} from '../staffQueries'
import type { StaffApplication, StaffProfile } from '../staffQueries'

describe('staffQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPendingStaffApplications', () => {
    it('should fetch pending applications ordered by date', async () => {
      const mockData = [
        {
          id: '1',
          line_user_id: 'U123',
          full_name: 'Test Staff',
          phone_number: '0812345678',
          skills: ['massage'],
          experience_years: 3,
          status: 'PENDING',
          application_date: '2026-01-01T00:00:00Z',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await getPendingStaffApplications()

      expect(mockFrom).toHaveBeenCalledWith('staff_applications')
      expect(mockEq).toHaveBeenCalledWith('status', 'PENDING')
      expect(result).toEqual(mockData)
    })

    it('should throw on error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error fetching applications' },
      })

      await expect(getPendingStaffApplications()).rejects.toEqual({
        message: 'Error fetching applications',
      })
    })
  })

  describe('getStaffApplications', () => {
    it('should fetch all applications when no status filter', async () => {
      const mockData = [
        { id: '1', status: 'PENDING' },
        { id: '2', status: 'APPROVED' },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await getStaffApplications()

      expect(mockFrom).toHaveBeenCalledWith('staff_applications')
      expect(result).toEqual(mockData)
    })

    it('should filter by status when provided', async () => {
      const mockData = [{ id: '1', status: 'APPROVED' }]

      // Source: let query = supabase.from().select().order()
      // Then query = query.eq('status', 'APPROVED') -- so order returns chain, eq is terminal
      const chainObj = { select: mockSelect, eq: mockEq, order: mockOrder, single: mockSingle, update: mockUpdate, gte: mockGte }
      mockOrder.mockReturnValueOnce(chainObj)
      mockEq.mockResolvedValueOnce({ data: mockData, error: null })

      // When status is not 'all', it filters by uppercased status
      const result = await getStaffApplications('approved')

      expect(mockEq).toHaveBeenCalledWith('status', 'APPROVED')
      expect(result).toEqual(mockData)
    })

    it('should not filter when status is "all"', async () => {
      // Source: let query = supabase.from().select().order()
      // status='all' -> no eq called -> order is terminal
      mockOrder.mockResolvedValueOnce({ data: [], error: null })

      await getStaffApplications('all')

      // eq should not be called with status when 'all'
      expect(mockEq).not.toHaveBeenCalledWith('status', 'ALL')
    })

    it('should throw on error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      await expect(getStaffApplications()).rejects.toEqual({ message: 'Error' })
    })
  })

  describe('getStaffApplication', () => {
    it('should fetch a single application by ID', async () => {
      const mockApp = {
        id: '1',
        full_name: 'Test Staff',
        status: 'PENDING',
      }

      mockSingle.mockResolvedValueOnce({ data: mockApp, error: null })

      const result = await getStaffApplication('1')

      expect(mockFrom).toHaveBeenCalledWith('staff_applications')
      expect(mockEq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(mockApp)
    })

    it('should throw on error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      await expect(getStaffApplication('bad-id')).rejects.toEqual({ message: 'Not found' })
    })
  })

  describe('approveStaffApplication', () => {
    it('should call rpc to approve and return success', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{
          success: true,
          staff_profile_id: 'sp-1',
          line_user_id: 'U123',
        }],
        error: null,
      })

      const result = await approveStaffApplication('app-1', 'admin-1')

      expect(mockRpc).toHaveBeenCalledWith('approve_staff_application_v2', {
        p_application_id: 'app-1',
        p_admin_id: 'admin-1',
      })
      expect(result.success).toBe(true)
      expect(result.staffProfileId).toBe('sp-1')
      expect(result.lineUserId).toBe('U123')
    })

    it('should return failure when rpc result has success=false', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ success: false }],
        error: null,
      })

      const result = await approveStaffApplication('app-1', 'admin-1')

      expect(result.success).toBe(false)
    })

    it('should handle duplicate approval error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'already has a pending or approved application' },
      })

      const result = await approveStaffApplication('app-1', 'admin-1')

      expect(result.success).toBe(false)
      expect(result.message).toContain('อนุมัติแล้ว')
    })

    it('should throw on unexpected rpc error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      })

      await expect(approveStaffApplication('app-1', 'admin-1')).rejects.toEqual({
        message: 'Database connection failed',
      })
    })
  })

  describe('rejectStaffApplication', () => {
    it('should call rpc and return true on success', async () => {
      mockRpc.mockResolvedValueOnce({ data: true, error: null })

      const result = await rejectStaffApplication('app-1', 'admin-1', 'Not qualified')

      expect(mockRpc).toHaveBeenCalledWith('reject_staff_application', {
        p_application_id: 'app-1',
        p_admin_id: 'admin-1',
        p_rejection_reason: 'Not qualified',
      })
      expect(result).toBe(true)
    })

    it('should throw on error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Reject error' },
      })

      await expect(rejectStaffApplication('app-1', 'admin-1', 'reason')).rejects.toEqual({
        message: 'Reject error',
      })
    })
  })

  describe('getStaffProfiles', () => {
    it('should fetch all staff profiles ordered by rating', async () => {
      const mockData = [
        { id: '1', full_name: 'Staff A', rating: 4.8, is_active: true, skills: ['massage'] },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await getStaffProfiles()

      expect(mockFrom).toHaveBeenCalledWith('staff_profiles')
      expect(result).toEqual(mockData)
    })

    it('should apply is_active filter', async () => {
      // Source: let query = supabase.from().select('*').order('rating', ...)
      // Then query = query.eq('is_active', true) -> order returns chain, eq is terminal
      const chainObj = { select: mockSelect, eq: mockEq, order: mockOrder, single: mockSingle, update: mockUpdate, gte: mockGte }
      mockOrder.mockReturnValueOnce(chainObj)
      mockEq.mockResolvedValueOnce({ data: [], error: null })

      await getStaffProfiles({ is_active: true })

      expect(mockEq).toHaveBeenCalledWith('is_active', true)
    })

    it('should apply min_rating filter', async () => {
      // Source: let query = supabase.from().select('*').order('rating', ...)
      // Then query = query.gte('rating', min_rating) -> order returns chain, gte is terminal
      const chainObj = { select: mockSelect, eq: mockEq, order: mockOrder, single: mockSingle, update: mockUpdate, gte: mockGte }
      mockOrder.mockReturnValueOnce(chainObj)
      mockGte.mockResolvedValueOnce({ data: [], error: null })

      await getStaffProfiles({ min_rating: 4.0 })

      expect(mockGte).toHaveBeenCalledWith('rating', 4.0)
    })

    it('should filter by skills client-side', async () => {
      const mockData = [
        { id: '1', skills: ['massage', 'spa'], rating: 4.5, is_active: true },
        { id: '2', skills: ['nail'], rating: 4.0, is_active: true },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await getStaffProfiles({ skills: ['massage'] })

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('1')
    })

    it('should throw on error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      await expect(getStaffProfiles()).rejects.toEqual({ message: 'Error' })
    })
  })

  describe('getStaffStats', () => {
    it('should return aggregated staff statistics', async () => {
      const mockApps = [
        { status: 'PENDING' },
        { status: 'PENDING' },
        { status: 'APPROVED' },
        { status: 'REJECTED' },
      ]
      const mockProfiles = [
        { is_active: true, rating: 4.5, total_jobs: 50 },
        { is_active: true, rating: 4.0, total_jobs: 30 },
        { is_active: false, rating: 3.5, total_jobs: 10 },
      ]

      // First call: application stats
      mockSelect.mockResolvedValueOnce({ data: mockApps, error: null })
      // Second call: profile stats
      mockSelect.mockResolvedValueOnce({ data: mockProfiles, error: null })

      const result = await getStaffStats()

      expect(result.pending_applications).toBe(2)
      expect(result.approved_applications).toBe(1)
      expect(result.rejected_applications).toBe(1)
      expect(result.active_staff).toBe(2)
      expect(result.total_staff).toBe(3)
      expect(result.total_jobs_completed).toBe(90)
    })

    it('should handle null data gracefully', async () => {
      mockSelect.mockResolvedValueOnce({ data: null, error: null })
      mockSelect.mockResolvedValueOnce({ data: null, error: null })

      const result = await getStaffStats()

      expect(result.pending_applications).toBe(0)
      expect(result.total_staff).toBe(0)
      expect(result.total_jobs_completed).toBe(0)
    })
  })

  describe('toggleStaffStatus', () => {
    it('should toggle staff is_active status', async () => {
      const chainObj = { select: mockSelect, eq: mockEq, order: mockOrder, single: mockSingle, update: mockUpdate, gte: mockGte }
      // Query 1: .select('is_active').eq('id', profileId).single()
      //   eq is intermediate (call 1), single is terminal
      // Query 2: .update({...}).eq('id', profileId)
      //   eq is terminal (call 2)
      mockEq
        .mockReturnValueOnce(chainObj) // Query 1: intermediate
        .mockResolvedValueOnce({ error: null }) // Query 2: terminal
      mockSingle.mockResolvedValueOnce({ data: { is_active: true } })

      const result = await toggleStaffStatus('1')

      expect(mockFrom).toHaveBeenCalledWith('staff_profiles')
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
      expect(result).toBe(true)
    })

    it('should throw when profile not found', async () => {
      const chainObj = { select: mockSelect, eq: mockEq, order: mockOrder, single: mockSingle, update: mockUpdate, gte: mockGte }
      // Query 1: .select('is_active').eq('id', profileId).single()
      mockEq.mockReturnValueOnce(chainObj)
      mockSingle.mockResolvedValueOnce({ data: null })

      await expect(toggleStaffStatus('bad-id')).rejects.toThrow('Staff profile not found')
    })

    it('should throw on update error', async () => {
      const chainObj = { select: mockSelect, eq: mockEq, order: mockOrder, single: mockSingle, update: mockUpdate, gte: mockGte }
      // Query 1: .select('is_active').eq('id', profileId).single()
      //   eq intermediate, single terminal
      // Query 2: .update({...}).eq('id', profileId)
      //   eq terminal
      mockEq
        .mockReturnValueOnce(chainObj) // Query 1 intermediate
        .mockResolvedValueOnce({ error: { message: 'Update failed' } }) // Query 2 terminal
      mockSingle.mockResolvedValueOnce({ data: { is_active: false } })

      await expect(toggleStaffStatus('1')).rejects.toEqual({ message: 'Update failed' })
    })
  })

  describe('checkStaffStatus', () => {
    it('should return approved status with staff profile', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{
          is_approved: true,
          staff_profile_id: 'sp-1',
          full_name: 'Staff A',
          skills: ['massage'],
          rating: 4.5,
          total_jobs: 50,
          is_active: true,
        }],
        error: null,
      })

      const result = await checkStaffStatus('U123')

      expect(mockRpc).toHaveBeenCalledWith('staff_login_check', { p_line_user_id: 'U123' })
      expect(result.isApproved).toBe(true)
      expect(result.status).toBe('approved')
      expect(result.staffProfile).toBeDefined()
      expect(result.staffProfile?.full_name).toBe('Staff A')
    })

    it('should return not_applied when no result and no application', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ is_approved: false }],
        error: null,
      })
      mockSingle.mockResolvedValueOnce({ data: null })

      const result = await checkStaffStatus('U999')

      expect(result.isApproved).toBe(false)
      expect(result.status).toBe('not_applied')
    })

    it('should return pending when application is pending', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ is_approved: false }],
        error: null,
      })
      mockSingle.mockResolvedValueOnce({ data: { status: 'PENDING' } })

      const result = await checkStaffStatus('U456')

      expect(result.isApproved).toBe(false)
      expect(result.status).toBe('pending')
    })

    it('should throw on rpc error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'RPC error' },
      })

      await expect(checkStaffStatus('U123')).rejects.toEqual({ message: 'RPC error' })
    })
  })

  describe('type validation', () => {
    it('should validate StaffApplication interface', () => {
      const app: StaffApplication = {
        id: '1',
        line_user_id: 'U123',
        full_name: 'Test Staff',
        phone_number: '0812345678',
        skills: ['massage'],
        experience_years: 5,
        status: 'PENDING',
        application_date: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      expect(app.status).toBe('PENDING')
    })

    it('should validate StaffProfile interface', () => {
      const profile: StaffProfile = {
        id: '1',
        application_id: 'app-1',
        line_user_id: 'U123',
        full_name: 'Test Staff',
        phone_number: '0812345678',
        skills: ['massage'],
        experience_years: 5,
        rating: 4.5,
        total_jobs: 50,
        is_active: true,
        is_available: true,
        last_active_at: '2026-01-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      expect(profile.rating).toBe(4.5)
    })
  })
})
