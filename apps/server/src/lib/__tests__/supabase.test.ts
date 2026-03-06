import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCreateClient = vi.fn(() => ({
  from: vi.fn(),
  auth: { getUser: vi.fn() },
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}))

describe('server supabase lib', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should throw when SUPABASE_URL is missing', async () => {
    vi.stubEnv('SUPABASE_URL', '')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key')

    const { getSupabaseClient } = await import('../supabase')
    expect(() => getSupabaseClient()).toThrow('Missing Supabase credentials')

    vi.unstubAllEnvs()
  })

  it('should throw when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '')

    const { getSupabaseClient } = await import('../supabase')
    expect(() => getSupabaseClient()).toThrow('Missing Supabase credentials')

    vi.unstubAllEnvs()
  })

  it('should create and return a Supabase client when credentials are present', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

    const { getSupabaseClient } = await import('../supabase')
    const client = getSupabaseClient()

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-service-role-key'
    )
    expect(client).toBeDefined()
    expect(client.from).toBeDefined()

    vi.unstubAllEnvs()
  })

  it('should return the same instance on subsequent calls (lazy singleton)', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

    const { getSupabaseClient } = await import('../supabase')
    const client1 = getSupabaseClient()
    const client2 = getSupabaseClient()

    expect(client1).toBe(client2)
    expect(mockCreateClient).toHaveBeenCalledTimes(1)

    vi.unstubAllEnvs()
  })

  it('should export getSupabaseClient function', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key')

    const mod = await import('../supabase')
    expect(typeof mod.getSupabaseClient).toBe('function')

    vi.unstubAllEnvs()
  })
})
