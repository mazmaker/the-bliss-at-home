import { describe, it, expect, vi, beforeEach } from 'vitest'

// Setup mocks with vi.hoisted to avoid hoisting issues
const {
  mockFrom,
  mockSelect,
  mockEq,
  mockOrder,
  mockSingle,
  mockUpdate,
  mockOr,
  mockGte,
  mockLte,
  mockNot,
  mockIs,
  mockNeq,
  mockIn,
  mockLimit,
} = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockOrder = vi.fn()
  const mockSelect = vi.fn()
  const mockUpdate = vi.fn()
  const mockOr = vi.fn()
  const mockGte = vi.fn()
  const mockLte = vi.fn()
  const mockNot = vi.fn()
  const mockIs = vi.fn()
  const mockNeq = vi.fn()
  const mockIn = vi.fn()
  const mockLimit = vi.fn()

  // Build chain - each method returns an object with all methods
  const chain = () => ({
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
    update: mockUpdate,
    or: mockOr,
    gte: mockGte,
    lte: mockLte,
    not: mockNot,
    is: mockIs,
    neq: mockNeq,
    in: mockIn,
    limit: mockLimit,
  })

  mockSelect.mockImplementation(() => chain())
  mockEq.mockImplementation(() => chain())
  mockOrder.mockImplementation(() => chain())
  mockSingle.mockImplementation(() => chain())
  mockUpdate.mockImplementation(() => chain())
  mockOr.mockImplementation(() => chain())
  mockGte.mockImplementation(() => chain())
  mockLte.mockImplementation(() => chain())
  mockNot.mockImplementation(() => chain())
  mockIs.mockImplementation(() => chain())
  mockNeq.mockImplementation(() => chain())
  mockIn.mockImplementation(() => chain())
  mockLimit.mockImplementation(() => chain())

  const mockFrom = vi.fn(() => chain())

  return {
    mockFrom, mockSelect, mockEq, mockOrder, mockSingle,
    mockUpdate, mockOr, mockGte, mockLte, mockNot, mockIs,
    mockNeq, mockIn, mockLimit,
  }
})

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Need to import after mocks
import { bookingService } from '../bookingService'
import type { BookingStatus, PaymentStatus } from '../bookingService'

describe('bookingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('bookingService export', () => {
    it('should export a bookingService instance', () => {
      expect(bookingService).toBeDefined()
      expect(typeof bookingService.getAllBookings).toBe('function')
      expect(typeof bookingService.getBookingById).toBe('function')
      expect(typeof bookingService.updateBookingStatus).toBe('function')
      expect(typeof bookingService.updateBookingPaymentStatus).toBe('function')
      expect(typeof bookingService.assignStaff).toBe('function')
      expect(typeof bookingService.searchBookings).toBe('function')
      expect(typeof bookingService.getBookingStats).toBe('function')
    })
  })

  describe('getAllBookings', () => {
    it('should fetch all bookings without filters', async () => {
      const mockBookings = [
        {
          id: '1',
          booking_number: 'BK001',
          customer_notes: 'Guest: John Doe, Phone: 0812345678',
          status: 'pending',
          recipient_count: 1,
          service: { category: 'massage' },
        },
      ]

      // Make the final call in chain resolve with data
      mockOrder.mockResolvedValueOnce({ data: mockBookings, error: null })

      const result = await bookingService.getAllBookings()

      expect(mockFrom).toHaveBeenCalledWith('bookings')
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should apply status filter when not "all"', async () => {
      // Source: let query = supabase.from().select().order() -> then query = query.eq('status', ...)
      // order is intermediate, eq is terminal
      const chainObj = { select: mockSelect, eq: mockEq, order: mockOrder, single: mockSingle, update: mockUpdate, or: mockOr, gte: mockGte, lte: mockLte, not: mockNot, is: mockIs, neq: mockNeq, in: mockIn, limit: mockLimit }
      mockOrder.mockReturnValueOnce(chainObj)
      mockEq.mockResolvedValueOnce({ data: [], error: null })

      await bookingService.getAllBookings({ status: 'pending' })

      expect(mockEq).toHaveBeenCalledWith('status', 'pending')
    })

    it('should apply payment_status filter when not "all"', async () => {
      // Source: let query = supabase.from().select().order() -> then query = query.eq('payment_status', ...)
      // order is intermediate, eq is terminal
      const chainObj = { select: mockSelect, eq: mockEq, order: mockOrder, single: mockSingle, update: mockUpdate, or: mockOr, gte: mockGte, lte: mockLte, not: mockNot, is: mockIs, neq: mockNeq, in: mockIn, limit: mockLimit }
      mockOrder.mockReturnValueOnce(chainObj)
      mockEq.mockResolvedValueOnce({ data: [], error: null })

      await bookingService.getAllBookings({ payment_status: 'paid' })

      expect(mockEq).toHaveBeenCalledWith('payment_status', 'paid')
    })

    it('should throw when supabase returns an error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(bookingService.getAllBookings()).rejects.toThrow()
    })
  })

  describe('getBookingById', () => {
    it('should return null when booking not found or error occurs', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      const result = await bookingService.getBookingById('nonexistent')
      expect(result).toBeNull()
    })

    it('should return parsed booking with customer data', async () => {
      const mockBooking = {
        id: 'booking-1',
        booking_number: 'BK001',
        customer_notes: 'Guest: Jane Doe, Phone: 0898765432',
        recipient_count: 1,
      }

      mockSingle.mockResolvedValueOnce({ data: mockBooking, error: null })

      const result = await bookingService.getBookingById('booking-1')

      expect(result).toBeDefined()
      expect(result?.customer?.full_name).toBe('Jane Doe')
      expect(result?.customer?.phone).toBe('0898765432')
    })
  })

  describe('updateBookingStatus', () => {
    it('should set confirmed_at when confirming', async () => {
      const mockData = {
        id: 'booking-1',
        status: 'confirmed',
        customer_notes: 'Guest: Test, Phone: 0801234567',
      }

      mockSingle.mockResolvedValueOnce({ data: mockData, error: null })
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true }),
      })

      await bookingService.updateBookingStatus('booking-1', 'confirmed')

      expect(mockUpdate).toHaveBeenCalled()
    })

    it('should return null on error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update error' },
      })

      const result = await bookingService.updateBookingStatus('bad-id', 'confirmed')
      expect(result).toBeNull()
    })
  })

  describe('updateBookingPaymentStatus', () => {
    it('should update payment status and return processed booking', async () => {
      const mockData = {
        id: 'booking-1',
        payment_status: 'paid',
        customer_notes: 'Guest: Test User, Phone: 0801234567',
      }

      mockSingle.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await bookingService.updateBookingPaymentStatus('booking-1', 'paid')

      expect(result).toBeDefined()
      expect(result?.customer?.full_name).toBe('Test User')
    })

    it('should return null on error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await bookingService.updateBookingPaymentStatus('bad-id', 'paid')
      expect(result).toBeNull()
    })
  })

  describe('assignStaff', () => {
    it('should update staff_id for a booking', async () => {
      const mockData = {
        id: 'booking-1',
        staff_id: 'staff-1',
        customer_notes: 'Guest: TestGuest, Phone: 0800000000',
      }

      mockSingle.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await bookingService.assignStaff('booking-1', 'staff-1')

      expect(result).toBeDefined()
      expect(mockUpdate).toHaveBeenCalled()
    })

    it('should return null on error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const result = await bookingService.assignStaff('bad-id', 'staff-1')
      expect(result).toBeNull()
    })
  })

  describe('searchBookings', () => {
    it('should search by booking number or customer notes', async () => {
      mockOrder.mockResolvedValueOnce({
        data: [
          {
            id: '1',
            booking_number: 'BK001',
            customer_notes: 'Guest: John, Phone: 080',
          },
        ],
        error: null,
      })

      const results = await bookingService.searchBookings('BK001')

      expect(mockOr).toHaveBeenCalled()
      expect(results).toHaveLength(1)
    })

    it('should return empty array on error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      const results = await bookingService.searchBookings('test')
      expect(results).toEqual([])
    })
  })

  describe('getBookingStats', () => {
    it('should calculate stats from booking data', async () => {
      const mockData = [
        { status: 'pending', final_price: 1000 },
        { status: 'confirmed', final_price: 1500 },
        { status: 'completed', final_price: 2000 },
        { status: 'completed', final_price: 2500 },
        { status: 'cancelled', final_price: 500 },
        { status: 'in_progress', final_price: 1200 },
      ]

      mockSelect.mockResolvedValueOnce({ data: mockData, error: null })

      const stats = await bookingService.getBookingStats()

      expect(stats.total).toBe(6)
      expect(stats.pending).toBe(1)
      expect(stats.confirmed).toBe(1)
      expect(stats.completed).toBe(2)
      expect(stats.cancelled).toBe(1)
      expect(stats.in_progress).toBe(1)
      expect(stats.total_revenue).toBe(8700)
    })

    it('should return zero stats on error', async () => {
      mockSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      const stats = await bookingService.getBookingStats()

      expect(stats.total).toBe(0)
      expect(stats.total_revenue).toBe(0)
    })
  })
})

// Test the parseCustomerFromNotes function indirectly through the service
describe('parseCustomerFromNotes (via getBookingById)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should parse Guest and Phone from customer_notes', async () => {
    const mockBooking = {
      id: '1',
      customer_notes: 'Guest: สมชาย สุดหล่อ, Phone: 081-234-5678',
      recipient_count: 1,
    }

    mockSingle.mockResolvedValueOnce({ data: mockBooking, error: null })

    const result = await bookingService.getBookingById('1')

    expect(result?.customer?.full_name).toBe('สมชาย สุดหล่อ')
    expect(result?.customer?.phone).toBe('081-234-5678')
    expect(result?.customer?.id).toBeNull()
  })

  it('should return default values when notes have no matching patterns', async () => {
    const mockBooking = {
      id: '2',
      customer_notes: 'Some random note without guest info',
      recipient_count: 1,
    }

    mockSingle.mockResolvedValueOnce({ data: mockBooking, error: null })

    const result = await bookingService.getBookingById('2')

    expect(result?.customer?.full_name).toBe('ไม่ระบุชื่อ')
    expect(result?.customer?.phone).toBe('ไม่ระบุเบอร์')
  })

  it('should return null customer when customer_notes is null', async () => {
    const mockBooking = {
      id: '3',
      customer_notes: null,
      recipient_count: 1,
    }

    mockSingle.mockResolvedValueOnce({ data: mockBooking, error: null })

    const result = await bookingService.getBookingById('3')

    expect(result?.customer).toBeNull()
  })
})
