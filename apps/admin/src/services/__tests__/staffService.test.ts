import { describe, it, expect, vi, beforeEach } from 'vitest'

// Setup mocks with vi.hoisted
const {
  mockFrom,
  mockSelect,
  mockEq,
  mockOrder,
  mockSingle,
  mockUpdate,
  mockInsert,
  mockOr,
  mockDelete,
} = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockOrder = vi.fn()
  const mockSelect = vi.fn()
  const mockUpdate = vi.fn()
  const mockInsert = vi.fn()
  const mockOr = vi.fn()
  const mockDelete = vi.fn()

  const chain = () => ({
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
    update: mockUpdate,
    insert: mockInsert,
    or: mockOr,
    delete: mockDelete,
  })

  mockSelect.mockImplementation(() => chain())
  mockEq.mockImplementation(() => chain())
  mockOrder.mockImplementation(() => chain())
  mockSingle.mockImplementation(() => chain())
  mockUpdate.mockImplementation(() => chain())
  mockInsert.mockImplementation(() => chain())
  mockOr.mockImplementation(() => chain())
  mockDelete.mockImplementation(() => chain())

  const mockFrom = vi.fn(() => chain())

  return {
    mockFrom, mockSelect, mockEq, mockOrder, mockSingle,
    mockUpdate, mockInsert, mockOr, mockDelete,
  }
})

// Mock import.meta.env
vi.stubEnv('VITE_USE_MOCK_AUTH', 'false')

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

import { staffService } from '../staffService'
import type { Staff, CreateStaffData, InviteLinkData, StaffSkill } from '../staffService'

describe('staffService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('exports', () => {
    it('should export staffService object with all methods', () => {
      expect(staffService).toBeDefined()
      expect(typeof staffService.getAllStaff).toBe('function')
      expect(typeof staffService.getStaffById).toBe('function')
      expect(typeof staffService.createStaff).toBe('function')
      expect(typeof staffService.updateStaffStatus).toBe('function')
      expect(typeof staffService.updateStaff).toBe('function')
      expect(typeof staffService.getStaffStats).toBe('function')
      expect(typeof staffService.generateLineInvite).toBe('function')
      expect(typeof staffService.getInviteLink).toBe('function')
      expect(typeof staffService.regenerateInvite).toBe('function')
    })
  })

  describe('getAllStaff (non-mock mode)', () => {
    it('should fetch all staff from supabase', async () => {
      const mockStaff = [
        { id: '1', name_th: 'สมหญิง', status: 'active', rating: 4.8 },
        { id: '2', name_th: 'สมชาย', status: 'pending', rating: 0 },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockStaff, error: null })

      const result = await staffService.getAllStaff()

      expect(mockFrom).toHaveBeenCalledWith('staff')
      expect(result).toHaveLength(2)
    })

    it('should apply status filter', async () => {
      // Source: let query = supabase.from().select().order() -> query = query.eq('status', ...)
      // order is intermediate, eq is terminal
      const chainObj = { select: mockSelect, eq: mockEq, order: mockOrder, single: mockSingle, update: mockUpdate, insert: mockInsert, or: mockOr, delete: mockDelete }
      mockOrder.mockReturnValueOnce(chainObj)
      mockEq.mockResolvedValueOnce({ data: [], error: null })

      await staffService.getAllStaff({ status: 'active' })

      expect(mockEq).toHaveBeenCalledWith('status', 'active')
    })

    it('should apply search filter', async () => {
      // Source: let query = supabase.from().select().order() -> query = query.or(...)
      // order is intermediate, or is terminal
      const chainObj = { select: mockSelect, eq: mockEq, order: mockOrder, single: mockSingle, update: mockUpdate, insert: mockInsert, or: mockOr, delete: mockDelete }
      mockOrder.mockReturnValueOnce(chainObj)
      mockOr.mockResolvedValueOnce({ data: [], error: null })

      await staffService.getAllStaff({ search: 'สมหญิง' })

      expect(mockOr).toHaveBeenCalled()
    })

    it('should not apply status filter when "all"', async () => {
      mockOrder.mockResolvedValueOnce({ data: [], error: null })

      await staffService.getAllStaff({ status: 'all' })

      // Should not call eq with 'status' for 'all'
      const statusEqCalls = mockEq.mock.calls.filter(
        (call: any[]) => call[0] === 'status'
      )
      expect(statusEqCalls).toHaveLength(0)
    })

    it('should throw on supabase error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'DB error' },
      })

      await expect(staffService.getAllStaff()).rejects.toThrow()
    })
  })

  describe('getStaffById (non-mock mode)', () => {
    it('should fetch a single staff member by id', async () => {
      const mockStaffMember = {
        id: 'staff-1',
        name_th: 'สมหญิง',
        status: 'active',
        skills: [],
      }

      mockSingle.mockResolvedValueOnce({ data: mockStaffMember, error: null })

      const result = await staffService.getStaffById('staff-1')

      expect(mockFrom).toHaveBeenCalledWith('staff')
      expect(mockEq).toHaveBeenCalledWith('id', 'staff-1')
      expect(result.name_th).toBe('สมหญิง')
    })

    it('should throw on error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      await expect(staffService.getStaffById('nonexistent')).rejects.toThrow()
    })
  })

  describe('createStaff (non-mock mode)', () => {
    it('should create a new staff member', async () => {
      const newStaff: CreateStaffData = {
        name_th: 'ใหม่ สมัคร',
        phone: '081-111-2222',
      }

      const createdStaff = { id: 'new-1', ...newStaff, status: 'pending' }

      mockSingle.mockResolvedValueOnce({ data: createdStaff, error: null })

      const result = await staffService.createStaff(newStaff)

      expect(mockFrom).toHaveBeenCalledWith('staff')
      expect(mockInsert).toHaveBeenCalled()
      expect(result.id).toBe('new-1')
    })

    it('should add skills when provided', async () => {
      const newStaff: CreateStaffData = {
        name_th: 'ทดสอบ',
        phone: '081-111-3333',
        skills: ['skill-uuid-1', 'skill-uuid-2'],
      }

      const createdStaff = { id: 'new-2', ...newStaff, status: 'pending' }

      // Query 1: .from('staff').insert({...}).select().single() - single is terminal
      mockSingle.mockResolvedValueOnce({ data: createdStaff, error: null })
      // Query 2: .from('staff_skills').insert(skillsData) - insert is terminal
      // First insert (query 1) should return chain (default impl), second insert (query 2) resolves
      const chainObj = { select: mockSelect, eq: mockEq, order: mockOrder, single: mockSingle, update: mockUpdate, insert: mockInsert, or: mockOr, delete: mockDelete }
      mockInsert
        .mockReturnValueOnce(chainObj) // Query 1: intermediate (staff insert), chain continues to .select().single()
        .mockResolvedValueOnce({ error: null }) // Query 2: terminal (skills insert)

      const result = await staffService.createStaff(newStaff)

      expect(result.id).toBe('new-2')
    })
  })

  describe('updateStaffStatus (non-mock mode)', () => {
    it('should update staff status', async () => {
      const updated = { id: 'staff-1', status: 'active' }

      mockSingle.mockResolvedValueOnce({ data: updated, error: null })

      const result = await staffService.updateStaffStatus('staff-1', 'active')

      expect(mockUpdate).toHaveBeenCalledWith({ status: 'active' })
      expect(result.status).toBe('active')
    })

    it('should throw on error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      await expect(staffService.updateStaffStatus('bad', 'active')).rejects.toThrow()
    })
  })

  describe('updateStaff (non-mock mode)', () => {
    it('should update staff data without skills', async () => {
      const updated = { id: 'staff-1', name_th: 'Updated Name' }

      mockSingle.mockResolvedValueOnce({ data: updated, error: null })

      const result = await staffService.updateStaff('staff-1', { name_th: 'Updated Name' })

      expect(mockUpdate).toHaveBeenCalled()
      expect(result.name_th).toBe('Updated Name')
    })

    it('should handle skill updates by deleting and inserting', async () => {
      const updated = { id: 'staff-1', name_th: 'Name' }

      // Query 1: .from('staff').update({...}).eq('id', id).select().single()
      // eq is intermediate here (chain continues to .select().single())
      const chainObj = { select: mockSelect, eq: mockEq, order: mockOrder, single: mockSingle, update: mockUpdate, insert: mockInsert, or: mockOr, delete: mockDelete }
      mockEq.mockReturnValueOnce(chainObj) // Query 1: eq('id') - intermediate
      mockSingle.mockResolvedValueOnce({ data: updated, error: null })
      // Query 2: .from('staff_skills').delete().eq('staff_id', id) - eq is terminal
      mockEq.mockResolvedValueOnce({ error: null })
      // Query 3: .from('staff_skills').insert(skillsData) - insert is terminal
      mockInsert.mockResolvedValueOnce({ error: null })

      await staffService.updateStaff('staff-1', { skills: ['skill-1'] })

      expect(mockFrom).toHaveBeenCalledWith('staff')
    })
  })

  describe('getStaffStats (non-mock mode)', () => {
    it('should calculate stats from staff data', async () => {
      const mockData = [
        { status: 'active', rating: 4.5 },
        { status: 'active', rating: 4.0 },
        { status: 'pending', rating: 0 },
        { status: 'inactive', rating: 3.5 },
      ]

      mockSelect.mockResolvedValueOnce({ data: mockData, error: null })

      const stats = await staffService.getStaffStats()

      expect(stats.total).toBe(4)
      expect(stats.active).toBe(2)
      expect(stats.pending).toBe(1)
      expect(stats.inactive).toBe(1)
      expect(stats.suspended).toBe(0)
      expect(stats.averageRating).toBe(3) // (4.5 + 4.0 + 0 + 3.5) / 4
    })

    it('should throw on error', async () => {
      mockSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      await expect(staffService.getStaffStats()).rejects.toThrow()
    })
  })

  describe('type validation', () => {
    it('should validate Staff interface', () => {
      const staff: Staff = {
        id: '1',
        name_th: 'ทดสอบ',
        phone: '081-000-0000',
        status: 'active',
        rating: 4.5,
        total_reviews: 10,
        total_jobs: 50,
        total_earnings: 100000,
        is_available: true,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      }
      expect(staff.status).toBe('active')
    })

    it('should validate CreateStaffData interface', () => {
      const data: CreateStaffData = {
        name_th: 'ใหม่',
        phone: '081-000-0000',
        skills: ['skill-1'],
      }
      expect(data.skills).toHaveLength(1)
    })

    it('should validate InviteLinkData interface', () => {
      const invite: InviteLinkData = {
        inviteLink: 'https://example.com/invite',
        qrCode: 'https://example.com/qr',
        expiresAt: '2026-01-01',
        isExpired: false,
      }
      expect(invite.isExpired).toBe(false)
    })
  })
})
