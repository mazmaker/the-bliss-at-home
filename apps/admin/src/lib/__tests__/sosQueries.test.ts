import { describe, it, expect, vi, beforeEach } from 'vitest'

// Setup mocks with vi.hoisted
const {
  mockFrom,
  mockSelect,
  mockEq,
  mockOrder,
  mockSingle,
  mockUpdate,
  mockIn,
  mockNot,
} = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockOrder = vi.fn()
  const mockSelect = vi.fn()
  const mockUpdate = vi.fn()
  const mockIn = vi.fn()
  const mockNot = vi.fn()

  const chain = () => ({
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
    update: mockUpdate,
    in: mockIn,
    not: mockNot,
  })

  mockSelect.mockImplementation(() => chain())
  mockEq.mockImplementation(() => chain())
  mockOrder.mockImplementation(() => chain())
  mockSingle.mockImplementation(() => chain())
  mockUpdate.mockImplementation(() => chain())
  mockIn.mockImplementation(() => chain())
  mockNot.mockImplementation(() => chain())

  const mockFrom = vi.fn(() => chain())

  return { mockFrom, mockSelect, mockEq, mockOrder, mockSingle, mockUpdate, mockIn, mockNot }
})

vi.mock('../supabase', () => ({
  supabase: { from: mockFrom },
}))

import {
  getAllSOSAlerts,
  getPendingSOSAlerts,
  acknowledgeSOSAlert,
  resolveSOSAlert,
  cancelSOSAlert,
  getSOSStatistics,
} from '../sosQueries'
import type { SOSAlert, SOSSourceType } from '../sosQueries'

describe('sosQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllSOSAlerts', () => {
    it('should fetch all SOS alerts with joined customer/staff data', async () => {
      const mockData = [
        {
          id: '1',
          customer_id: 'c1',
          staff_id: null,
          status: 'pending',
          priority: 'high',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          customers: { full_name: 'Customer A', phone: '0812345678' },
          staff: null,
        },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await getAllSOSAlerts()

      expect(mockFrom).toHaveBeenCalledWith('sos_alerts')
      expect(result).toHaveLength(1)
      expect(result[0].source_type).toBe('customer')
      expect(result[0].source_name).toBe('Customer A')
      expect(result[0].source_phone).toBe('0812345678')
    })

    it('should identify staff source type from staff_id', async () => {
      const mockData = [
        {
          id: '2',
          customer_id: null,
          staff_id: 's1',
          status: 'pending',
          priority: 'medium',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          customers: null,
          staff: { name_th: 'Staff B', phone: '0898765432' },
        },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await getAllSOSAlerts()

      expect(result[0].source_type).toBe('staff')
      expect(result[0].source_name).toBe('Staff B')
    })

    it('should apply customer source filter', async () => {
      mockNot.mockResolvedValueOnce({ data: [], error: null })

      await getAllSOSAlerts('customer')

      expect(mockNot).toHaveBeenCalledWith('customer_id', 'is', null)
    })

    it('should apply staff source filter', async () => {
      mockNot.mockResolvedValueOnce({ data: [], error: null })

      await getAllSOSAlerts('staff')

      expect(mockNot).toHaveBeenCalledWith('staff_id', 'is', null)
    })

    it('should throw on error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(getAllSOSAlerts()).rejects.toEqual({ message: 'Database error' })
    })

    it('should return empty array when data is null', async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: null })

      const result = await getAllSOSAlerts()
      expect(result).toEqual([])
    })
  })

  describe('getPendingSOSAlerts', () => {
    it('should fetch only pending and acknowledged alerts', async () => {
      const mockData = [
        {
          id: '1',
          customer_id: 'c1',
          staff_id: null,
          status: 'pending',
          priority: 'high',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          customers: { full_name: 'Customer A', phone: '0812345678' },
          staff: null,
        },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await getPendingSOSAlerts()

      expect(mockFrom).toHaveBeenCalledWith('sos_alerts')
      expect(mockIn).toHaveBeenCalledWith('status', ['pending', 'acknowledged'])
      expect(result).toHaveLength(1)
    })

    it('should apply source filter for customer', async () => {
      mockNot.mockResolvedValueOnce({ data: [], error: null })

      await getPendingSOSAlerts('customer')

      expect(mockNot).toHaveBeenCalledWith('customer_id', 'is', null)
    })

    it('should throw on error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      await expect(getPendingSOSAlerts()).rejects.toEqual({ message: 'Error' })
    })
  })

  describe('acknowledgeSOSAlert', () => {
    it('should update alert status to acknowledged', async () => {
      const mockReturnData = {
        id: '1',
        status: 'acknowledged',
        acknowledged_by: 'admin-1',
      }

      mockSingle.mockResolvedValueOnce({ data: mockReturnData, error: null })

      const result = await acknowledgeSOSAlert('1', 'admin-1')

      expect(mockFrom).toHaveBeenCalledWith('sos_alerts')
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'acknowledged',
        acknowledged_by: 'admin-1',
      }))
      expect(mockEq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(mockReturnData)
    })

    it('should throw on error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Acknowledge error' },
      })

      await expect(acknowledgeSOSAlert('bad-id', 'admin-1')).rejects.toEqual({
        message: 'Acknowledge error',
      })
    })
  })

  describe('resolveSOSAlert', () => {
    it('should update alert status to resolved with notes', async () => {
      const mockReturnData = {
        id: '1',
        status: 'resolved',
        resolved_by: 'admin-1',
        resolution_notes: 'Issue resolved',
      }

      mockSingle.mockResolvedValueOnce({ data: mockReturnData, error: null })

      const result = await resolveSOSAlert('1', 'admin-1', 'Issue resolved')

      expect(mockFrom).toHaveBeenCalledWith('sos_alerts')
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'resolved',
        resolved_by: 'admin-1',
        resolution_notes: 'Issue resolved',
      }))
      expect(result).toEqual(mockReturnData)
    })

    it('should throw on error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Resolve error' },
      })

      await expect(resolveSOSAlert('bad-id', 'admin-1', 'notes')).rejects.toEqual({
        message: 'Resolve error',
      })
    })
  })

  describe('cancelSOSAlert', () => {
    it('should update alert status to cancelled', async () => {
      const mockReturnData = { id: '1', status: 'cancelled' }

      mockSingle.mockResolvedValueOnce({ data: mockReturnData, error: null })

      const result = await cancelSOSAlert('1')

      expect(mockFrom).toHaveBeenCalledWith('sos_alerts')
      expect(mockUpdate).toHaveBeenCalledWith({ status: 'cancelled' })
      expect(mockEq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(mockReturnData)
    })

    it('should throw on error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Cancel error' },
      })

      await expect(cancelSOSAlert('bad-id')).rejects.toEqual({ message: 'Cancel error' })
    })
  })

  describe('getSOSStatistics', () => {
    it('should return aggregated statistics', async () => {
      const now = new Date()
      const recentDate = new Date(now.getTime() - 1000 * 60 * 60).toISOString() // 1 hour ago
      const oldDate = new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString() // 48 hours ago

      const mockAlerts = [
        { id: '1', status: 'pending', customer_id: 'c1', staff_id: null, created_at: recentDate },
        { id: '2', status: 'acknowledged', customer_id: 'c2', staff_id: null, created_at: recentDate },
        { id: '3', status: 'resolved', customer_id: null, staff_id: 's1', created_at: oldDate },
        { id: '4', status: 'pending', customer_id: null, staff_id: 's2', created_at: recentDate },
      ]

      mockSelect.mockResolvedValueOnce({ data: mockAlerts, error: null })

      const result = await getSOSStatistics()

      expect(mockFrom).toHaveBeenCalledWith('sos_alerts')
      expect(result.total).toBe(4)
      expect(result.pending).toBe(2)
      expect(result.acknowledged).toBe(1)
      expect(result.resolved).toBe(1)
      expect(result.from_customers).toBe(2)
      expect(result.from_staff).toBe(2)
      expect(result.last_24_hours).toBe(3)
    })

    it('should throw on error', async () => {
      mockSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'Stats error' },
      })

      await expect(getSOSStatistics()).rejects.toEqual({ message: 'Stats error' })
    })

    it('should handle empty alerts', async () => {
      mockSelect.mockResolvedValueOnce({ data: [], error: null })

      const result = await getSOSStatistics()

      expect(result.total).toBe(0)
      expect(result.pending).toBe(0)
      expect(result.last_24_hours).toBe(0)
    })
  })

  describe('type validation', () => {
    it('should validate SOSAlert interface', () => {
      const alert: SOSAlert = {
        id: '1',
        customer_id: 'c1',
        staff_id: null,
        booking_id: null,
        latitude: 13.7563,
        longitude: 100.5018,
        location_accuracy: 10,
        message: 'Help!',
        user_agent: null,
        status: 'pending',
        priority: 'high',
        acknowledged_by: null,
        acknowledged_at: null,
        resolved_by: null,
        resolved_at: null,
        resolution_notes: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      expect(alert.status).toBe('pending')
      expect(alert.priority).toBe('high')
    })

    it('should validate SOSSourceType', () => {
      const types: SOSSourceType[] = ['customer', 'staff', 'all']
      expect(types).toHaveLength(3)
    })
  })
})
