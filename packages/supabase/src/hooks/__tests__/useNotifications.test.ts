import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../useSupabaseQuery', () => ({
  useSupabaseQuery: vi.fn((options: any) => ({
    data: undefined,
    isLoading: true,
    error: null,
    _queryKey: options.queryKey,
    _enabled: options.enabled,
    _refetchInterval: options.refetchInterval,
  })),
  useSupabaseMutation: vi.fn((options: any) => ({
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
    isLoading: false,
    _mutationFn: options.mutationFn,
  })),
}))

vi.mock('../../services/notificationService', () => ({
  getNotifications: vi.fn(),
  getUnreadCount: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
}))

vi.mock('../../client', () => ({
  getBrowserClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  })),
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}))

vi.mock('react', () => ({
  useEffect: vi.fn((fn: any) => fn()),
}))

vi.mock('../../types/database.types', () => ({}))

import {
  useNotifications,
  useUnreadNotificationCount,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
  useNotificationSubscription,
} from '../useNotifications'
import { useSupabaseQuery, useSupabaseMutation } from '../useSupabaseQuery'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../../services/notificationService'

describe('useNotifications hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // useNotifications
  // ============================================
  describe('useNotifications', () => {
    it('should be a function', () => {
      expect(typeof useNotifications).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useNotifications('user-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['notifications', 'user-1', undefined, undefined],
          enabled: true,
          refetchInterval: 30000,
        })
      )
    })

    it('should include options in query key', () => {
      useNotifications('user-1', { unreadOnly: true, limit: 10 })
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['notifications', 'user-1', true, 10],
        })
      )
    })

    it('should disable query when userId is undefined', () => {
      useNotifications(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should set refetchInterval to 30 seconds', () => {
      useNotifications('user-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          refetchInterval: 30000,
        })
      )
    })

    it('should pass queryFn that calls getNotifications', () => {
      const options = { unreadOnly: true }
      useNotifications('user-1', options)
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(getNotifications).toHaveBeenCalledWith(mockClient, 'user-1', options)
    })
  })

  // ============================================
  // useUnreadNotificationCount
  // ============================================
  describe('useUnreadNotificationCount', () => {
    it('should be a function', () => {
      expect(typeof useUnreadNotificationCount).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useUnreadNotificationCount('user-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['notifications', 'unread-count', 'user-1'],
          enabled: true,
          refetchInterval: 30000,
        })
      )
    })

    it('should disable query when userId is undefined', () => {
      useUnreadNotificationCount(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls getUnreadCount', () => {
      useUnreadNotificationCount('user-2')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(getUnreadCount).toHaveBeenCalledWith(mockClient, 'user-2')
    })
  })

  // ============================================
  // useMarkNotificationAsRead
  // ============================================
  describe('useMarkNotificationAsRead', () => {
    it('should be a function', () => {
      expect(typeof useMarkNotificationAsRead).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useMarkNotificationAsRead()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should provide mutationFn that calls markAsRead', async () => {
      useMarkNotificationAsRead()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const mockClient = {} as any
      await lastCall.mutationFn(mockClient, 'notif-1')
      expect(markAsRead).toHaveBeenCalledWith(mockClient, 'notif-1')
    })

    it('should provide invalidateKeys that returns notification-related keys', () => {
      useMarkNotificationAsRead()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const keys = lastCall.invalidateKeys!({} as any)
      expect(keys).toEqual([
        ['notifications'],
        ['notifications', 'unread-count'],
      ])
    })
  })

  // ============================================
  // useMarkAllNotificationsAsRead
  // ============================================
  describe('useMarkAllNotificationsAsRead', () => {
    it('should be a function', () => {
      expect(typeof useMarkAllNotificationsAsRead).toBe('function')
    })

    it('should call useSupabaseMutation', () => {
      useMarkAllNotificationsAsRead()
      expect(useSupabaseMutation).toHaveBeenCalled()
    })

    it('should provide mutationFn that calls markAllAsRead', async () => {
      useMarkAllNotificationsAsRead()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const mockClient = {} as any
      await lastCall.mutationFn(mockClient, 'user-1')
      expect(markAllAsRead).toHaveBeenCalledWith(mockClient, 'user-1')
    })

    it('should provide invalidateKeys that returns notification-related keys', () => {
      useMarkAllNotificationsAsRead()
      const lastCall = vi.mocked(useSupabaseMutation).mock.calls.at(-1)![0]
      const keys = lastCall.invalidateKeys!({} as any)
      expect(keys).toEqual([
        ['notifications'],
        ['notifications', 'unread-count'],
      ])
    })
  })

  // ============================================
  // useNotificationSubscription
  // ============================================
  describe('useNotificationSubscription', () => {
    it('should be a function', () => {
      expect(typeof useNotificationSubscription).toBe('function')
    })
  })
})
