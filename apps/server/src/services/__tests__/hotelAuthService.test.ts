import { describe, it, expect, vi, beforeEach } from 'vitest'

// Create chainable mock
function createChainMock(resolvedValue: any) {
  const chain: any = {}
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(resolvedValue)
  chain.insert = vi.fn().mockReturnValue(chain)
  chain.update = vi.fn().mockReturnValue(chain)
  chain.delete = vi.fn().mockReturnValue(chain)
  chain.upsert = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockReturnValue(chain)
  return chain
}

const mockFrom = vi.fn()
const mockAuthAdmin = {
  listUsers: vi.fn().mockResolvedValue({ data: { users: [] } }),
  createUser: vi.fn().mockResolvedValue({
    data: { user: { id: 'auth-user-1' } },
    error: null,
  }),
  deleteUser: vi.fn().mockResolvedValue({ error: null }),
  updateUserById: vi.fn().mockResolvedValue({ error: null }),
}

vi.mock('../../lib/supabase.js', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: mockFrom,
    auth: {
      admin: mockAuthAdmin,
    },
  })),
}))

// Mock email service
vi.mock('../emailService.js', () => ({
  emailService: {
    sendHotelInvitation: vi.fn().mockResolvedValue(undefined),
    sendPasswordReset: vi.fn().mockResolvedValue(undefined),
    isReady: vi.fn().mockReturnValue(true),
  },
}))

// Mock crypto
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue({
      toString: vi.fn().mockReturnValue('mock-random-token-hex'),
    }),
  },
}))

import { hotelAuthService } from '../hotelAuthService'

describe('hotelAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createHotelAccount', () => {
    it('should throw when hotel not found', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      await expect(
        hotelAuthService.createHotelAccount('hotel-1', 'test@hotel.com')
      ).rejects.toThrow('Hotel not found')
    })

    it('should throw when hotel already has an account', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({
          data: { id: 'hotel-1', auth_user_id: 'existing-user' },
          error: null,
        })
      )

      await expect(
        hotelAuthService.createHotelAccount('hotel-1', 'test@hotel.com')
      ).rejects.toThrow('Hotel already has an account')
    })

    it('should throw when email is already in use', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({
          data: { id: 'hotel-1', auth_user_id: null, name_th: 'Test Hotel' },
          error: null,
        })
      )
      mockAuthAdmin.listUsers.mockResolvedValueOnce({
        data: { users: [{ email: 'test@hotel.com' }] },
      })

      await expect(
        hotelAuthService.createHotelAccount('hotel-1', 'test@hotel.com')
      ).rejects.toThrow('Email address is already in use')
    })
  })

  describe('sendHotelInvitation', () => {
    it('should throw when hotel not found', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      await expect(
        hotelAuthService.sendHotelInvitation('hotel-1')
      ).rejects.toThrow('Hotel not found')
    })

    it('should throw when hotel account not set up', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({
          data: { id: 'hotel-1', auth_user_id: null, login_email: null },
          error: null,
        })
      )

      await expect(
        hotelAuthService.sendHotelInvitation('hotel-1')
      ).rejects.toThrow('Hotel account not set up')
    })

    it('should throw when login is disabled', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({
          data: {
            id: 'hotel-1',
            auth_user_id: 'auth-1',
            login_email: 'test@hotel.com',
            temporary_password: 'pass123',
            login_enabled: false,
          },
          error: null,
        })
      )

      await expect(
        hotelAuthService.sendHotelInvitation('hotel-1')
      ).rejects.toThrow('Hotel login is disabled')
    })
  })

  describe('toggleHotelLoginAccess', () => {
    it('should update login_enabled successfully', async () => {
      mockFrom.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }))

      await expect(
        hotelAuthService.toggleHotelLoginAccess('hotel-1', true)
      ).resolves.toBeUndefined()
    })

    it('should throw on error', async () => {
      mockFrom.mockImplementation(() => ({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      }))

      await expect(
        hotelAuthService.toggleHotelLoginAccess('hotel-1', true)
      ).rejects.toThrow('Failed to toggle login access')
    })
  })

  describe('getHotelAuthStatus', () => {
    it('should return auth status object', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({
          data: {
            auth_user_id: 'auth-1',
            login_email: 'hotel@test.com',
            login_enabled: true,
            last_login: '2026-01-01',
            password_change_required: false,
          },
          error: null,
        })
      )

      const status = await hotelAuthService.getHotelAuthStatus('hotel-1')

      expect(status.hasAccount).toBe(true)
      expect(status.loginEnabled).toBe(true)
      expect(status.loginEmail).toBe('hotel@test.com')
      expect(status.passwordChangeRequired).toBe(false)
    })

    it('should return hasAccount false when no auth_user_id', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({
          data: {
            auth_user_id: null,
            login_email: null,
            login_enabled: false,
            last_login: null,
            password_change_required: false,
          },
          error: null,
        })
      )

      const status = await hotelAuthService.getHotelAuthStatus('hotel-1')
      expect(status.hasAccount).toBe(false)
    })
  })

  describe('verifyResetToken', () => {
    it('should return false when token not found', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      const result = await hotelAuthService.verifyResetToken('invalid-token')
      expect(result).toBe(false)
    })

    it('should return false when token expired', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({
          data: {
            password_reset_expires_at: '2020-01-01T00:00:00Z', // Past date
          },
          error: null,
        })
      )

      const result = await hotelAuthService.verifyResetToken('expired-token')
      expect(result).toBe(false)
    })

    it('should return true when token is valid', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({
          data: {
            password_reset_expires_at: '2030-01-01T00:00:00Z', // Future date
          },
          error: null,
        })
      )

      const result = await hotelAuthService.verifyResetToken('valid-token')
      expect(result).toBe(true)
    })
  })

  describe('isEmailServiceReady', () => {
    it('should return boolean', () => {
      const result = hotelAuthService.isEmailServiceReady()
      expect(typeof result).toBe('boolean')
    })
  })

  describe('changeHotelPassword', () => {
    it('should throw when hotel not found', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({ data: null, error: { message: 'Not found' } })
      )

      await expect(
        hotelAuthService.changeHotelPassword('hotel-1', 'old', 'new')
      ).rejects.toThrow('Hotel not found')
    })

    it('should throw when hotel has no auth account', async () => {
      mockFrom.mockImplementation(() =>
        createChainMock({
          data: { auth_user_id: null, temporary_password: null, password_change_required: false, login_email: null },
          error: null,
        })
      )

      await expect(
        hotelAuthService.changeHotelPassword('hotel-1', 'old', 'new')
      ).rejects.toThrow('Hotel does not have an auth account')
    })
  })
})
