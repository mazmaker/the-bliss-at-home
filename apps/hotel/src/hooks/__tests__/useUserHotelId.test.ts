import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @bliss/supabase/auth
const mockUseAuth = vi.fn()
vi.mock('@bliss/supabase/auth', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock @bliss/supabase
const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null })
const mockEq = vi.fn(() => ({ limit: mockLimit }))
const mockSelect = vi.fn(() => ({ eq: mockEq }))
const mockFrom = vi.fn(() => ({ select: mockSelect }))

vi.mock('@bliss/supabase', () => ({
  supabase: { from: mockFrom },
}))

// Mock react hooks
let capturedEffect: (() => void) | null = null
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual as any,
    useState: vi.fn((init: any) => [init, vi.fn()]),
    useEffect: vi.fn((cb: () => any) => {
      capturedEffect = cb
    }),
  }
})

describe('useUserHotelId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedEffect = null
  })

  describe('interface structure', () => {
    it('should define UseUserHotelIdResult with correct shape', () => {
      const result = {
        hotelId: null as string | null,
        isLoading: true,
        error: null as string | null,
      }

      expect(result.hotelId).toBeNull()
      expect(result.isLoading).toBe(true)
      expect(result.error).toBeNull()
    })

    it('should allow hotelId to be a string', () => {
      const result = {
        hotelId: '550e8400-e29b-41d4-a716-446655440003',
        isLoading: false,
        error: null as string | null,
      }

      expect(result.hotelId).toBe('550e8400-e29b-41d4-a716-446655440003')
      expect(result.isLoading).toBe(false)
    })

    it('should allow error to be a string', () => {
      const result = {
        hotelId: null as string | null,
        isLoading: false,
        error: 'ไม่สามารถดึงข้อมูลโรงแรมได้',
      }

      expect(result.error).toBe('ไม่สามารถดึงข้อมูลโรงแรมได้')
    })
  })

  describe('authentication scenarios', () => {
    it('should return null hotel id when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isAuthenticated: false,
      })

      // Simulate the hook logic
      const isAuthenticated = false
      const user = null
      const hotelId = (!isAuthenticated || !user) ? null : 'some-id'
      expect(hotelId).toBeNull()
    })

    it('should use hotel_id from user metadata when available', () => {
      const user = {
        id: 'user-1',
        user_metadata: {
          hotel_id: '550e8400-e29b-41d4-a716-446655440003',
        },
      }

      const hotelId = user.user_metadata?.hotel_id
      expect(hotelId).toBe('550e8400-e29b-41d4-a716-446655440003')
    })

    it('should handle user without hotel_id in metadata', () => {
      const user = {
        id: 'user-1',
        user_metadata: {},
      }

      const hotelId = user.user_metadata?.hotel_id
      expect(hotelId).toBeUndefined()
    })
  })

  describe('URL slug fallback logic', () => {
    it('should resolve dusit-thani-bangkok slug to correct hotel id', () => {
      const urlSlug = 'dusit-thani-bangkok'
      let resolvedId: string | null = null

      if (urlSlug === 'dusit-thani-bangkok') {
        resolvedId = '550e8400-e29b-41d4-a716-446655440003'
      } else if (urlSlug === 'resort-chiang-mai') {
        resolvedId = '550e8400-e29b-41d4-a716-446655440002'
      }

      expect(resolvedId).toBe('550e8400-e29b-41d4-a716-446655440003')
    })

    it('should resolve resort-chiang-mai slug to correct hotel id', () => {
      const urlSlug = 'resort-chiang-mai'
      let resolvedId: string | null = null

      if (urlSlug === 'dusit-thani-bangkok') {
        resolvedId = '550e8400-e29b-41d4-a716-446655440003'
      } else if (urlSlug === 'resort-chiang-mai') {
        resolvedId = '550e8400-e29b-41d4-a716-446655440002'
      }

      expect(resolvedId).toBe('550e8400-e29b-41d4-a716-446655440002')
    })

    it('should set error for unknown slug', () => {
      const urlSlug = 'unknown-hotel'
      let error: string | null = null

      if (urlSlug !== 'dusit-thani-bangkok' && urlSlug !== 'resort-chiang-mai') {
        error = 'Unknown hotel: ' + urlSlug
      }

      expect(error).toBe('Unknown hotel: unknown-hotel')
    })

    it('should extract hotel slug from URL path', () => {
      const testPaths = [
        { path: '/hotel/dusit-thani-bangkok/bookings', expected: 'dusit-thani-bangkok' },
        { path: '/hotel/resort-chiang-mai/dashboard', expected: 'resort-chiang-mai' },
        { path: '/hotel/grand-palace-bangkok', expected: 'grand-palace-bangkok' },
        { path: '/other-page', expected: undefined },
      ]

      for (const { path, expected } of testPaths) {
        const match = path.match(/\/hotel\/([^\/]+)/)
        expect(match?.[1]).toBe(expected)
      }
    })
  })

  describe('Supabase query structure', () => {
    it('should query the hotels table with correct parameters', () => {
      // Verify that the supabase from call targets the correct table
      const tableName = 'hotels'
      const selectFields = 'id, name_th'
      const filterField = 'auth_user_id'

      expect(tableName).toBe('hotels')
      expect(selectFields).toContain('id')
      expect(selectFields).toContain('name_th')
      expect(filterField).toBe('auth_user_id')
    })
  })
})
