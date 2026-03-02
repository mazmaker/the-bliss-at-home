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
  mockDelete,
  mockIn,
  mockMaybeSingle,
  mockNeq,
  mockUpsert,
} = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockOrder = vi.fn()
  const mockSelect = vi.fn()
  const mockUpdate = vi.fn()
  const mockInsert = vi.fn()
  const mockDelete = vi.fn()
  const mockIn = vi.fn()
  const mockMaybeSingle = vi.fn()
  const mockNeq = vi.fn()
  const mockUpsert = vi.fn()

  const chain = () => ({
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
    update: mockUpdate,
    insert: mockInsert,
    delete: mockDelete,
    in: mockIn,
    maybeSingle: mockMaybeSingle,
    neq: mockNeq,
    upsert: mockUpsert,
  })

  mockSelect.mockImplementation(() => chain())
  mockEq.mockImplementation(() => chain())
  mockOrder.mockImplementation(() => chain())
  mockSingle.mockImplementation(() => chain())
  mockUpdate.mockImplementation(() => chain())
  mockInsert.mockImplementation(() => chain())
  mockDelete.mockImplementation(() => chain())
  mockIn.mockImplementation(() => chain())
  mockMaybeSingle.mockImplementation(() => chain())
  mockNeq.mockImplementation(() => chain())
  mockUpsert.mockImplementation(() => chain())

  const mockFrom = vi.fn(() => chain())

  return {
    mockFrom, mockSelect, mockEq, mockOrder, mockSingle,
    mockUpdate, mockInsert, mockDelete, mockIn, mockMaybeSingle,
    mockNeq, mockUpsert,
  }
})

vi.mock('../supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

import {
  getAllCustomers,
  getCustomerById,
  getCustomerBookings,
  updateCustomerStatus,
  updateCustomer,
  getCustomerAddresses,
  getCustomerTaxInfo,
  createCustomerAddress,
  deleteCustomerAddress,
  setDefaultAddress,
  upsertCustomerTaxInfo,
  getCustomerStatistics,
} from '../customerQueries'

import type {
  Customer,
  CustomerStatus,
  CustomerAddress,
  CustomerTaxInfo,
  CustomerBooking,
} from '../customerQueries'

describe('customerQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAllCustomers', () => {
    it('should fetch all customers and join emails', async () => {
      const mockCustomers = [
        { id: 'c1', profile_id: 'p1', full_name: 'Customer 1', phone: '081' },
        { id: 'c2', profile_id: null, full_name: 'Customer 2', phone: '082' },
      ]
      const mockProfiles = [
        { id: 'p1', email: 'customer1@test.com' },
      ]

      // First call: customers select
      mockOrder.mockResolvedValueOnce({ data: mockCustomers, error: null })
      // Second call: profiles select
      mockIn.mockResolvedValueOnce({ data: mockProfiles })

      const result = await getAllCustomers()

      expect(mockFrom).toHaveBeenCalledWith('customers')
      expect(result).toHaveLength(2)
      expect(result[0].email).toBe('customer1@test.com')
      expect(result[1].email).toBe('')
    })

    it('should throw on error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      await expect(getAllCustomers()).rejects.toThrow()
    })
  })

  describe('getCustomerById', () => {
    it('should fetch a customer by id with email', async () => {
      const mockCustomer = { id: 'c1', profile_id: 'p1', full_name: 'Test' }

      mockSingle.mockResolvedValueOnce({ data: mockCustomer, error: null })
      // Profile email fetch
      mockSingle.mockResolvedValueOnce({ data: { email: 'test@test.com' } })

      const result = await getCustomerById('c1')

      expect(result.full_name).toBe('Test')
      expect(result.email).toBe('test@test.com')
    })

    it('should throw on error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Not found' },
      })

      await expect(getCustomerById('bad')).rejects.toThrow()
    })
  })

  describe('getCustomerBookings', () => {
    it('should fetch bookings for a customer', async () => {
      const mockBookings = [
        {
          id: 'b1',
          booking_number: 'BK001',
          customer_id: 'c1',
          services: { name_th: 'นวดไทย' },
          staff: { name_th: 'พนักงาน' },
        },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockBookings, error: null })

      const result = await getCustomerBookings('c1')

      expect(result).toHaveLength(1)
      expect(result[0].service_name).toBe('นวดไทย')
      expect(result[0].staff_name).toBe('พนักงาน')
    })

    it('should throw on error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      await expect(getCustomerBookings('bad')).rejects.toThrow()
    })
  })

  describe('updateCustomerStatus', () => {
    it('should update customer status', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'c1', status: 'suspended' },
        error: null,
      })

      const result = await updateCustomerStatus('c1', 'suspended')

      expect(mockUpdate).toHaveBeenCalledWith({ status: 'suspended' })
      expect(result.status).toBe('suspended')
    })
  })

  describe('updateCustomer', () => {
    it('should update customer data', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: 'c1', full_name: 'Updated Name' },
        error: null,
      })

      const result = await updateCustomer('c1', { full_name: 'Updated Name' })
      expect(result.full_name).toBe('Updated Name')
    })
  })

  describe('getCustomerAddresses', () => {
    it('should fetch addresses ordered by default and creation', async () => {
      const mockAddresses = [
        { id: 'a1', is_default: true, label: 'Home' },
        { id: 'a2', is_default: false, label: 'Work' },
      ]

      // Source: .select('*').eq(...).order('is_default', ...).order('created_at', ...)
      // First .order() is intermediate, second .order() is terminal
      mockOrder
        .mockReturnValueOnce({ select: mockSelect, eq: mockEq, order: mockOrder, single: mockSingle, update: mockUpdate, insert: mockInsert, delete: mockDelete, in: mockIn, maybeSingle: mockMaybeSingle, neq: mockNeq, upsert: mockUpsert })
        .mockResolvedValueOnce({ data: mockAddresses, error: null })

      const result = await getCustomerAddresses('c1')
      expect(result).toHaveLength(2)
    })
  })

  describe('getCustomerTaxInfo', () => {
    it('should return tax info or null', async () => {
      mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 't1', tax_id: '1234567890123' },
        error: null,
      })

      const result = await getCustomerTaxInfo('c1')
      expect(result?.tax_id).toBe('1234567890123')
    })

    it('should return null when no tax info', async () => {
      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })

      const result = await getCustomerTaxInfo('c1')
      expect(result).toBeNull()
    })
  })

  describe('deleteCustomerAddress', () => {
    it('should delete an address', async () => {
      mockEq.mockResolvedValueOnce({ error: null })

      await deleteCustomerAddress('a1')

      expect(mockFrom).toHaveBeenCalledWith('addresses')
      expect(mockDelete).toHaveBeenCalled()
    })
  })

  describe('setDefaultAddress', () => {
    it('should unset all defaults then set selected one', async () => {
      // Unset all defaults
      mockEq.mockResolvedValueOnce({ error: null })
      // Set the selected one
      mockSingle.mockResolvedValueOnce({
        data: { id: 'a1', is_default: true },
        error: null,
      })

      const result = await setDefaultAddress('c1', 'a1')

      expect(mockUpdate).toHaveBeenCalledWith({ is_default: false })
      expect(mockUpdate).toHaveBeenCalledWith({ is_default: true })
    })
  })

  describe('upsertCustomerTaxInfo', () => {
    it('should upsert tax information', async () => {
      const taxData = {
        tax_type: 'personal',
        tax_id: '1234567890123',
        company_name: null,
        branch_code: null,
        address_line: '123 Test St',
        subdistrict: null,
        district: null,
        province: 'Bangkok',
        zipcode: '10110',
      }

      mockSingle.mockResolvedValueOnce({
        data: { id: 't1', ...taxData },
        error: null,
      })

      const result = await upsertCustomerTaxInfo('c1', taxData)

      expect(mockFrom).toHaveBeenCalledWith('tax_information')
      expect(mockUpsert).toHaveBeenCalled()
    })
  })

  describe('getCustomerStatistics', () => {
    it('should calculate customer statistics', async () => {
      const mockCustomers = [
        { id: 'c1', total_bookings: 5, total_spent: 10000, status: 'active' },
        { id: 'c2', total_bookings: 1, total_spent: 2000, status: 'active' },
        { id: 'c3', total_bookings: 3, total_spent: 6000, status: 'suspended' },
        { id: 'c4', total_bookings: 0, total_spent: 0, status: 'banned' },
      ]

      mockSelect.mockResolvedValueOnce({ data: mockCustomers, error: null })

      const stats = await getCustomerStatistics()

      expect(stats.total).toBe(4)
      expect(stats.active).toBe(2)
      expect(stats.suspended).toBe(1)
      expect(stats.banned).toBe(1)
      expect(stats.repeat_customers).toBe(2) // c1 and c3 have total_bookings > 1
      expect(stats.repeat_rate).toBe(50) // 2/4 * 100
      expect(stats.total_revenue).toBe(18000)
      expect(stats.average_lifetime_value).toBe(4500)
    })

    it('should throw on error', async () => {
      mockSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      await expect(getCustomerStatistics()).rejects.toThrow()
    })
  })

  describe('type validation', () => {
    it('should validate CustomerStatus type', () => {
      const statuses: CustomerStatus[] = ['active', 'suspended', 'banned']
      expect(statuses).toHaveLength(3)
    })

    it('should validate Customer interface', () => {
      const customer: Customer = {
        id: '1',
        profile_id: null,
        full_name: 'Test',
        phone: '081',
        address: null,
        date_of_birth: null,
        preferences: {},
        total_bookings: 0,
        total_spent: 0,
        last_booking_date: null,
        status: 'active',
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      }
      expect(customer.status).toBe('active')
    })
  })
})
