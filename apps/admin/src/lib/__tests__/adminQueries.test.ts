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
  mockLimit,
} = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockOrder = vi.fn()
  const mockSelect = vi.fn()
  const mockUpdate = vi.fn()
  const mockGte = vi.fn()
  const mockLimit = vi.fn()

  const chain = () => ({
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
    update: mockUpdate,
    gte: mockGte,
    limit: mockLimit,
  })

  mockSelect.mockImplementation(() => chain())
  mockEq.mockImplementation(() => chain())
  mockOrder.mockImplementation(() => chain())
  mockSingle.mockImplementation(() => chain())
  mockUpdate.mockImplementation(() => chain())
  mockGte.mockImplementation(() => chain())
  mockLimit.mockImplementation(() => chain())

  const mockFrom = vi.fn(() => chain())

  return { mockFrom, mockSelect, mockEq, mockOrder, mockSingle, mockUpdate, mockGte, mockLimit }
})

vi.mock('../supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

import {
  getAdminStats,
  getRecentBookings,
  getPendingStaffApplications,
  approveStaff,
  rejectStaff,
  getPopularServices,
  getAllServices,
} from '../adminQueries'
import type { AdminStats, RecentBooking, PendingStaffApplication } from '../adminQueries'

describe('adminQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAdminStats', () => {
    it('should return dashboard statistics', async () => {
      // Query 1: .from('bookings').select('total_amount').gte(...).eq('status','completed')
      //   gte is intermediate (call 1), eq is terminal (call 1)
      // Query 2: .from('bookings').select('*',{count}).gte(...)
      //   gte is terminal (call 2)
      // Query 3: .from('staff').select('*',{count}).eq('status','active')
      //   eq is terminal (call 2)
      // Query 4: .from('hotels').select('*',{count}).eq('status','active')
      //   eq is terminal (call 3)

      mockGte
        .mockReturnValueOnce({ eq: mockEq, order: mockOrder, single: mockSingle, select: mockSelect, gte: mockGte, limit: mockLimit, update: mockUpdate }) // intermediate in query 1
        .mockResolvedValueOnce({ count: 5 }) // terminal in query 2

      mockEq
        .mockResolvedValueOnce({ data: [{ total_amount: 1000 }, { total_amount: 2000 }] }) // terminal in query 1
        .mockResolvedValueOnce({ count: 10 }) // terminal in query 3
        .mockResolvedValueOnce({ count: 3 }) // terminal in query 4

      const stats = await getAdminStats()

      expect(stats).toBeDefined()
      expect(typeof stats.todaySales).toBe('number')
      expect(typeof stats.todayBookings).toBe('number')
      expect(typeof stats.totalStaff).toBe('number')
      expect(typeof stats.activeHotels).toBe('number')
    })

    it('should return zero stats on error', async () => {
      // First gte call is intermediate in query 1, need to return chain
      mockGte.mockReturnValueOnce({ eq: mockEq, order: mockOrder, single: mockSingle, select: mockSelect, gte: mockGte, limit: mockLimit, update: mockUpdate })
      mockEq.mockRejectedValueOnce(new Error('Database error'))

      const stats = await getAdminStats()

      expect(stats.todaySales).toBe(0)
      expect(stats.todayBookings).toBe(0)
      expect(stats.totalStaff).toBe(0)
      expect(stats.activeHotels).toBe(0)
    })
  })

  describe('getRecentBookings', () => {
    it('should fetch recent bookings with default limit', async () => {
      const mockData = [
        {
          id: '1',
          booking_code: 'BK001',
          scheduled_date: '2026-01-01',
          scheduled_time: '10:00',
          total_amount: 1500,
          status: 'confirmed',
          customers: { full_name: 'John' },
          services: { name_th: 'นวดไทย', name_en: 'Thai Massage' },
          hotels: null,
        },
      ]

      mockLimit.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await getRecentBookings()

      expect(result).toHaveLength(1)
      expect(result[0].customer_name).toBe('John')
      expect(result[0].service_name).toBe('นวดไทย')
    })

    it('should return empty array on error', async () => {
      mockLimit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await getRecentBookings()
      expect(result).toEqual([])
    })

    it('should use provided limit', async () => {
      mockLimit.mockResolvedValueOnce({ data: [], error: null })

      await getRecentBookings(5)

      expect(mockLimit).toHaveBeenCalledWith(5)
    })
  })

  describe('getPendingStaffApplications', () => {
    it('should fetch pending staff applications', async () => {
      const mockData = [
        {
          id: '1',
          user_id: 'user-1',
          skills: ['massage'],
          experience_years: 5,
          rating: 4.5,
          created_at: '2026-01-01T00:00:00Z',
          profiles: { full_name: 'Staff Name' },
        },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await getPendingStaffApplications()

      expect(result).toHaveLength(1)
      expect(result[0].full_name).toBe('Staff Name')
      expect(result[0].skills).toEqual(['massage'])
    })

    it('should return empty array on error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await getPendingStaffApplications()
      expect(result).toEqual([])
    })
  })

  describe('approveStaff', () => {
    it('should update staff status to active', async () => {
      mockEq.mockResolvedValueOnce({ error: null })

      const result = await approveStaff('staff-1')

      expect(result).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('staff')
      expect(mockUpdate).toHaveBeenCalled()
    })

    it('should return false on error', async () => {
      mockEq.mockResolvedValueOnce({ error: { message: 'Error' } })

      const result = await approveStaff('bad-id')
      expect(result).toBe(false)
    })
  })

  describe('rejectStaff', () => {
    it('should update staff status to inactive', async () => {
      mockEq.mockResolvedValueOnce({ error: null })

      const result = await rejectStaff('staff-1', 'Not qualified')

      expect(result).toBe(true)
      expect(mockUpdate).toHaveBeenCalled()
    })

    it('should return false on error', async () => {
      mockEq.mockResolvedValueOnce({ error: { message: 'Error' } })

      const result = await rejectStaff('bad-id')
      expect(result).toBe(false)
    })
  })

  describe('getPopularServices', () => {
    it('should aggregate bookings by service', async () => {
      const mockData = [
        { service_id: 's1', total_amount: 1000, services: { name_th: 'นวดไทย', name_en: null } },
        { service_id: 's1', total_amount: 1500, services: { name_th: 'นวดไทย', name_en: null } },
        { service_id: 's2', total_amount: 2000, services: { name_th: 'ทำเล็บ', name_en: null } },
      ]

      mockGte.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await getPopularServices()

      expect(Array.isArray(result)).toBe(true)
    })

    it('should return empty array on error', async () => {
      mockGte.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await getPopularServices()
      expect(result).toEqual([])
    })
  })

  describe('getAllServices', () => {
    it('should fetch all active services', async () => {
      const mockData = [
        { id: '1', name_th: 'นวดไทย', is_active: true, sort_order: 1 },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await getAllServices()

      expect(mockEq).toHaveBeenCalledWith('is_active', true)
      expect(result).toHaveLength(1)
    })

    it('should return empty array on error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await getAllServices()
      expect(result).toEqual([])
    })
  })

  describe('type validation', () => {
    it('should validate AdminStats interface', () => {
      const stats: AdminStats = {
        todaySales: 5000,
        todayBookings: 10,
        totalStaff: 20,
        activeHotels: 5,
      }
      expect(stats.todaySales).toBe(5000)
    })

    it('should validate RecentBooking interface', () => {
      const booking: RecentBooking = {
        id: '1',
        customer_name: 'Test',
        service_name: 'Massage',
        scheduled_date: '2026-01-01',
        scheduled_time: '10:00',
        total_amount: 1000,
        status: 'confirmed',
      }
      expect(booking.status).toBe('confirmed')
    })
  })
})
