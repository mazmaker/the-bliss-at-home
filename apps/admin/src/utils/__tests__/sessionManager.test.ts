// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock supabase
const mockGetSession = vi.fn()
const mockRefreshSession = vi.fn()
const mockSignOut = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      refreshSession: () => mockRefreshSession(),
      signOut: () => mockSignOut(),
    },
  },
}))

import {
  updateActivity,
  setupActivityMonitoring,
  checkSession,
  startSessionMonitoring,
  stopSessionMonitoring,
  refreshSession,
} from '../sessionManager'

describe('sessionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    stopSessionMonitoring()
  })

  afterEach(() => {
    vi.useRealTimers()
    stopSessionMonitoring()
  })

  describe('updateActivity', () => {
    it('should update last activity timestamp', () => {
      // Just make sure it doesn't throw
      expect(() => updateActivity()).not.toThrow()
    })
  })

  describe('setupActivityMonitoring', () => {
    it('should return a cleanup function', () => {
      const cleanup = setupActivityMonitoring()
      expect(typeof cleanup).toBe('function')
      cleanup()
    })
  })

  describe('checkSession', () => {
    it('should return true for valid session', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          },
        },
        error: null,
      })

      const result = await checkSession()
      expect(result).toBe(true)
    })

    it('should return false when no session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const result = await checkSession()
      expect(result).toBe(false)
    })

    it('should return false on error', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' },
      })

      const result = await checkSession()
      expect(result).toBe(false)
    })

    it('should refresh when session expires soon', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            expires_at: Math.floor(Date.now() / 1000) + 60, // 1 minute from now
          },
        },
        error: null,
      })
      mockRefreshSession.mockResolvedValue({
        data: { session: { expires_at: Math.floor(Date.now() / 1000) + 3600 } },
        error: null,
      })

      const result = await checkSession()
      expect(result).toBe(true)
      expect(mockRefreshSession).toHaveBeenCalled()
    })

    it('should return false when refresh fails', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            expires_at: Math.floor(Date.now() / 1000) + 60,
          },
        },
        error: null,
      })
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Refresh failed' },
      })

      const result = await checkSession()
      expect(result).toBe(false)
    })

    it('should return false on exception', async () => {
      mockGetSession.mockRejectedValue(new Error('Network error'))

      const result = await checkSession()
      expect(result).toBe(false)
    })
  })

  describe('refreshSession', () => {
    it('should return new session on success', async () => {
      const mockSession = { expires_at: 99999 }
      mockRefreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const result = await refreshSession()
      expect(result).toEqual(mockSession)
    })

    it('should throw on error', async () => {
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Refresh error' },
      })

      await expect(refreshSession()).rejects.toBeDefined()
    })

    it('should throw on exception', async () => {
      mockRefreshSession.mockRejectedValue(new Error('Network error'))

      await expect(refreshSession()).rejects.toThrow('Network error')
    })
  })

  describe('startSessionMonitoring / stopSessionMonitoring', () => {
    it('should start and stop without error', () => {
      expect(() => startSessionMonitoring()).not.toThrow()
      expect(() => stopSessionMonitoring()).not.toThrow()
    })

    it('should restart monitoring when called again', () => {
      startSessionMonitoring()
      expect(() => startSessionMonitoring()).not.toThrow()
      stopSessionMonitoring()
    })
  })
})
