import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted for all mocks referenced inside vi.mock factories
const { mockGetSession, mockRefreshSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockRefreshSession: vi.fn(),
}))

vi.mock('@bliss/supabase/auth', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      refreshSession: mockRefreshSession,
    },
  },
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock import.meta.env
vi.stubGlobal('import', {
  meta: {
    env: {
      VITE_API_URL: 'http://localhost:3000/api',
    },
  },
})

import { secureBookingService } from '../secureBookingService'

describe('SecureBookingService', () => {
  const mockAccessToken = 'mock-access-token-12345'

  beforeEach(() => {
    vi.clearAllMocks()

    // Default: successful auth session
    mockGetSession.mockResolvedValue({
      data: {
        session: { access_token: mockAccessToken },
      },
      error: null,
    })

    mockRefreshSession.mockResolvedValue({
      data: {
        session: { access_token: mockAccessToken },
      },
    })

    // Default: successful fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: { id: 'booking-1' } }),
    })
  })

  describe('createBooking', () => {
    it('should make a POST request to /secure-bookings', async () => {
      const bookingData = {
        guest_name: 'Test Guest',
        room_number: '101',
        booking_date: '2026-03-01',
        booking_time: '14:00',
      }

      await secureBookingService.createBooking(bookingData)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/secure-bookings'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(bookingData),
        })
      )
    })

    it('should include Authorization header with bearer token', async () => {
      await secureBookingService.createBooking({ test: true })

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should return the response data on success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: { id: 'booking-123', status: 'pending' },
        }),
      })

      const result = await secureBookingService.createBooking({ test: true })
      expect(result).toEqual({ data: { id: 'booking-123', status: 'pending' } })
    })

    it('should throw error when API returns error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: vi.fn().mockResolvedValue({ error: 'Invalid booking data' }),
      })

      await expect(
        secureBookingService.createBooking({ invalid: true })
      ).rejects.toThrow('Invalid booking data')
    })

    it('should throw generic HTTP error when no error message', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({}),
      })

      await expect(
        secureBookingService.createBooking({ test: true })
      ).rejects.toThrow('HTTP 500')
    })
  })

  describe('getBookings', () => {
    it('should make a GET request to /secure-bookings', async () => {
      await secureBookingService.getBookings()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/secure-bookings'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        })
      )
    })

    it('should return bookings data on success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          data: [
            { id: 'booking-1', status: 'confirmed' },
            { id: 'booking-2', status: 'pending' },
          ],
        }),
      })

      const result = await secureBookingService.getBookings()
      expect(result.data).toHaveLength(2)
    })
  })

  describe('updateBooking', () => {
    it('should make a PUT request to /secure-bookings/:id', async () => {
      const bookingId = 'booking-123'
      const updates = { status: 'confirmed' }

      await secureBookingService.updateBooking(bookingId, updates)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/secure-bookings/${bookingId}`),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(updates),
        })
      )
    })
  })

  describe('deleteBooking', () => {
    it('should make a DELETE request to /secure-bookings/:id', async () => {
      const bookingId = 'booking-123'

      await secureBookingService.deleteBooking(bookingId)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/secure-bookings/${bookingId}`),
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('authentication', () => {
    it('should throw error when not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
      })

      await expect(
        secureBookingService.createBooking({ test: true })
      ).rejects.toThrow('Not authenticated')
    })

    it('should try to refresh session when no access token', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })
      mockRefreshSession.mockResolvedValue({
        data: { session: { access_token: 'refreshed-token' } },
      })

      await secureBookingService.createBooking({ test: true })

      expect(mockRefreshSession).toHaveBeenCalled()
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer refreshed-token',
          }),
        })
      )
    })
  })
})

describe('useSecureBookings hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'mock-token' } },
      error: null,
    })
  })

  // We cannot use renderHook in node environment, so we test the logic directly
  it('should wrap createBooking with error handling', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: { id: 'booking-1' },
      }),
    })

    // Simulate the hook behavior
    const createBooking = async (bookingData: any) => {
      try {
        const result = await secureBookingService.createBooking(bookingData)
        return { data: result.data, error: null }
      } catch (error) {
        return { data: null, error: error as Error }
      }
    }

    const result = await createBooking({ test: true })
    expect(result.data).toEqual({ id: 'booking-1' })
    expect(result.error).toBeNull()
  })

  it('should catch and return errors', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: vi.fn().mockResolvedValue({ error: 'Server error' }),
    })

    const createBooking = async (bookingData: any) => {
      try {
        const result = await secureBookingService.createBooking(bookingData)
        return { data: result.data, error: null }
      } catch (error) {
        return { data: null, error: error as Error }
      }
    }

    const result = await createBooking({ test: true })
    expect(result.data).toBeNull()
    expect(result.error).toBeInstanceOf(Error)
    expect(result.error?.message).toBe('Server error')
  })
})
