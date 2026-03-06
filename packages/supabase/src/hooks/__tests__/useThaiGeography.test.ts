import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../useSupabaseQuery', () => ({
  useSupabaseQuery: vi.fn((options: any) => ({
    data: undefined,
    isLoading: true,
    error: null,
    _queryKey: options.queryKey,
    _enabled: options.enabled,
    _staleTime: options.staleTime,
    _gcTime: options.gcTime,
  })),
}))

vi.mock('../../services/thaiGeographyService', () => ({
  getProvinces: vi.fn(),
  getDistricts: vi.fn(),
  getSubdistricts: vi.fn(),
}))

import {
  useProvinces,
  useDistricts,
  useSubdistricts,
} from '../useThaiGeography'
import { useSupabaseQuery } from '../useSupabaseQuery'
import { getProvinces, getDistricts, getSubdistricts } from '../../services/thaiGeographyService'

const TWENTY_FOUR_HOURS = 1000 * 60 * 60 * 24

describe('useThaiGeography hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================
  // useProvinces
  // ============================================
  describe('useProvinces', () => {
    it('should be a function', () => {
      expect(typeof useProvinces).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key', () => {
      useProvinces()
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['thai-provinces'],
        })
      )
    })

    it('should set staleTime to 24 hours', () => {
      useProvinces()
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          staleTime: TWENTY_FOUR_HOURS,
        })
      )
    })

    it('should set gcTime to 24 hours', () => {
      useProvinces()
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          gcTime: TWENTY_FOUR_HOURS,
        })
      )
    })

    it('should not have enabled condition (always enabled)', () => {
      useProvinces()
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      expect(lastCall.enabled).toBeUndefined()
    })

    it('should pass queryFn that calls getProvinces', () => {
      useProvinces()
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(getProvinces).toHaveBeenCalledWith(mockClient)
    })
  })

  // ============================================
  // useDistricts
  // ============================================
  describe('useDistricts', () => {
    it('should be a function', () => {
      expect(typeof useDistricts).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key including provinceId', () => {
      useDistricts(10)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['thai-districts', 10],
          enabled: true,
        })
      )
    })

    it('should disable query when provinceId is null', () => {
      useDistricts(null)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should set staleTime and gcTime to 24 hours', () => {
      useDistricts(10)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          staleTime: TWENTY_FOUR_HOURS,
          gcTime: TWENTY_FOUR_HOURS,
        })
      )
    })

    it('should pass queryFn that calls getDistricts', () => {
      useDistricts(10)
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(getDistricts).toHaveBeenCalledWith(mockClient, 10)
    })
  })

  // ============================================
  // useSubdistricts
  // ============================================
  describe('useSubdistricts', () => {
    it('should be a function', () => {
      expect(typeof useSubdistricts).toBe('function')
    })

    it('should call useSupabaseQuery with correct query key including districtId', () => {
      useSubdistricts(1001)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['thai-subdistricts', 1001],
          enabled: true,
        })
      )
    })

    it('should disable query when districtId is null', () => {
      useSubdistricts(null)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      )
    })

    it('should set staleTime and gcTime to 24 hours', () => {
      useSubdistricts(1001)
      expect(useSupabaseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          staleTime: TWENTY_FOUR_HOURS,
          gcTime: TWENTY_FOUR_HOURS,
        })
      )
    })

    it('should pass queryFn that calls getSubdistricts', () => {
      useSubdistricts(1001)
      const lastCall = vi.mocked(useSupabaseQuery).mock.calls.at(-1)![0]
      const mockClient = {} as any
      lastCall.queryFn(mockClient)
      expect(getSubdistricts).toHaveBeenCalledWith(mockClient, 1001)
    })
  })

  // ============================================
  // TWENTY_FOUR_HOURS constant validation
  // ============================================
  describe('cache duration', () => {
    it('should use 24 hours (86400000ms) for all geography queries', () => {
      expect(TWENTY_FOUR_HOURS).toBe(86400000)
    })
  })
})
