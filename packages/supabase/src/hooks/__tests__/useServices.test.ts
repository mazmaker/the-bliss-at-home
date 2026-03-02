import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../useSupabaseQuery', () => ({
  useSupabaseQuery: vi.fn((options: any) => ({
    data: undefined,
    isLoading: true,
    error: null,
    _queryKey: options.queryKey,
    _enabled: options.enabled,
  })),
}))

vi.mock('../../services', () => ({
  serviceService: {
    getServices: vi.fn(),
    getServicesByCategory: vi.fn(),
    getServiceById: vi.fn(),
    getServiceBySlug: vi.fn(),
  },
}))

vi.mock('../../types/database.types', () => ({}))

import {
  useServices,
  useServicesByCategory,
  useServiceById,
  useServiceBySlug,
} from '../useServices'
import { useSupabaseQuery } from '../useSupabaseQuery'
import { serviceService } from '../../services'

describe('useServices hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // useServices
  // ============================================
  describe('useServices', () => {
    it('should be a function', () => {
      expect(typeof useServices).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useServices()
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['services'],
        })
      )
    })

    it('should not have enabled condition (always enabled)', () => {
      useServices()
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      expect(lastCall.enabled).toBeUndefined()
    })

    it('should pass queryFn that calls serviceService.getServices', () => {
      useServices()
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(serviceService.getServices).toHaveBeenCalledWith(mockClient)
    })
  })

  // ============================================
  // useServicesByCategory
  // ============================================
  describe('useServicesByCategory', () => {
    it('should be a function', () => {
      expect(typeof useServicesByCategory).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key including category', () => {
      useServicesByCategory('massage' as any)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['services', 'category', 'massage'],
          enabled: true,
        })
      )
    })

    it('should pass queryFn that calls serviceService.getServicesByCategory', () => {
      useServicesByCategory('spa' as any)
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(serviceService.getServicesByCategory).toHaveBeenCalledWith(mockClient, 'spa')
    })
  })

  // ============================================
  // useServiceById
  // ============================================
  describe('useServiceById', () => {
    it('should be a function', () => {
      expect(typeof useServiceById).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useServiceById('service-1')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['services', 'detail', 'service-1'],
          enabled: true,
        })
      )
    })

    it('should disable query when id is undefined', () => {
      useServiceById(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls serviceService.getServiceById', () => {
      useServiceById('service-2')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(serviceService.getServiceById).toHaveBeenCalledWith(mockClient, 'service-2')
    })
  })

  // ============================================
  // useServiceBySlug
  // ============================================
  describe('useServiceBySlug', () => {
    it('should be a function', () => {
      expect(typeof useServiceBySlug).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useServiceBySlug('thai-massage')
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['services', 'slug', 'thai-massage'],
          enabled: true,
        })
      )
    })

    it('should disable query when slug is undefined', () => {
      useServiceBySlug(undefined)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should pass queryFn that calls serviceService.getServiceBySlug', () => {
      useServiceBySlug('oil-massage')
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(serviceService.getServiceBySlug).toHaveBeenCalledWith(mockClient, 'oil-massage')
    })
  })
})
