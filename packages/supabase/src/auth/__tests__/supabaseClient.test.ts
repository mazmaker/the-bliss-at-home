import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock @supabase/supabase-js
const { mockCreateClient } = vi.hoisted(() => {
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
  }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}))

// Mock window for singleton pattern
const windowMock: Record<string, any> = {}
Object.defineProperty(global, 'window', {
  value: new Proxy(windowMock, {
    get(target, prop) {
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

describe('supabaseClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    delete windowMock.__supabaseClient
  })

  describe('supabase singleton', () => {
    it('should create a supabase client with createClient', async () => {
      const mod = await import('../supabaseClient')
      expect(mod.supabase).toBeDefined()
      expect(mockCreateClient).toHaveBeenCalled()
    })

    it('should call createClient with URL and anon key', async () => {
      await import('../supabaseClient')
      expect(mockCreateClient).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          auth: expect.objectContaining({
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
            storageKey: 'bliss-customer-auth',
          }),
        })
      )
    })

    it('should export supabase as a valid object', async () => {
      const { supabase } = await import('../supabaseClient')
      expect(supabase).toBeDefined()
      expect(supabase.auth).toBeDefined()
      expect(supabase.from).toBeDefined()
    })

    it('should store client on window for HMR survival', async () => {
      await import('../supabaseClient')
      expect(windowMock.__supabaseClient).toBeDefined()
    })

    it('should reuse existing client from window', async () => {
      const existingClient = { auth: {}, from: vi.fn() }
      windowMock.__supabaseClient = existingClient

      const { supabase } = await import('../supabaseClient')
      // The client should be the existing one from window
      expect(supabase).toBe(existingClient)
    })
  })

  describe('createServiceClient', () => {
    it('should create a service client with a service role key', async () => {
      const { createServiceClient } = await import('../supabaseClient')
      const client = createServiceClient('test-service-role-key')

      expect(mockCreateClient).toHaveBeenCalledWith(
        expect.any(String),
        'test-service-role-key',
        expect.objectContaining({
          auth: expect.objectContaining({
            autoRefreshToken: false,
            persistSession: false,
          }),
        })
      )
      expect(client).toBeDefined()
    })

    it('should throw when no service role key provided and env var not set', async () => {
      const { createServiceClient } = await import('../supabaseClient')
      expect(() => createServiceClient()).toThrow('SUPABASE_SERVICE_ROLE_KEY is not set')
    })
  })
})
