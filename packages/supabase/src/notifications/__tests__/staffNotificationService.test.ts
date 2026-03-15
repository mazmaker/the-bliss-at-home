import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFromFn, mockChannel, mockRemoveChannel, mockChannelFn } = vi.hoisted(() => ({
  mockFromFn: vi.fn(),
  mockChannel: { on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnThis() },
  mockRemoveChannel: vi.fn(),
  mockChannelFn: vi.fn(),
}))

vi.mock('../../auth/supabaseClient', () => ({
  supabase: {
    from: mockFromFn,
    channel: mockChannelFn.mockReturnValue(mockChannel),
    removeChannel: mockRemoveChannel,
  },
}))

function createBuilder(resolveValue: any = { data: null, error: null }) {
  const b: any = {}
  const m = ['select', 'eq', 'neq', 'in', 'gte', 'lte', 'order', 'limit', 'single', 'insert', 'update', 'delete', 'is']
  m.forEach(k => { b[k] = vi.fn().mockReturnValue(b) })
  b.then = (resolve: any) => Promise.resolve(resolveValue).then(resolve)
  return b
}

import {
  getStaffNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToStaffNotifications,
} from '../staffNotificationService'

describe('staffNotificationService', () => {
  beforeEach(() => { vi.clearAllMocks() })

  describe('getStaffNotifications', () => {
    it('should fetch notifications for user with default limit', async () => {
      const notifications = [
        { id: 'n1', title: 'New Job', message: 'You have a new job', is_read: false },
        { id: 'n2', title: 'Payout', message: 'Payout processed', is_read: true },
      ]
      const b = createBuilder({ data: notifications, error: null })
      mockFromFn.mockReturnValueOnce(b)

      const result = await getStaffNotifications('user-1')
      expect(result).toEqual(notifications)
      expect(mockFromFn).toHaveBeenCalledWith('notifications')
      expect(b.eq).toHaveBeenCalledWith('user_id', 'user-1')
      expect(b.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(b.limit).toHaveBeenCalledWith(50)
    })

    it('should respect custom limit', async () => {
      const b = createBuilder({ data: [], error: null })
      mockFromFn.mockReturnValueOnce(b)

      await getStaffNotifications('user-1', 10)
      expect(b.limit).toHaveBeenCalledWith(10)
    })

    it('should return empty array when no data', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: null }))

      const result = await getStaffNotifications('user-1')
      expect(result).toEqual([])
    })

    it('should throw on error', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: { message: 'DB error' } }))

      await expect(getStaffNotifications('user-1')).rejects.toEqual({ message: 'DB error' })
    })
  })

  describe('markNotificationAsRead', () => {
    it('should update notification as read', async () => {
      const b = createBuilder({ data: null, error: null })
      mockFromFn.mockReturnValueOnce(b)

      await markNotificationAsRead('n1')
      expect(mockFromFn).toHaveBeenCalledWith('notifications')
      expect(b.update).toHaveBeenCalledWith(expect.objectContaining({
        is_read: true,
      }))
    })

    it('should throw on error', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: { message: 'Not found' } }))

      await expect(markNotificationAsRead('n1')).rejects.toEqual({ message: 'Not found' })
    })
  })

  describe('markAllNotificationsAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      const b = createBuilder({ data: null, error: null })
      mockFromFn.mockReturnValueOnce(b)

      await markAllNotificationsAsRead('user-1')
      expect(mockFromFn).toHaveBeenCalledWith('notifications')
      expect(b.update).toHaveBeenCalled()
    })

    it('should throw on error', async () => {
      mockFromFn.mockReturnValueOnce(createBuilder({ data: null, error: { message: 'Error' } }))

      await expect(markAllNotificationsAsRead('user-1')).rejects.toEqual({ message: 'Error' })
    })
  })

  describe('subscribeToStaffNotifications', () => {
    it('should create channel subscription', () => {
      const callback = vi.fn()
      const unsubscribe = subscribeToStaffNotifications('user-1', callback)

      expect(mockChannelFn).toHaveBeenCalledWith('staff-notifications:user-1')
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        }),
        expect.any(Function)
      )
      expect(mockChannel.subscribe).toHaveBeenCalled()
      expect(typeof unsubscribe).toBe('function')
    })

    it('should call removeChannel on unsubscribe', () => {
      const callback = vi.fn()
      const unsubscribe = subscribeToStaffNotifications('user-1', callback)

      unsubscribe()
      expect(mockRemoveChannel).toHaveBeenCalled()
    })

    it('should invoke callback when new notification arrives', () => {
      const callback = vi.fn()
      subscribeToStaffNotifications('user-1', callback)

      const handler = mockChannel.on.mock.calls[0][2]
      const newNotification = { id: 'n3', title: 'Test', message: 'Hello' }
      handler({ new: newNotification })

      expect(callback).toHaveBeenCalledWith(newNotification)
    })

    it('should not invoke callback when payload.new is null', () => {
      const callback = vi.fn()
      subscribeToStaffNotifications('user-1', callback)

      const handler = mockChannel.on.mock.calls[0][2]
      handler({ new: null })

      expect(callback).not.toHaveBeenCalled()
    })
  })
})
