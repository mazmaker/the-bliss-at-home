import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase - use table-based routing
const mockResults: Record<string, any> = {}

function createMockBuilder() {
  const builder: any = {}
  const methods = ['select', 'eq', 'single', 'order']
  methods.forEach(m => { builder[m] = vi.fn().mockReturnValue(builder) })
  builder.then = (resolve: any) => {
    const result = mockResults['default'] || { data: null, error: null }
    return Promise.resolve(result).then(resolve)
  }
  return builder
}

const mockFrom = vi.fn().mockImplementation(() => createMockBuilder())

vi.mock('@bliss/supabase/auth', () => ({
  supabase: {
    from: (...args: any[]) => mockFrom(...args),
  },
}))

import {
  getHotelSlugFromId,
  getHotelIdFromSlug,
  getAllHotelMappings,
  clearHotelCache,
  getHotelSlugFromIdStatic,
  STATIC_HOTEL_ID_TO_SLUG,
} from '../hotelUtils'

describe('hotelUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearHotelCache()
    mockResults['default'] = { data: null, error: null }
  })

  describe('getHotelSlugFromId', () => {
    it('returns slug from database', async () => {
      mockResults['default'] = { data: { hotel_slug: 'grand-palace-bangkok' }, error: null }
      const result = await getHotelSlugFromId('hotel-1')
      expect(result).toBe('grand-palace-bangkok')
      expect(mockFrom).toHaveBeenCalledWith('hotels')
    })

    it('returns fallback on error', async () => {
      mockResults['default'] = { data: null, error: { message: 'error' } }
      const result = await getHotelSlugFromId('bad-id')
      expect(result).toBe('resort-chiang-mai')
    })

    it('returns fallback when slug is null', async () => {
      mockResults['default'] = { data: { hotel_slug: null }, error: null }
      const result = await getHotelSlugFromId('no-slug')
      expect(result).toBe('resort-chiang-mai')
    })

    it('uses cache for repeated calls', async () => {
      mockResults['default'] = { data: { hotel_slug: 'cached-slug' }, error: null }
      const result1 = await getHotelSlugFromId('cache-test')
      expect(result1).toBe('cached-slug')

      mockFrom.mockClear()
      const result2 = await getHotelSlugFromId('cache-test')
      expect(result2).toBe('cached-slug')
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  describe('getHotelIdFromSlug', () => {
    it('returns id from database', async () => {
      mockResults['default'] = { data: { id: 'hotel-123' }, error: null }
      const result = await getHotelIdFromSlug('grand-palace')
      expect(result).toBe('hotel-123')
    })

    it('returns null on error', async () => {
      mockResults['default'] = { data: null, error: { message: 'not found' } }
      const result = await getHotelIdFromSlug('nonexistent')
      expect(result).toBeNull()
    })

    it('returns null when id is missing', async () => {
      mockResults['default'] = { data: { id: null }, error: null }
      const result = await getHotelIdFromSlug('no-id')
      expect(result).toBeNull()
    })

    it('uses cache for repeated calls', async () => {
      mockResults['default'] = { data: { id: 'cached-id' }, error: null }
      await getHotelIdFromSlug('cache-slug')

      mockFrom.mockClear()
      const result = await getHotelIdFromSlug('cache-slug')
      expect(result).toBe('cached-id')
      expect(mockFrom).not.toHaveBeenCalled()
    })
  })

  describe('getAllHotelMappings', () => {
    it('returns hotel mappings', async () => {
      const mockData = [
        { id: 'h1', hotel_slug: 'hotel-a' },
        { id: 'h2', hotel_slug: 'hotel-b' },
      ]
      mockResults['default'] = { data: mockData, error: null }
      const result = await getAllHotelMappings()
      expect(result).toEqual(mockData)
    })

    it('returns empty on error', async () => {
      mockResults['default'] = { data: null, error: { message: 'error' } }
      const result = await getAllHotelMappings()
      expect(result).toEqual([])
    })

    it('returns empty when data is null', async () => {
      mockResults['default'] = { data: null, error: null }
      const result = await getAllHotelMappings()
      expect(result).toEqual([])
    })
  })

  describe('clearHotelCache', () => {
    it('clears cache without error', () => {
      expect(() => clearHotelCache()).not.toThrow()
    })
  })

  describe('getHotelSlugFromIdStatic', () => {
    it('returns slug for known hotel 001', () => {
      expect(getHotelSlugFromIdStatic('550e8400-e29b-41d4-a716-446655440001')).toBe('grand-palace-bangkok')
    })

    it('returns slug for known hotel 002', () => {
      expect(getHotelSlugFromIdStatic('550e8400-e29b-41d4-a716-446655440002')).toBe('resort-chiang-mai')
    })

    it('returns slug for known hotel 003', () => {
      expect(getHotelSlugFromIdStatic('550e8400-e29b-41d4-a716-446655440003')).toBe('dusit-thani-bangkok')
    })

    it('returns fallback for unknown hotel', () => {
      expect(getHotelSlugFromIdStatic('unknown-id')).toBe('resort-chiang-mai')
    })

    it('returns fallback for empty string', () => {
      expect(getHotelSlugFromIdStatic('')).toBe('resort-chiang-mai')
    })
  })

  describe('STATIC_HOTEL_ID_TO_SLUG', () => {
    it('has 3 hotel entries', () => {
      expect(Object.keys(STATIC_HOTEL_ID_TO_SLUG)).toHaveLength(3)
    })
  })
})
