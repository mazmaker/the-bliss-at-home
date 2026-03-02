import { describe, it, expect, vi, beforeEach } from 'vitest'

// Setup mocks with vi.hoisted
const {
  mockFrom,
  mockSelect,
  mockEq,
  mockOrder,
  mockSingle,
  mockUpdate,
  mockInsert,
  mockIn,
  mockGte,
} = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockOrder = vi.fn()
  const mockSelect = vi.fn()
  const mockUpdate = vi.fn()
  const mockInsert = vi.fn()
  const mockIn = vi.fn()
  const mockGte = vi.fn()

  const chain = () => ({
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
    update: mockUpdate,
    insert: mockInsert,
    in: mockIn,
    gte: mockGte,
  })

  mockSelect.mockImplementation(() => chain())
  mockEq.mockImplementation(() => chain())
  mockOrder.mockImplementation(() => chain())
  mockSingle.mockImplementation(() => chain())
  mockUpdate.mockImplementation(() => chain())
  mockInsert.mockImplementation(() => chain())
  mockIn.mockImplementation(() => chain())
  mockGte.mockImplementation(() => chain())

  const mockFrom = vi.fn(() => chain())

  return {
    mockFrom, mockSelect, mockEq, mockOrder, mockSingle,
    mockUpdate, mockInsert, mockIn, mockGte,
  }
})

vi.mock('../supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

import {
  getAllHotels,
  getHotelById,
  createHotel,
  updateHotel,
  updateHotelStatus,
  getHotelInvoices,
  createInvoice,
  updateInvoice,
  getHotelPayments,
  createPayment,
  updatePayment,
  getHotelBookings,
  createBooking,
  updateBooking,
  getHotelStats,
  getTotalMonthlyRevenue,
} from '../hotelQueries'

import type {
  Hotel,
  HotelInvoice,
  HotelPayment,
  HotelBooking,
} from '../hotelQueries'

describe('hotelQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllHotels', () => {
    it('should fetch all hotels ordered by creation date', async () => {
      const mockHotels = [
        { id: 'h1', name_th: 'Hotel 1', status: 'active' },
        { id: 'h2', name_th: 'Hotel 2', status: 'pending' },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockHotels, error: null })

      const result = await getAllHotels()

      expect(mockFrom).toHaveBeenCalledWith('hotels')
      expect(result).toHaveLength(2)
    })

    it('should throw on error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      await expect(getAllHotels()).rejects.toThrow()
    })
  })

  describe('getHotelById', () => {
    it('should fetch a single hotel', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'h1', name_th: 'Hotel 1' },
        error: null,
      })

      const result = await getHotelById('h1')

      expect(result.name_th).toBe('Hotel 1')
    })

    it('should throw on error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      await expect(getHotelById('bad')).rejects.toThrow()
    })
  })

  describe('createHotel', () => {
    it('should create a new hotel', async () => {
      const newHotel = { name_th: 'New Hotel', commission_rate: 20 }

      mockSingle.mockResolvedValueOnce({
        data: { id: 'h-new', ...newHotel },
        error: null,
      })

      const result = await createHotel(newHotel)

      expect(mockFrom).toHaveBeenCalledWith('hotels')
      expect(mockInsert).toHaveBeenCalled()
      expect(result.name_th).toBe('New Hotel')
    })
  })

  describe('updateHotel', () => {
    it('should update hotel data', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'h1', name_th: 'Updated Hotel' },
        error: null,
      })

      const result = await updateHotel('h1', { name_th: 'Updated Hotel' })

      expect(mockUpdate).toHaveBeenCalled()
      expect(result.name_th).toBe('Updated Hotel')
    })
  })

  describe('updateHotelStatus', () => {
    it('should update hotel status', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'h1', status: 'inactive' },
        error: null,
      })

      const result = await updateHotelStatus('h1', 'inactive')

      expect(mockUpdate).toHaveBeenCalledWith({ status: 'inactive' })
      expect(result.status).toBe('inactive')
    })
  })

  describe('getHotelInvoices', () => {
    it('should return existing bills when available', async () => {
      const mockBills = [
        { id: 'bill-1', hotel_id: 'h1', status: 'pending' },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockBills })

      const result = await getHotelInvoices('h1')

      expect(mockFrom).toHaveBeenCalledWith('monthly_bills')
      expect(result).toHaveLength(1)
    })

    it('should generate invoices from bookings when no bills exist', async () => {
      // No existing bills
      mockOrder.mockResolvedValueOnce({ data: [] })
      // Bookings data
      mockOrder.mockResolvedValueOnce({
        data: [
          {
            booking_date: '2026-01-15',
            final_price: 1000,
            status: 'completed',
            created_at: '2026-01-15T10:00:00Z',
            hotels: { commission_rate: 20 },
          },
        ],
        error: null,
      })

      const result = await getHotelInvoices('h1')

      expect(Array.isArray(result)).toBe(true)
    })

    it('should return empty array when no bookings exist', async () => {
      mockOrder.mockResolvedValueOnce({ data: [] })
      mockOrder.mockResolvedValueOnce({ data: [], error: null })

      const result = await getHotelInvoices('h1')
      expect(result).toEqual([])
    })
  })

  describe('getHotelPayments', () => {
    it('should fetch paid bookings as payments', async () => {
      const mockPayments = [
        {
          id: 'b1',
          booking_number: 'BK001',
          final_price: 1000,
          payment_status: 'paid',
          payment_method: 'bank_transfer',
          created_at: '2026-01-01',
          completed_at: '2026-01-01',
          customer_id: 'c1',
        },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockPayments, error: null })

      const result = await getHotelPayments('h1')

      expect(result).toHaveLength(1)
      expect(result[0].transaction_ref).toBe('BK001')
      expect(result[0].amount).toBe(1000)
    })
  })

  describe('getHotelBookings', () => {
    it('should fetch hotel bookings and parse customer notes', async () => {
      const mockBookings = [
        {
          id: 'b1',
          booking_number: 'BK001',
          hotel_id: 'h1',
          customer_notes: 'Guest: John Doe, Phone: 0812345678',
          booking_date: '2026-01-15',
          booking_time: '10:00',
          duration: 120,
          final_price: 1500,
          status: 'confirmed',
          payment_status: 'paid',
          hotel_room_number: '301',
          is_hotel_booking: true,
          created_at: '2026-01-15T00:00:00Z',
          service: { name_th: 'นวดไทย', name_en: null, category: 'massage' },
          staff: { name_th: 'สมหญิง', name_en: null },
        },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockBookings, error: null })

      const result = await getHotelBookings('h1')

      expect(result).toHaveLength(1)
      expect(result[0].customer_name).toBe('John Doe')
      expect(result[0].customer_phone).toBe('0812345678')
      expect(result[0].service_name).toBe('นวดไทย')
    })
  })

  describe('getHotelStats', () => {
    it('should return hotel statistics', async () => {
      // Query 1: .select('*',{count}).eq('hotel_id',...).eq('is_hotel_booking',true)
      //   eq call 1 = intermediate, eq call 2 = terminal
      // Query 2: .select('final_price').eq('hotel_id',...).eq('is_hotel_booking',true).in(...).gte(...)
      //   eq call 3 = intermediate, eq call 4 = intermediate, gte = terminal
      const chainObj = () => ({ select: mockSelect, eq: mockEq, order: mockOrder, single: mockSingle, update: mockUpdate, insert: mockInsert, in: mockIn, gte: mockGte })

      mockEq
        .mockReturnValueOnce(chainObj())   // Query 1: eq('hotel_id') - intermediate
        .mockResolvedValueOnce({ count: 25 }) // Query 1: eq('is_hotel_booking') - terminal
        .mockReturnValueOnce(chainObj())   // Query 2: eq('hotel_id') - intermediate
        .mockReturnValueOnce(chainObj())   // Query 2: eq('is_hotel_booking') - intermediate

      // Query 2 terminal
      mockGte.mockResolvedValueOnce({
        data: [
          { final_price: 1000 },
          { final_price: 2000 },
        ],
      })

      const result = await getHotelStats('h1')

      expect(result.totalBookings).toBe(25)
      expect(result.monthlyRevenue).toBe(3000)
    })
  })

  describe('getTotalMonthlyRevenue', () => {
    it('should calculate total revenue across all hotels', async () => {
      // Chain: .select('final_price').eq('is_hotel_booking', true).in(...).gte(...)
      // eq = intermediate, in = intermediate, gte = terminal
      mockGte.mockResolvedValueOnce({
        data: [
          { final_price: 1000 },
          { final_price: 2000 },
          { final_price: 3000 },
        ],
        error: null,
      })

      const result = await getTotalMonthlyRevenue()

      expect(result).toBe(6000)
    })

    it('should throw on error', async () => {
      mockGte.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      await expect(getTotalMonthlyRevenue()).rejects.toThrow()
    })
  })

  describe('type validation', () => {
    it('should validate Hotel interface', () => {
      const hotel: Hotel = {
        id: 'h1',
        name_th: 'โรงแรมทดสอบ',
        name_en: 'Test Hotel',
        contact_person: 'Contact',
        email: 'test@hotel.com',
        phone: '02-000-0000',
        address: '123 Test St',
        latitude: 13.756331,
        longitude: 100.501765,
        commission_rate: 20,
        status: 'active',
        rating: 4.5,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      }
      expect(hotel.status).toBe('active')
    })

    it('should validate HotelBooking interface', () => {
      const booking: HotelBooking = {
        id: 'b1',
        booking_number: 'BK001',
        hotel_id: 'h1',
        customer_name: 'Test',
        customer_phone: '081',
        service_name: 'Massage',
        service_category: 'massage',
        booking_date: '2026-01-01',
        service_date: '2026-01-02',
        service_time: '10:00',
        duration: 120,
        total_price: 1500,
        status: 'confirmed',
        payment_status: 'paid',
        created_by_hotel: true,
        created_at: '2026-01-01',
      }
      expect(booking.created_by_hotel).toBe(true)
    })
  })
})
