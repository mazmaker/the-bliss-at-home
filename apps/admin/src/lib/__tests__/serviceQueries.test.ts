import { describe, it, expect, vi, beforeEach } from 'vitest'

// Setup mocks with vi.hoisted
const {
  mockFrom,
  mockSelect,
  mockEq,
  mockOrder,
  mockSingle,
  mockInsert,
  mockUpdate,
  mockOr,
} = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockEq = vi.fn()
  const mockOrder = vi.fn()
  const mockSelect = vi.fn()
  const mockInsert = vi.fn()
  const mockUpdate = vi.fn()
  const mockOr = vi.fn()

  const chain = () => ({
    select: mockSelect,
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
    insert: mockInsert,
    update: mockUpdate,
    or: mockOr,
  })

  mockSelect.mockImplementation(() => chain())
  mockEq.mockImplementation(() => chain())
  mockOrder.mockImplementation(() => chain())
  mockSingle.mockImplementation(() => chain())
  mockInsert.mockImplementation(() => chain())
  mockUpdate.mockImplementation(() => chain())
  mockOr.mockImplementation(() => chain())

  const mockFrom = vi.fn(() => chain())

  return { mockFrom, mockSelect, mockEq, mockOrder, mockSingle, mockInsert, mockUpdate, mockOr }
})

vi.mock('../supabase', () => ({
  supabase: { from: mockFrom },
}))

vi.mock('../mockAuth', () => ({
  USE_MOCK_AUTH: false,
}))

import {
  getServices,
  getServicesByCategory,
  createService,
  updateService,
  deleteService,
  toggleServiceStatus,
  getServiceStats,
  searchServices,
} from '../serviceQueries'
import type { Service, CreateServiceData } from '../serviceQueries'

describe('serviceQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getServices', () => {
    it('should fetch all services ordered by sort_order', async () => {
      const mockData: Service[] = [
        {
          id: '1',
          name_th: 'นวดไทย',
          name_en: 'Thai Massage',
          category: 'massage',
          duration: 120,
          base_price: 800,
          hotel_price: 640,
          is_active: true,
          sort_order: 0,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]

      // Source: .select('*').order('sort_order', ...).order('created_at', ...)
      // First .order() is intermediate, second .order() is terminal
      mockOrder
        .mockReturnValueOnce({ select: mockSelect, eq: mockEq, order: mockOrder, single: mockSingle, insert: mockInsert, update: mockUpdate, or: mockOr })
        .mockResolvedValueOnce({ data: mockData, error: null })

      const result = await getServices()

      expect(mockFrom).toHaveBeenCalledWith('services')
      expect(mockSelect).toHaveBeenCalledWith('*')
      expect(result).toEqual(mockData)
    })

    it('should throw on error', async () => {
      // First .order() is intermediate, second .order() is terminal
      mockOrder
        .mockReturnValueOnce({ select: mockSelect, eq: mockEq, order: mockOrder, single: mockSingle, insert: mockInsert, update: mockUpdate, or: mockOr })
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Database error' },
        })

      await expect(getServices()).rejects.toEqual({ message: 'Database error' })
    })
  })

  describe('getServicesByCategory', () => {
    it('should call getServices when category is "all"', async () => {
      const mockData = [{ id: '1', name_th: 'Service 1' }]
      // getServices: .select('*').order('sort_order', ...).order('created_at', ...)
      mockOrder
        .mockReturnValueOnce({ select: mockSelect, eq: mockEq, order: mockOrder, single: mockSingle, insert: mockInsert, update: mockUpdate, or: mockOr })
        .mockResolvedValueOnce({ data: mockData, error: null })

      const result = await getServicesByCategory('all')

      expect(mockFrom).toHaveBeenCalledWith('services')
      expect(result).toEqual(mockData)
    })

    it('should filter by category and active status', async () => {
      const mockData = [
        { id: '1', name_th: 'นวดไทย', category: 'massage', is_active: true },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await getServicesByCategory('massage')

      expect(mockFrom).toHaveBeenCalledWith('services')
      expect(mockEq).toHaveBeenCalledWith('category', 'massage')
      expect(mockEq).toHaveBeenCalledWith('is_active', true)
      expect(result).toEqual(mockData)
    })

    it('should throw on error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Error' },
      })

      await expect(getServicesByCategory('nail')).rejects.toEqual({ message: 'Error' })
    })
  })

  describe('createService', () => {
    it('should insert a new service and return it', async () => {
      const serviceData: CreateServiceData = {
        name_th: 'นวดไทย',
        name_en: 'Thai Massage',
        category: 'massage',
        duration: 120,
        base_price: 800,
        hotel_price: 640,
      }

      const createdService = {
        id: '1',
        ...serviceData,
        is_active: true,
        sort_order: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }

      mockSingle.mockResolvedValueOnce({ data: createdService, error: null })

      const result = await createService(serviceData)

      expect(mockFrom).toHaveBeenCalledWith('services')
      expect(mockInsert).toHaveBeenCalledWith({
        ...serviceData,
        is_active: true,
        sort_order: 0,
      })
      expect(result).toEqual(createdService)
    })

    it('should throw on insert error', async () => {
      const serviceData: CreateServiceData = {
        name_th: 'Test',
        name_en: 'Test',
        category: 'spa',
        duration: 60,
        base_price: 500,
        hotel_price: 400,
      }

      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert error' },
      })

      await expect(createService(serviceData)).rejects.toEqual({ message: 'Insert error' })
    })
  })

  describe('updateService', () => {
    it('should update a service by id', async () => {
      const updatedData = { name_th: 'Updated Name' }
      const returnedService = { id: '1', name_th: 'Updated Name' }

      mockSingle.mockResolvedValueOnce({ data: returnedService, error: null })

      const result = await updateService('1', updatedData)

      expect(mockFrom).toHaveBeenCalledWith('services')
      expect(mockUpdate).toHaveBeenCalledWith(updatedData)
      expect(mockEq).toHaveBeenCalledWith('id', '1')
      expect(result).toEqual(returnedService)
    })

    it('should throw on update error', async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update error' },
      })

      await expect(updateService('bad-id', {})).rejects.toEqual({ message: 'Update error' })
    })
  })

  describe('deleteService', () => {
    it('should soft delete by setting is_active to false', async () => {
      mockEq.mockResolvedValueOnce({ error: null })

      await deleteService('1')

      expect(mockFrom).toHaveBeenCalledWith('services')
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
      expect(mockEq).toHaveBeenCalledWith('id', '1')
    })

    it('should throw on delete error', async () => {
      mockEq.mockResolvedValueOnce({ error: { message: 'Delete error' } })

      await expect(deleteService('bad-id')).rejects.toEqual({ message: 'Delete error' })
    })
  })

  describe('toggleServiceStatus', () => {
    it('should toggle service is_active status', async () => {
      // First call: get current status
      mockSingle.mockResolvedValueOnce({ data: { is_active: true } })
      // Second call: update with opposite status and return
      mockSingle.mockResolvedValueOnce({
        data: { id: '1', is_active: false },
        error: null,
      })

      const result = await toggleServiceStatus('1')

      expect(mockFrom).toHaveBeenCalledWith('services')
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false })
      expect(result).toEqual({ id: '1', is_active: false })
    })

    it('should throw when service not found', async () => {
      mockSingle.mockResolvedValueOnce({ data: null })

      await expect(toggleServiceStatus('bad-id')).rejects.toThrow('Service not found')
    })
  })

  describe('getServiceStats', () => {
    it('should return service statistics by category', async () => {
      const mockData = [
        { category: 'massage', is_active: true },
        { category: 'massage', is_active: false },
        { category: 'nail', is_active: true },
        { category: 'spa', is_active: true },
      ]

      mockSelect.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await getServiceStats()

      expect(mockFrom).toHaveBeenCalledWith('services')
      expect(result.total).toBe(4)
      expect(result.active).toBe(3)
      expect(result.inactive).toBe(1)
      expect(result.byCategory.massage).toBe(2)
      expect(result.byCategory.nail).toBe(1)
      expect(result.byCategory.spa).toBe(1)
    })

    it('should throw on error', async () => {
      mockSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'Stats error' },
      })

      await expect(getServiceStats()).rejects.toEqual({ message: 'Stats error' })
    })
  })

  describe('searchServices', () => {
    it('should search by name and description with ilike', async () => {
      const mockData = [
        { id: '1', name_th: 'นวดไทย', name_en: 'Thai Massage' },
      ]

      mockOrder.mockResolvedValueOnce({ data: mockData, error: null })

      const result = await searchServices('นวด')

      expect(mockFrom).toHaveBeenCalledWith('services')
      expect(mockOr).toHaveBeenCalledWith(
        'name_th.ilike.%นวด%,name_en.ilike.%นวด%,description_th.ilike.%นวด%,description_en.ilike.%นวด%'
      )
      expect(mockEq).toHaveBeenCalledWith('is_active', true)
      expect(result).toEqual(mockData)
    })

    it('should throw on search error', async () => {
      mockOrder.mockResolvedValueOnce({
        data: null,
        error: { message: 'Search error' },
      })

      await expect(searchServices('test')).rejects.toEqual({ message: 'Search error' })
    })
  })

  describe('type validation', () => {
    it('should validate Service interface', () => {
      const service: Service = {
        id: '1',
        name_th: 'นวดไทย',
        name_en: 'Thai Massage',
        category: 'massage',
        duration: 120,
        base_price: 800,
        hotel_price: 640,
        is_active: true,
        sort_order: 0,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      expect(service.category).toBe('massage')
    })

    it('should validate CreateServiceData interface', () => {
      const data: CreateServiceData = {
        name_th: 'Test',
        name_en: 'Test',
        category: 'nail',
        duration: 60,
        base_price: 450,
        hotel_price: 360,
      }
      expect(data.duration).toBe(60)
    })
  })
})
