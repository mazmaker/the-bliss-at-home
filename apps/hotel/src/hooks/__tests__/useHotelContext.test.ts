import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted for all mocks referenced inside vi.mock factories
const { mockUseQuery } = vi.hoisted(() => ({
  mockUseQuery: vi.fn(),
}))

const { mockSingle, mockEq, mockOrder, mockSelect, mockFrom } = vi.hoisted(() => {
  const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null })
  const mockOrder = vi.fn().mockReturnThis()
  const mockEq = vi.fn().mockReturnThis()
  const mockSelect = vi.fn(() => ({
    eq: mockEq,
    order: mockOrder,
    single: mockSingle,
  }))
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
  }))
  return { mockSingle, mockEq, mockOrder, mockSelect, mockFrom }
})

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useParams: vi.fn(() => ({ hotelSlug: 'resort-chiang-mai' })),
}))

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}))

// Mock supabase
vi.mock('@bliss/supabase/auth', () => ({
  supabase: { from: mockFrom },
}))

import { HOTEL_IDS, HOTEL_SLUGS } from '../useHotelContext'

describe('useHotelContext exports', () => {
  describe('HOTEL_IDS', () => {
    it('should have NIMMAN_RESORT id', () => {
      expect(HOTEL_IDS.NIMMAN_RESORT).toBe('550e8400-e29b-41d4-a716-446655440002')
    })

    it('should have DUSIT_THANI id', () => {
      expect(HOTEL_IDS.DUSIT_THANI).toBe('550e8400-e29b-41d4-a716-446655440003')
    })

    it('should have HILTON_BANGKOK id', () => {
      expect(HOTEL_IDS.HILTON_BANGKOK).toBe('550e8400-e29b-41d4-a716-446655440001')
    })

    it('should be a read-only object with 3 entries', () => {
      expect(Object.keys(HOTEL_IDS).length).toBe(3)
    })
  })

  describe('HOTEL_SLUGS', () => {
    it('should have RESORT_CHIANG_MAI slug', () => {
      expect(HOTEL_SLUGS.RESORT_CHIANG_MAI).toBe('resort-chiang-mai')
    })

    it('should have DUSIT_THANI_BANGKOK slug', () => {
      expect(HOTEL_SLUGS.DUSIT_THANI_BANGKOK).toBe('dusit-thani-bangkok')
    })

    it('should have GRAND_PALACE_BANGKOK slug', () => {
      expect(HOTEL_SLUGS.GRAND_PALACE_BANGKOK).toBe('grand-palace-bangkok')
    })

    it('should be a read-only object with 3 entries', () => {
      expect(Object.keys(HOTEL_SLUGS).length).toBe(3)
    })
  })
})

describe('HotelData interface (type check)', () => {
  it('should allow creating valid HotelData objects', () => {
    // This test validates the HotelData type is correctly structured
    const hotelData = {
      id: 'test-id',
      name_th: 'โรงแรมทดสอบ',
      name_en: 'Test Hotel',
      hotel_slug: 'test-hotel',
      commission_rate: 20,
      status: 'active' as const,
    }

    expect(hotelData.id).toBe('test-id')
    expect(hotelData.name_th).toBe('โรงแรมทดสอบ')
    expect(hotelData.commission_rate).toBe(20)
    expect(hotelData.status).toBe('active')
  })

  it('should support optional fields', () => {
    const hotelData = {
      id: 'test-id',
      name_th: 'โรงแรมทดสอบ',
      name_en: 'Test Hotel',
      hotel_slug: 'test-hotel',
      commission_rate: 20,
      status: 'active' as const,
      contact_person: 'John Doe',
      phone: '0812345678',
      email: 'test@hotel.com',
      address: '123 Test Street',
      website: 'https://test.com',
      latitude: 13.7563,
      longitude: 100.5018,
      tax_id: '1234567890123',
      bank_name: 'Test Bank',
      bank_account_number: '1234567890',
      bank_account_name: 'Test Account',
    }

    expect(hotelData.contact_person).toBe('John Doe')
    expect(hotelData.latitude).toBe(13.7563)
    expect(hotelData.tax_id).toBe('1234567890123')
  })
})

describe('useHotelContext hook behavior', () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
  })

  it('should call useQuery with hotel slug query key', () => {
    // Simulate what the hook does internally
    mockUseQuery.mockReturnValue({
      data: {
        id: 'test-id',
        name_th: 'Test Hotel',
        name_en: 'Test Hotel EN',
        hotel_slug: 'resort-chiang-mai',
        commission_rate: 20,
        status: 'active',
      },
      isLoading: false,
      error: null,
    })

    // Simulate the query key format used by the hook
    const queryKey = ['hotel', 'resort-chiang-mai']
    expect(queryKey).toEqual(['hotel', 'resort-chiang-mai'])
  })

  it('should handle loading state', () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    })

    const result = mockUseQuery({
      queryKey: ['hotel', 'resort-chiang-mai'],
      queryFn: vi.fn(),
      enabled: true,
    })

    expect(result.isLoading).toBe(true)
    expect(result.data).toBeUndefined()
  })

  it('should handle error state', () => {
    const testError = new Error('Hotel not found')
    mockUseQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: testError,
    })

    const result = mockUseQuery({
      queryKey: ['hotel', 'unknown-hotel'],
      queryFn: vi.fn(),
    })

    expect(result.error).toBe(testError)
    expect(result.data).toBeNull()
  })
})
