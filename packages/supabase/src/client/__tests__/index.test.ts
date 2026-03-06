import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @supabase/supabase-js
const { mockCreateClient, mockClient } = vi.hoisted(() => {
  const mockClient = {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(),
  }
  return {
    mockCreateClient: vi.fn(() => mockClient),
    mockClient,
  }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}))

// Mock window
const windowMock: Record<string, any> = {}
Object.defineProperty(global, 'window', {
  value: new Proxy(windowMock, {
    get(target, prop) {
      if (prop === 'localStorage') return global.localStorage
      return target[prop as string]
    },
    set(target, prop, value) {
      target[prop as string] = value
      return true
    },
  }),
  configurable: true,
  writable: true,
})

Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  },
  configurable: true,
})

describe('client/index.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    delete windowMock.__supabaseClient
  })

  describe('createSupabaseClient', () => {
    it('should create a client with given config', async () => {
      const { createSupabaseClient } = await import('../index')

      const client = createSupabaseClient({ url: 'https://test.supabase.co', anonKey: 'test-anon-key' })

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-anon-key',
        expect.objectContaining({
          auth: expect.objectContaining({
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            storageKey: 'bliss-customer-auth',
          }),
        })
      )
      expect(client).toBeDefined()
    })

    it('should use PKCE flow type', async () => {
      const { createSupabaseClient } = await import('../index')
      createSupabaseClient({ url: 'https://x.supabase.co', anonKey: 'key' })

      const callArgs = mockCreateClient.mock.calls[0]
      expect(callArgs[2].auth.flowType).toBe('pkce')
    })

    it('should use correct storage key', async () => {
      const { createSupabaseClient } = await import('../index')
      createSupabaseClient({ url: 'https://x.supabase.co', anonKey: 'key' })

      const callArgs = mockCreateClient.mock.calls[0]
      expect(callArgs[2].auth.storageKey).toBe('bliss-customer-auth')
    })
  })

  describe('createSupabaseAdminClient', () => {
    it('should create an admin client with service role key', async () => {
      const { createSupabaseAdminClient } = await import('../index')

      const client = createSupabaseAdminClient({ url: 'https://test.supabase.co', serviceRoleKey: 'service-role-key' })

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'service-role-key',
        expect.objectContaining({
          auth: expect.objectContaining({
            persistSession: false,
            autoRefreshToken: false,
          }),
        })
      )
      expect(client).toBeDefined()
    })

    it('should disable session persistence for admin client', async () => {
      const { createSupabaseAdminClient } = await import('../index')
      createSupabaseAdminClient({ url: 'https://x.supabase.co', serviceRoleKey: 'key' })

      const callArgs = mockCreateClient.mock.calls[0]
      expect(callArgs[2].auth.persistSession).toBe(false)
      expect(callArgs[2].auth.autoRefreshToken).toBe(false)
    })
  })

  describe('getBrowserClient', () => {
    it('should reuse existing client from window', async () => {
      const existingClient = { auth: {}, from: vi.fn() }
      windowMock.__supabaseClient = existingClient

      const { getBrowserClient } = await import('../index')
      const client = getBrowserClient()

      expect(client).toBe(existingClient)
      // createClient should NOT be called since we're reusing
      // Actually, createSupabaseClient is imported and may be called internally
      // but getBrowserClient should skip client creation
    })

    it('should throw when env variables are missing', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', '')
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

      const { getBrowserClient } = await import('../index')
      expect(() => getBrowserClient()).toThrow('Missing Supabase environment variables')
    })

    it('should create and cache client on window when env vars are present', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')

      const { getBrowserClient } = await import('../index')
      const client = getBrowserClient()

      expect(client).toBeDefined()
      expect(windowMock.__supabaseClient).toBeDefined()
    })

    it('should return the same client on subsequent calls', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key')

      const { getBrowserClient } = await import('../index')
      const client1 = getBrowserClient()
      const client2 = getBrowserClient()

      // After first call, window.__supabaseClient is set, so second call reuses it
      expect(client2).toBe(client1)
    })
  })

  describe('exports', () => {
    it('should export createSupabaseClient function', async () => {
      const mod = await import('../index')
      expect(typeof mod.createSupabaseClient).toBe('function')
    })

    it('should export createSupabaseAdminClient function', async () => {
      const mod = await import('../index')
      expect(typeof mod.createSupabaseAdminClient).toBe('function')
    })

    it('should export getBrowserClient function', async () => {
      const mod = await import('../index')
      expect(typeof mod.getBrowserClient).toBe('function')
    })
  })
})
