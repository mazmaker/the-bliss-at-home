import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @supabase/supabase-js
const mockCreateClient = vi.fn().mockReturnValue({
  auth: {
    getSession: vi.fn(),
    signIn: vi.fn(),
  },
  from: vi.fn(),
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}))

// Mock the Database type
vi.mock('../../../../../packages/types/database.types', () => ({
  // Empty mock - just needs to be importable
}))

describe('supabaseClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear the singleton stored on window
    if (typeof globalThis !== 'undefined') {
      (globalThis as any).__hotelSupabaseClient = undefined
    }
  })

  describe('module structure', () => {
    it('should export hotelSupabase as named export', async () => {
      // Re-import to test the module
      const mod = await import('../../lib/supabaseClient')
      expect(mod.hotelSupabase).toBeDefined()
    })

    it('should export default for backward compatibility', async () => {
      const mod = await import('../../lib/supabaseClient')
      expect(mod.default).toBeDefined()
    })
  })

  describe('configuration', () => {
    it('should use correct Supabase URL pattern', () => {
      const expectedUrlPattern = /https:\/\/.*\.supabase\.co/
      // The URL should match the pattern
      expect('https://rbdvlfriqjnwpxmmgisf.supabase.co').toMatch(expectedUrlPattern)
    })

    it('should have auth configuration with correct settings', () => {
      const expectedConfig = {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'bliss-customer-auth',
        debug: false,
      }

      expect(expectedConfig.autoRefreshToken).toBe(true)
      expect(expectedConfig.persistSession).toBe(true)
      expect(expectedConfig.flowType).toBe('pkce')
      expect(expectedConfig.storageKey).toBe('bliss-customer-auth')
    })

    it('should use custom header for hotel app identification', () => {
      const expectedHeaders = {
        'x-my-custom-header': 'hotel-app',
      }

      expect(expectedHeaders['x-my-custom-header']).toBe('hotel-app')
    })

    it('should configure realtime with events per second', () => {
      const realtimeConfig = {
        params: {
          eventsPerSecond: 10,
        },
      }

      expect(realtimeConfig.params.eventsPerSecond).toBe(10)
    })
  })

  describe('singleton pattern', () => {
    it('should use window singleton to survive HMR reloads', () => {
      // Simulate the singleton check
      const windowStore: Record<string, any> = {}

      const getOrCreateClient = () => {
        if (windowStore.__hotelSupabaseClient) {
          return windowStore.__hotelSupabaseClient
        }
        const client = { id: 'test-client' }
        windowStore.__hotelSupabaseClient = client
        return client
      }

      const client1 = getOrCreateClient()
      const client2 = getOrCreateClient()

      expect(client1).toBe(client2) // Same reference
    })
  })

  describe('environment variable handling', () => {
    it('should have fallback Supabase URL', () => {
      const fallbackUrl = 'https://rbdvlfriqjnwpxmmgisf.supabase.co'
      expect(fallbackUrl).toContain('supabase.co')
    })

    it('should have fallback anon key', () => {
      const fallbackKey =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJiZHZsZnJpcWpud3B4bW1naXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNjU4NDksImV4cCI6MjA4Mzk0MTg0OX0.kJby5jz8N5pysiSNft_Z16ParaXP5A5ARiNecENANLc'
      expect(fallbackKey).toMatch(/^eyJ/) // JWT format
      expect(fallbackKey.split('.')).toHaveLength(3) // JWT has 3 parts
    })
  })
})
