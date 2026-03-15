import { describe, it, expect, vi } from 'vitest'

// Mock dependencies
vi.mock('../../lib/notificationQueries', () => ({
  getUnreadNotifications: vi.fn().mockResolvedValue([]),
  getRecentNotifications: vi.fn().mockResolvedValue([]),
  markAsRead: vi.fn().mockResolvedValue(true),
  markAllAsRead: vi.fn().mockResolvedValue(true),
}))

vi.mock('../useAdminAuth', () => ({
  useAdminAuth: vi.fn(() => ({ user: null })),
}))

import { useBookingNotifications } from '../useBookingNotifications'

describe('useBookingNotifications', () => {
  it('exports useBookingNotifications as a function', () => {
    expect(typeof useBookingNotifications).toBe('function')
  })

  it('has the correct function name', () => {
    expect(useBookingNotifications.name).toBe('useBookingNotifications')
  })
})
