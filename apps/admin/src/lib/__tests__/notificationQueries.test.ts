import { describe, it, expect, vi, beforeEach } from 'vitest'

// Setup mocks with vi.hoisted
const {
  mockFrom,
  mockSelect,
  mockEq,
  mockOrder,
  mockUpdate,
  mockLimit,
} = vi.hoisted(() => {
  const mockEq = vi.fn()
  const mockOrder = vi.fn()
  const mockSelect = vi.fn()
  const mockUpdate = vi.fn()
  const mockLimit = vi.fn()

  const chain = () => ({
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    update: mockUpdate,
    limit: mockLimit,
  })

  mockSelect.mockImplementation(() => chain())
  mockEq.mockImplementation(() => chain())
  mockOrder.mockImplementation(() => chain())
  mockUpdate.mockImplementation(() => chain())
  mockLimit.mockImplementation(() => chain())

  const mockFrom = vi.fn(() => chain())

  return { mockFrom, mockSelect, mockEq, mockOrder, mockUpdate, mockLimit }
})

vi.mock('../supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

import {
  getUnreadNotifications,
  getRecentNotifications,
  markAsRead,
  markAllAsRead,
} from '../notificationQueries'

import type { AdminNotification } from '../notificationQueries'

describe('notificationQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getUnreadNotifications', () => {
    it('should fetch unread notifications for a user', async () => {
      const mockNotifications = [
        {
          id: 'n1',
          user_id: 'user-1',
          type: 'booking',
          title: 'New Booking',
          message: 'A new booking was created',
          data: null,
          is_read: false,
          read_at: null,
          created_at: '2026-01-01T00:00:00Z',
        },
      ]

      mockLimit.mockResolvedValueOnce({ data: mockNotifications, error: null })

      const result = await getUnreadNotifications('user-1')

      expect(mockFrom).toHaveBeenCalledWith('notifications')
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(mockEq).toHaveBeenCalledWith('is_read', false)
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('New Booking')
    })

    it('should return empty array on error', async () => {
      mockLimit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await getUnreadNotifications('user-1')
      expect(result).toEqual([])
    })

    it('should return empty array when no data', async () => {
      mockLimit.mockResolvedValueOnce({ data: null, error: null })

      const result = await getUnreadNotifications('user-1')
      expect(result).toEqual([])
    })
  })

  describe('getRecentNotifications', () => {
    it('should fetch recent notifications with default limit', async () => {
      mockLimit.mockResolvedValueOnce({
        data: [
          { id: 'n1', is_read: false },
          { id: 'n2', is_read: true },
        ],
        error: null,
      })

      const result = await getRecentNotifications('user-1')

      expect(mockLimit).toHaveBeenCalledWith(10)
      expect(result).toHaveLength(2)
    })

    it('should use custom limit', async () => {
      mockLimit.mockResolvedValueOnce({ data: [], error: null })

      await getRecentNotifications('user-1', 5)

      expect(mockLimit).toHaveBeenCalledWith(5)
    })

    it('should return empty array on error', async () => {
      mockLimit.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await getRecentNotifications('user-1')
      expect(result).toEqual([])
    })
  })

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      mockEq.mockResolvedValueOnce({ error: null })

      const result = await markAsRead('n1')

      expect(result).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('notifications')
      expect(mockUpdate).toHaveBeenCalled()
      // Verify update includes is_read and read_at
      const updateCall = mockUpdate.mock.calls[0][0]
      expect(updateCall.is_read).toBe(true)
      expect(updateCall.read_at).toBeDefined()
    })

    it('should return false on error', async () => {
      mockEq.mockResolvedValueOnce({ error: { message: 'Error' } })

      const result = await markAsRead('bad-id')
      expect(result).toBe(false)
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      // Chain: .update({...}).eq('user_id', userId).eq('is_read', false)
      // First eq = intermediate, second eq = terminal
      mockEq
        .mockReturnValueOnce({ select: mockSelect, eq: mockEq, order: mockOrder, update: mockUpdate, limit: mockLimit })
        .mockResolvedValueOnce({ error: null })

      const result = await markAllAsRead('user-1')

      expect(result).toBe(true)
      expect(mockFrom).toHaveBeenCalledWith('notifications')
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(mockEq).toHaveBeenCalledWith('is_read', false)
    })

    it('should return false on error', async () => {
      // First eq = intermediate, second eq = terminal
      mockEq
        .mockReturnValueOnce({ select: mockSelect, eq: mockEq, order: mockOrder, update: mockUpdate, limit: mockLimit })
        .mockResolvedValueOnce({ error: { message: 'Error' } })

      const result = await markAllAsRead('user-1')
      expect(result).toBe(false)
    })
  })

  describe('type validation', () => {
    it('should validate AdminNotification interface', () => {
      const notification: AdminNotification = {
        id: 'n1',
        user_id: 'user-1',
        type: 'booking',
        title: 'Test',
        message: 'Test message',
        data: { booking_id: '123' },
        is_read: false,
        read_at: null,
        created_at: '2026-01-01T00:00:00Z',
      }
      expect(notification.is_read).toBe(false)
      expect(notification.data?.booking_id).toBe('123')
    })

    it('should validate data can be null', () => {
      const notification: AdminNotification = {
        id: 'n2',
        user_id: 'user-1',
        type: 'system',
        title: 'System',
        message: 'System message',
        data: null,
        is_read: true,
        read_at: '2026-01-01T10:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
      }
      expect(notification.data).toBeNull()
      expect(notification.read_at).toBeDefined()
    })
  })
})
